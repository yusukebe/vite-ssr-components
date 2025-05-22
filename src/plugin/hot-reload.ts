import picomatch from 'picomatch'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import path from 'node:path'

interface Options {
  /**
   * default ['src\/\*\*\/\*.ts', 'src\/\*\*\/\*.tsx']
   */
  entry?: string | string[]
  ignore?: string | string[]
}

export default function ssrHotReload(options: Options = {}): Plugin {
  const entryPatterns = Array.isArray(options.entry)
    ? options.entry
    : options.entry
      ? [options.entry]
      : ['src/**/*.ts', 'src/**/*.tsx']

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

      const matcher = picomatch(normalizedEntries, {
        ignore: normalizedIgnores,
        dot: true,
      })

      isMatch = (filePath: string) => {
        const rel = normalizePath(path.relative(root, filePath))
        return matcher(rel)
      }
    },

    handleHotUpdate({ server, file }) {
      if (!file) return

      if (isMatch(file)) {
        server.hot.send({ type: 'full-reload' })
        return []
      }
    },
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
