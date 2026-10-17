/** @jsxImportSource solid-js */
import type { JSX } from 'solid-js'
import type { GetHrefOptions } from '../common/link.js'
import { getHrefFromManifest } from '../common/link.js'

export const Link = (
  props: GetHrefOptions & Omit<JSX.IntrinsicElements['link'], 'href'>
): JSX.Element => {
  const { manifest, prod, baseUrl, ...rest } = props
  const href = getHrefFromManifest({ href: props.href, prod, manifest, baseUrl })
  return <link {...rest} href={href} />
}
