import type { Plugin } from 'vite'
import { autoEntry } from './auto-entry.js'
import type { EntryOptions } from './auto-entry.js'
import { createBuildState } from './build-state.js'
import clientFirstBuild from './client-first-build.js'
import hotReload, { hotReloadClient } from './hot-reload.js'
import injectManifest from './inject-manifest.js'

type HotReloadOptions =
  | boolean
  | {
      target?: string | string[]
      ignore?: string | string[]
      /** Apply server-side changes to the open page instead of reloading it. Defaults to true. */
      morph?: boolean
    }

interface SSRPluginOptions {
  entry?: EntryOptions
  hotReload?: HotReloadOptions
}

export default function ssrPlugin(options: SSRPluginOptions = {}): Plugin[] {
  const { hotReload: hotReloadOption = true, entry: entryOption = {} } = options

  const plugins: Plugin[] = []

  const state = createBuildState()
  plugins.push(clientFirstBuild(state))
  plugins.push(autoEntry(entryOption))
  plugins.push(...injectManifest(state))

  const morph = typeof hotReloadOption === 'object' ? (hotReloadOption.morph ?? true) : true
  plugins.push(hotReloadClient({ enabled: hotReloadOption !== false && morph }))

  if (hotReloadOption) {
    const hotReloadOptions: {
      target?: string | string[]
      ignore?: string | string[]
      morph?: boolean
    } = { morph }

    if (typeof hotReloadOption === 'object') {
      if (hotReloadOption.target) {
        hotReloadOptions.target = hotReloadOption.target
      }
      if (hotReloadOption.ignore) {
        hotReloadOptions.ignore = hotReloadOption.ignore
      }
    }

    plugins.push(hotReload(hotReloadOptions))
  }

  return plugins
}
