import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import type { BuildState } from './build-state.js'
import { createBuildState } from './build-state.js'

const MANIFEST_FILE_NAME = '.vite/manifest.json'

/**
 * Inlines the client manifest into the server bundle.
 *
 * During an app build the manifest is taken from the client bundle in memory
 * and removed from the client output: its content is inlined into the server
 * bundle, so it never needs to be deployed as a static asset. When the client
 * and server are built separately, the manifest is read from disk as before.
 */
export default function injectManifest(state: BuildState = createBuildState()): Plugin[] {
  let clientOutDir = 'dist/client'

  const captureManifest: Plugin = {
    name: 'inject-manifest:capture',
    sharedDuringBuild: true,
    applyToEnvironment: (environment) => environment.name === 'client',
    generateBundle: {
      // Run after Vite's own manifest plugin has emitted the asset
      order: 'post',
      handler(_options, bundle) {
        if (!state.appBuild) {
          return
        }
        if (!(MANIFEST_FILE_NAME in bundle)) {
          return
        }
        const asset = bundle[MANIFEST_FILE_NAME]
        if (asset.type !== 'asset') {
          return
        }
        state.clientManifest =
          typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete bundle[MANIFEST_FILE_NAME]
      },
    },
  }

  const inline: Plugin = {
    name: 'inject-manifest',
    sharedDuringBuild: true,
    config(config) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viteConfig = config as any
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      clientOutDir = viteConfig.environments?.client?.build?.outDir ?? 'dist/client'
    },
    transform(code, _id, options) {
      // Only transform in SSR environment (non-client)
      if (!options?.ssr) {
        return
      }

      // Only transform files that contain the placeholder
      if (!code.includes('__VITE_MANIFEST_CONTENT__')) {
        return
      }

      let manifestContent = state.clientManifest
      if (manifestContent === undefined) {
        // Client built separately: read the manifest from its output
        const manifestPath = path.resolve(process.cwd(), clientOutDir, MANIFEST_FILE_NAME)
        try {
          manifestContent = fs.readFileSync(manifestPath, 'utf-8')
        } catch {
          // Manifest not found
        }
      }

      if (!manifestContent) {
        return
      }

      // Replace placeholder string with actual manifest data
      // Format: { "__manifest__": { default: <manifest> } } to match the Object.entries loop
      const newCode = code.replace(
        /"__VITE_MANIFEST_CONTENT__"/g,
        `{ "__manifest__": { default: ${manifestContent} } }`
      )

      if (newCode !== code) {
        return { code: newCode, map: null }
      }
    },
  }

  return [captureManifest, inline]
}
