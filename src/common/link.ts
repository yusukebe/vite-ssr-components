import type { Manifest } from 'vite'
import { ensureTrailingSlash } from '../utils/path.js'

export type GetHrefOptions<T> = {
  href?: string
  manifest?: Manifest
  prod?: boolean
  baseUrl?: string
} & T

export const getHrefFromManifest = <T>({
  href,
  manifest,
  prod,
  baseUrl = '/',
}: GetHrefOptions<T>) => {
  if (!href) return undefined
  if (prod ?? import.meta.env.PROD) {
    if (!manifest) {
      const MANIFEST = import.meta.glob<{ default: Manifest }>('/dist/.vite/manifest.json', {
        eager: true,
      })
      for (const [, manifestFile] of Object.entries(MANIFEST)) {
        if (manifestFile['default']) {
          manifest = manifestFile['default']
          break
        }
      }
    }

    if (manifest) {
      const assetInManifest = manifest[href.replace(/^\//, '')]
      if (assetInManifest) {
        return href.startsWith('/')
          ? `${ensureTrailingSlash(baseUrl)}${assetInManifest.file}`
          : assetInManifest.file
      }
    }
    return undefined
  } else {
    return href
  }
}
