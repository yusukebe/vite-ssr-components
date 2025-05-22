/** @jsxImportSource react */
/** @jsxRuntime automatic */
import type { JSX } from 'react'
import type { GetSrcOptions } from '../common/script.js'
import { getSrcFromManifest } from '../common/script.js'

export const Script = (props: GetSrcOptions & Omit<JSX.IntrinsicElements['script'], 'src'>) => {
  const { src, manifest, prod, baseUrl, ...rest } = props
  const scriptSrc = getSrcFromManifest({ src, prod, manifest, baseUrl })
  return <script {...rest} src={scriptSrc} />
}
