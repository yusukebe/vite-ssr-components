/** @jsxImportSource react */
/** @jsxRuntime automatic */
import type { JSX } from 'react'
import type { GetHrefOptions } from '../common/link.js'
import { getHrefFromManifest } from '../common/link.js'

export const Link = (props: GetHrefOptions & Omit<JSX.IntrinsicElements['link'], 'href'>) => {
  const { manifest, prod, baseUrl, ...rest } = props
  const href = getHrefFromManifest({ href: props.href, prod, manifest, baseUrl })
  return <link {...rest} href={href} />
}
