import type { Manifest } from 'vite'
import { ensureTrailingSlash } from '../utils/path.js'

export interface GetHrefOptions {
  href: string
  manifest?: Manifest
  prod?: boolean
  baseUrl?: string
}

export const getHrefFromManifest = ({ href, manifest, prod, baseUrl = '/' }: GetHrefOptions) => {
  if (!href) return undefined
  if (prod ?? import.meta.env.PROD) {
    if (!manifest) {
      const MANIFEST = import.meta.glob<{ default: Manifest }>('/dist/.vite/manifest.json', {
        eager: true,
      })
      for (const [, manifestFile] of Object.entries(MANIFEST)) {
        manifest = manifestFile.default
        break
      }
    }

    if (manifest) {
      const assetInManifest = manifest[href.replace(/^\//, '')]
      return href.startsWith('/')
        ? `${ensureTrailingSlash(baseUrl)}${assetInManifest.file}`
        : assetInManifest.file
    }
    return undefined
  } else {
    return href
  }
}
