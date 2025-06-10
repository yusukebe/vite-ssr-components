import type { Manifest } from 'vite'
import { loadManifest } from '../utils/manifest.js'
import { ensureTrailingSlash } from '../utils/path.js'

export interface GetSrcOptions {
  src: string
  prod?: boolean
  manifest?: Manifest
  baseUrl?: string
}

export const getSrcFromManifest = ({ src, prod, manifest, baseUrl = '/' }: GetSrcOptions) => {
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unnecessary-condition
  if (prod ?? (import.meta.env && import.meta.env.PROD)) {
    manifest ??= loadManifest()

    if (manifest) {
      const scriptInManifest = manifest[src.replace(/^\//, '')]
      return `${ensureTrailingSlash(baseUrl)}${scriptInManifest.file}`
    }
    return undefined
  } else {
    return src
  }
}
