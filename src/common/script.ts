import type { Manifest } from 'vite'
import { ensureTrailingSlash } from '../utils/path.js'

export interface GetSrcOptions {
  src: string
  prod?: boolean
  manifest?: Manifest
  baseUrl?: string
}

export const getSrcFromManifest = ({ src, prod, manifest, baseUrl = '/' }: GetSrcOptions) => {
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
      const scriptInManifest = manifest[src.replace(/^\//, '')]
      return `${ensureTrailingSlash(baseUrl)}${scriptInManifest.file}`
    }
    return undefined
  } else {
    return src
  }
}
