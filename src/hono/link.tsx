/** @jsxImportSource hono/jsx */
/** @jsxRuntime automatic */

import type { JSX } from 'hono/jsx'
import { getHrefFromManifest, GetHrefOptions } from '../common/link.js'
import { StringLiteralUnion } from 'hono/utils/types'
import { BaseMime } from 'hono/utils/mime'

export const Link = (props: GetHrefOptions<LinkHTMLAttributes>) => {
  const { manifest, prod, baseUrl, ...rest } = props
  const href = getHrefFromManifest({ href: props.href, prod, manifest, baseUrl })
  return <link {...rest} href={href} />
}

type HTMLAttributeReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'

// Define an attributes type since LinkHTMLAttributes is not exported
interface LinkHTMLAttributes extends JSX.HTMLAttributes {
  as?: string | undefined
  crossorigin?: JSX.CrossOrigin
  href?: string | undefined
  hreflang?: string | undefined
  integrity?: string | undefined
  media?: string | undefined
  imagesrcset?: string | undefined
  imagesizes?: string | undefined
  referrerpolicy?: HTMLAttributeReferrerPolicy | undefined
  sizes?: string | undefined
  type?: StringLiteralUnion<BaseMime> | undefined
  charSet?: string | undefined
  rel?: string | undefined
  precedence?: string | undefined
  title?: string | undefined
  disabled?: boolean | undefined
  onError?: ((event: Event) => void) | undefined
  onLoad?: ((event: Event) => void) | undefined
  blocking?: 'render' | undefined
}
