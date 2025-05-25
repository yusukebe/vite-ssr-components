import type { Plugin } from 'vite'
import { autoEntry } from './auto-entry.js'
import hotReload from './hot-reload.js'

interface ComponentConfig {
  name: string
  attribute: string
}

interface SSRPluginOptions {
  buildAssets?: {
    entryFile?: string
    components?: ComponentConfig[]
  }
  hotReload?:
    | boolean
    | {
        entry?: string | string[]
        ignore?: string | string[]
      }
}

export default function ssrPlugin(options: SSRPluginOptions = {}): Plugin[] {
  const { hotReload: hotReloadOption = true, buildAssets: buildAssetsOption = {} } = options

  const plugins: Plugin[] = []

  plugins.push(autoEntry(buildAssetsOption))

  if (hotReloadOption) {
    const hotReloadOptions: { entry?: string | string[]; ignore?: string | string[] } = {}

    if (typeof hotReloadOption === 'object') {
      if (hotReloadOption.entry) hotReloadOptions.entry = hotReloadOption.entry
      if (hotReloadOption.ignore) hotReloadOptions.ignore = hotReloadOption.ignore
    }

    plugins.push(hotReload(hotReloadOptions))
  }

  return plugins
}
