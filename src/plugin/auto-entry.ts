/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import picomatch from 'picomatch'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import fs from 'node:fs'
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

export function autoEntry(options: EntryOptions = {}): Plugin {
  const {
    target = 'src/**/*.{tsx,ts}',
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

      // Scan files and detect entries
      const detectedEntries = new Set<string>()
      await scanFiles(config.root, matcher, components, detectedEntries)

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
  detectedEntries: Set<string>
): Promise<void> {
  async function scan(currentDir: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        if (entry.isDirectory()) {
          // Skip node_modules and other common directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scan(fullPath)
          }
        } else if (entry.isFile()) {
          const relativePath = normalizePath(path.relative(root, fullPath))

          // Check if this file matches our pattern
          if (matcher(relativePath)) {
            try {
              const code = fs.readFileSync(fullPath, 'utf-8')
              const entries = extractEntriesFromAST(code, components)
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

function extractEntriesFromAST(code: string, components: Component[]): string[] {
  const entries: string[] = []

  try {
    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    // Create a map for quick lookup
    const componentMap = new Map<string, string>()
    components.forEach((comp) => {
      componentMap.set(comp.name, comp.attribute)
    })

    // Traverse the AST to find JSX elements
    traverse(ast, {
      JSXElement(path) {
        const element = path.node
        const openingElement = element.openingElement

        // Check if this is one of our target components
        if (
          openingElement.name.type === 'JSXIdentifier' &&
          componentMap.has(openingElement.name.name)
        ) {
          const targetAttribute = componentMap.get(openingElement.name.name)!

          // Look for the specific attribute for this component
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
        }
      },
    })
  } catch {
    // Ignore parse errors for files that might not be valid JSX/TSX
  }

  return entries
}
