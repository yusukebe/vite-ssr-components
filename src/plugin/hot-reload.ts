import picomatch from 'picomatch'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import path from 'node:path'

interface Options {
  /**
   * default ['\*\*\/\*.ts', '\*\*\/\*.tsx']
   */
  entry?: string | string[]
  ignore?: string | string[]
}

const FIXED_EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', 'coverage']

export default function ssrHotReload(options: Options = {}): Plugin {
  const entryPatterns = Array.isArray(options.entry)
    ? options.entry
    : options.entry
      ? [options.entry]
      : ['**/*.ts', '**/*.tsx']

  const ignorePatterns = Array.isArray(options.ignore)
    ? options.ignore
    : options.ignore
      ? [options.ignore]
      : []

  let root = process.cwd()
  let isMatch: (file: string) => boolean

  return {
    name: 'vite-plugin-ssr-hot-reload',
    apply: 'serve',

    configResolved(config) {
      root = config.root || process.cwd()

      const normalizedEntries = entryPatterns.map((p) => normalizeGlobPattern(p, root))
      const normalizedIgnores = ignorePatterns.map((p) => normalizeGlobPattern(p, root))

      const dynamicExcluded = collectDynamicExcludedDirs(config, root)
      const excludedGlobs = [...FIXED_EXCLUDED_DIRS, ...dynamicExcluded].flatMap((d) => [
        d,
        `${d}/**`,
      ])

      const matcher = picomatch(normalizedEntries, {
        ignore: [...normalizedIgnores, ...excludedGlobs],
        dot: true,
      })

      isMatch = (filePath: string) => {
        const rel = normalizePath(path.relative(root, filePath))
        return matcher(rel)
      }
    },

    handleHotUpdate({ server, file }) {
      if (!file) {
        return
      }

      if (isMatch(file)) {
        server.hot.send({ type: 'full-reload' })
        return []
      }
    },
  }

  function collectDynamicExcludedDirs(config: unknown, root: string): string[] {
    const result: string[] = []
    const cfg = (config ?? {}) as {
      build?: { outDir?: unknown }
      environments?: Record<string, { build?: { outDir?: unknown } } | undefined>
    }

    const collect = (outDir: unknown): void => {
      if (typeof outDir !== 'string' || outDir.length === 0) {
        return
      }
      const abs = path.isAbsolute(outDir) ? outDir : path.resolve(root, outDir)
      const rel = normalizePath(path.relative(root, abs))
      if (rel.length === 0 || rel.startsWith('..') || path.isAbsolute(rel)) {
        return
      }
      result.push(rel)
    }

    collect(cfg.build?.outDir)
    const environments = cfg.environments
    if (environments && typeof environments === 'object') {
      for (const envName of Object.keys(environments)) {
        collect(environments[envName]?.build?.outDir)
      }
    }

    return result
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
}
