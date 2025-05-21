/** @jsxImportSource react */
/** @jsxRuntime automatic */

import { getHrefFromManifest, GetHrefOptions } from '../common/link.js'
import type { JSX } from 'react'

export const Link = (props: GetHrefOptions<JSX.IntrinsicElements['link']>) => {
  const { manifest, prod, baseUrl, ...rest } = props
  const href = getHrefFromManifest({ href: props.href, prod, manifest, baseUrl })
  return <link {...rest} href={href} />
}
