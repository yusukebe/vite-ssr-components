import type { Plugin } from 'vite'
import { autoEntry } from './auto-entry.js'
import type { EntryOptions } from './auto-entry.js'
import clientFirstBuild from './client-first-build.js'
import hotReload from './hot-reload.js'

type HotReloadOptions =
  | boolean
  | {
      target?: string | string[]
      ignore?: string | string[]
    }

interface SSRPluginOptions {
  entry?: EntryOptions
  hotReload?: HotReloadOptions
}

export default function ssrPlugin(options: SSRPluginOptions = {}): Plugin[] {
  const { hotReload: hotReloadOption = true, entry: entryOption = {} } = options

  const plugins: Plugin[] = []

  plugins.push(clientFirstBuild())
  plugins.push(autoEntry(entryOption))

  if (hotReloadOption) {
    const hotReloadOptions: { target?: string | string[]; ignore?: string | string[] } = {}

    if (typeof hotReloadOption === 'object') {
      if (hotReloadOption.target) hotReloadOptions.target = hotReloadOption.target
      if (hotReloadOption.ignore) hotReloadOptions.ignore = hotReloadOption.ignore
    }

    plugins.push(hotReload(hotReloadOptions))
  }

  return plugins
}
