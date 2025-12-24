import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

export default function injectManifest(): Plugin {
  let clientOutDir = 'dist/client'

  return {
    name: 'inject-manifest',
    config(config) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viteConfig = config as any
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      clientOutDir = viteConfig.environments?.client?.build?.outDir ?? 'dist/client'
    },
    transform(code, id, options) {
      // Only transform in SSR environment (non-client)
      if (!options?.ssr) {
        return
      }

      // Only transform files that contain the placeholder
      if (!code.includes('__VITE_MANIFEST_CONTENT__')) {
        return
      }

      // Read manifest from client build output
      const manifestPath = path.resolve(process.cwd(), clientOutDir, '.vite/manifest.json')
      let manifestContent: string | undefined
      try {
        manifestContent = fs.readFileSync(manifestPath, 'utf-8')
      } catch {
        // Manifest not found
      }

      if (!manifestContent) return

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
}
