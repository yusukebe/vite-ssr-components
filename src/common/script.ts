import type { Manifest } from 'vite'
import { loadManifest } from '../utils/manifest.js'
import { ensureTrailingSlash } from '../utils/path.js'

export interface GetSrcOptions {
  src: string
  prod?: boolean
  manifest?: Manifest
  baseUrl?: string
}

export const getSrcFromManifest = ({
  src,
  prod,
  manifest,
  baseUrl = '/',
}: GetSrcOptions): {
  src?: string
  css?: string[]
} => {
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unnecessary-condition
  if (prod ?? (import.meta.env && import.meta.env.PROD)) {
    manifest ??= loadManifest()
    if (manifest) {
      const css: string[] = []
      const scriptInManifest = manifest[src.replace(/^\//, '')]
      if (scriptInManifest.css) {
        scriptInManifest.css.forEach((cssPath) => {
          css.push(`${ensureTrailingSlash(baseUrl)}${cssPath}`)
        })
      }
      return {
        css,
        src: `${ensureTrailingSlash(baseUrl)}${scriptInManifest.file}`,
      }
    }
    return {}
  } else {
    return { src }
  }
}
