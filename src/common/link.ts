import type { Manifest } from 'vite'
import { loadManifest } from '../utils/manifest.js'
import { ensureTrailingSlash } from '../utils/path.js'

export interface GetHrefOptions {
  href: string
  manifest?: Manifest
  prod?: boolean
  baseUrl?: string
}

export const getHrefFromManifest = ({ href, manifest, prod, baseUrl = '/' }: GetHrefOptions) => {
  if (!href) return undefined
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unnecessary-condition
  if (prod ?? (import.meta.env && import.meta.env.PROD)) {
    manifest ??= loadManifest()

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
