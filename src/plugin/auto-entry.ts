/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import picomatch from 'picomatch'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const traverse = (_traverse.default as typeof _traverse) ?? _traverse

interface Component {
  name: string
  attribute: string
}

export interface EntryOptions {
  target?: string | string[]
  components?: Component[]
}

const FIXED_EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', 'coverage']

export function autoEntry(options: EntryOptions = {}): Plugin {
  const {
    target = '**/*.{tsx,ts}',
    components = [
      { name: 'Script', attribute: 'src' },
      { name: 'Link', attribute: 'href' },
    ],
  } = options

  return {
    name: 'ssr-auto-entry',
    config(config) {
      config.define = config.define || {}
    },
    async configResolved(config) {
      // Normalize patterns
      const patterns = Array.isArray(target) ? target : [target]
      const normalizedPatterns = patterns.map((p) => normalizeGlobPattern(p, config.root))

      // Create matcher
      const matcher = picomatch(normalizedPatterns, { dot: true })

      const excludedDirs = collectExcludedDirs(config)

      // Resolve the on-disk location of the `vite-ssr-components` package once
      // so per-file detection can verify imports resolve back into it. Returns
      // null when the package can't be located or when the project root *is*
      // the package itself (so we don't over-match relative imports during
      // self-development).
      const pkgDir = resolveSsrPackageDir(config.root)

      // Scan files and detect entries
      const detectedEntries = new Set<string>()
      await scanFiles(config.root, matcher, components, detectedEntries, excludedDirs, pkgDir)

      // Apply detected entries to config if any found
      if (detectedEntries.size > 0) {
        // Strip a leading slash so rolldown (Vite 8) does not treat the path as
        // an absolute filesystem path. `<Script src="/src/client.tsx" />` is a
        // browser-facing URL; the rollup input must be a project-relative path.
        const normalize = (v: unknown): unknown =>
          typeof v === 'string' ? v.replace(/^\/+/, '') : v

        const entriesArray = Array.from(detectedEntries)
          .map((v) => normalize(v))
          .filter((v): v is string => typeof v === 'string' && v.length > 0)

        if (entriesArray.length === 0) {
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const viteConfig = config as any

        if (!viteConfig.environments) {
          viteConfig.environments = {}
        }
        if (!viteConfig.environments.client) {
          viteConfig.environments.client = {}
        }
        if (!viteConfig.environments.client.build) {
          viteConfig.environments.client.build = {}
        }

        const clientBuild = viteConfig.environments.client.build

        // Automatically set outDir
        clientBuild.outDir ??= 'dist/client'

        // Automatically enable manifest
        clientBuild.manifest = true
        if (!viteConfig.environments.ssr) {
          const manifestPath = path.join(clientBuild.outDir as string, '.vite/manifest.json')
          try {
            const resolvedPath = path.resolve(process.cwd(), manifestPath)
            const manifestContent = fs.readFileSync(resolvedPath, 'utf-8')
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            config.define['import.meta.env.VITE_MANIFEST_CONTENT'] = JSON.stringify(manifestContent)
          } catch {}
        }

        // Set rollupOptions.input
        if (!clientBuild.rollupOptions) {
          clientBuild.rollupOptions = {}
        }

        const clientInput = clientBuild.rollupOptions.input
        const dedup = <T>(arr: T[]): T[] => Array.from(new Set(arr))

        if (Array.isArray(clientInput)) {
          // Normalize and drop entries that collapse to "" (e.g. the default "/")
          // so they do not poison the rollup input list.
          const existing = clientInput
            .map((v: unknown) => normalize(v))
            .filter((v): v is string => typeof v === 'string' && v.length > 0)
          clientBuild.rollupOptions.input = dedup([...existing, ...entriesArray])
        } else if (typeof clientInput === 'string') {
          const existing = normalize(clientInput) as string
          clientBuild.rollupOptions.input =
            existing.length > 0 ? dedup([existing, ...entriesArray]) : entriesArray
        } else {
          // TODO: clientInput may be a `Record<string, string>` (named input map);
          // overwriting drops user-provided named entries. Merge if a real use
          // case for object-form inputs surfaces.
          clientBuild.rollupOptions.input = entriesArray
        }
      }
    },
  }
}

async function scanFiles(
  root: string,
  matcher: (file: string) => boolean,
  components: Component[],
  detectedEntries: Set<string>,
  excludedDirs: Set<string>,
  pkgDir: string | null
): Promise<void> {
  async function scan(currentDir: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        if (entry.isDirectory()) {
          if (entry.name.startsWith('.')) {
            continue
          }
          const relDir = normalizePath(path.relative(root, fullPath))
          if (excludedDirs.has(relDir)) {
            continue
          }
          await scan(fullPath)
        } else if (entry.isFile()) {
          const relativePath = normalizePath(path.relative(root, fullPath))

          // Check if this file matches our pattern
          if (matcher(relativePath)) {
            try {
              const code = fs.readFileSync(fullPath, 'utf-8')
              // Only files that mention `vite-ssr-components` somewhere can
              // possibly contribute entries, so skip the AST parse otherwise.
              // (Workspace aliases that never spell the canonical name are
              // intentionally not supported — see README.)
              if (!code.includes('vite-ssr-components')) {
                continue
              }
              const isSsrSource = pkgDir ? makeStrictIsSsrSource(fullPath, pkgDir) : undefined
              const entries = extractEntriesFromAST(code, components, isSsrSource)
              entries.forEach((entry) => detectedEntries.add(entry))
            } catch (error) {
              // Ignore files that can't be read or parsed
              console.warn(`Failed to process file ${relativePath}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${currentDir}:`, error)
    }
  }

  await scan(root)
}

/**
 * Locate the on-disk `vite-ssr-components` package directory from the project
 * root. Returns null when:
 * - the package is not installed (auto-entry then falls back to a simple
 *   `startsWith('vite-ssr-components')` check on import sources)
 * - the resolved directory equals `root` itself, i.e. we're inside the
 *   package's own repo. Otherwise strict mode would treat every relative
 *   import inside the package as an SSR import.
 */
function resolveSsrPackageDir(root: string): string | null {
  try {
    const r = createRequire(path.join(root, 'noop.js'))
    const pkgDir = path.dirname(r.resolve('vite-ssr-components/package.json'))
    if (normalizePath(pkgDir) === normalizePath(root)) {
      return null
    }
    return pkgDir
  } catch {
    return null
  }
}

/**
 * Build an import-source predicate that accepts a source iff it ultimately
 * resolves to (or sits inside) the `vite-ssr-components` package directory.
 *
 *  1. Canonical name (`vite-ssr-components` or `vite-ssr-components/...`).
 *  2. Relative path that resolves to a file inside `pkgDir` — covers monorepos
 *     where source files reach into the package via `../../`.
 *  3. Bare specifier under a different name (e.g. `@my/ssr`) whose package
 *     directory is the same as `pkgDir` — covers workspace links / aliases.
 *
 * tsconfig `paths` and Vite `resolve.alias` are not handled because resolving
 * them requires Vite's resolver pipeline, which isn't accessible from
 * `configResolved`.
 */
export function makeStrictIsSsrSource(
  importerFile: string,
  pkgDir: string
): (source: string) => boolean {
  return (source) => {
    if (source === 'vite-ssr-components' || source.startsWith('vite-ssr-components/')) {
      return true
    }
    if (source.startsWith('./') || source.startsWith('../')) {
      const resolved = path.resolve(path.dirname(importerFile), source)
      return resolved === pkgDir || resolved.startsWith(pkgDir + path.sep)
    }
    // Bare specifier with a different name — try to resolve its package.json
    // and compare to pkgDir (catches workspace-linked aliases).
    if (!source.startsWith('/') && !source.startsWith('.')) {
      try {
        const r = createRequire(importerFile)
        const pkgName = source.startsWith('@')
          ? source.split('/').slice(0, 2).join('/')
          : source.split('/')[0]
        const otherPkgJson = r.resolve(`${pkgName}/package.json`)
        return path.dirname(otherPkgJson) === pkgDir
      } catch {
        return false
      }
    }
    return false
  }
}

function collectExcludedDirs(config: { root: string }): Set<string> {
  const excluded = new Set<string>(FIXED_EXCLUDED_DIRS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = config as any
  const root = config.root

  const collect = (outDir: unknown): void => {
    if (typeof outDir !== 'string' || outDir.length === 0) {
      return
    }
    const abs = path.isAbsolute(outDir) ? outDir : path.resolve(root, outDir)
    const rel = normalizePath(path.relative(root, abs))
    if (rel.length === 0 || rel.startsWith('..') || path.isAbsolute(rel)) {
      return
    }
    excluded.add(rel)
  }

  collect(cfg.build?.outDir)
  const environments = cfg.environments as
    | Record<string, { build?: { outDir?: unknown } }>
    | undefined
  if (environments && typeof environments === 'object') {
    for (const envName of Object.keys(environments)) {
      collect(environments[envName]?.build?.outDir)
    }
  }

  return excluded
}

function normalizeGlobPattern(pattern: string, root: string): string {
  const normalized = normalizePath(pattern)

  if (path.isAbsolute(normalized)) {
    const relative = path.relative(root, normalized)
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      return normalizePath(relative)
    }
    return normalized.slice(1)
  }

  if (normalized.startsWith('/')) {
    return normalized.slice(1)
  }

  if (normalized.startsWith('./')) {
    return normalized.slice(2)
  }

  return normalized
}

export function extractEntriesFromAST(
  code: string,
  components: Component[],
  isSsrSource: (source: string) => boolean = (s) => s.startsWith('vite-ssr-components')
): string[] {
  const entries: string[] = []

  try {
    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    // First pass: collect named imports whose source is recognised as
    // belonging to vite-ssr-components, so we can distinguish our
    // `<Script>` / `<Link>` from same-named components in unrelated packages
    // (e.g. `@inertiajs/react`'s `<Link>`).
    // Map: local identifier name -> original imported name.
    const ssrLocalNames = new Map<string, string>()
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value
        if (typeof source !== 'string' || !isSsrSource(source)) {
          return
        }
        for (const spec of path.node.specifiers) {
          if (spec.type !== 'ImportSpecifier') {
            continue
          }
          if (spec.imported.type !== 'Identifier') {
            continue
          }
          ssrLocalNames.set(spec.local.name, spec.imported.name)
        }
      },
    })

    // No relevant imports -> nothing to do.
    if (ssrLocalNames.size === 0) {
      return entries
    }

    // Map of imported (original) name -> attribute to read.
    const componentMap = new Map<string, string>()
    components.forEach((comp) => {
      componentMap.set(comp.name, comp.attribute)
    })

    // Second pass: walk JSX and only consider elements whose tag resolves to
    // an identifier we imported from vite-ssr-components.
    traverse(ast, {
      JSXElement(path) {
        const openingElement = path.node.openingElement
        if (openingElement.name.type !== 'JSXIdentifier') {
          return
        }

        const importedName = ssrLocalNames.get(openingElement.name.name)
        if (importedName === undefined) {
          return
        }

        const targetAttribute = componentMap.get(importedName)
        if (targetAttribute === undefined) {
          return
        }

        for (const attr of openingElement.attributes) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === targetAttribute &&
            attr.value?.type === 'StringLiteral'
          ) {
            const value = attr.value.value
            if (value) {
              entries.push(value)
            }
          }
        }
      },
    })
  } catch {
    // Ignore parse errors for files that might not be valid JSX/TSX
  }

  return entries
}
