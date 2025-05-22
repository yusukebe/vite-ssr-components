/** @jsxImportSource hono/jsx */
/** @jsxRuntime automatic */
import type { JSX } from 'hono/jsx'
import type { StringLiteralUnion } from 'hono/utils/types'
import type { GetSrcOptions } from '../common/script.js'
import { getSrcFromManifest } from '../common/script.js'

export const Script = (props: GetSrcOptions & Omit<ScriptHTMLAttributes, 'src'>) => {
  const { src, manifest, prod, baseUrl, ...rest } = props
  const scriptSrc = getSrcFromManifest({ src, prod, manifest, baseUrl })
  return <script type='module' src={scriptSrc} {...rest} />
}

// Define an attributes type since ScriptHTMLAttributes is not exported
interface ScriptHTMLAttributes extends JSX.HTMLAttributes {
  async?: boolean | undefined
  crossorigin?: JSX.CrossOrigin
  defer?: boolean | undefined
  integrity?: string | undefined
  nomodule?: boolean | undefined
  referrerpolicy?: HTMLAttributeReferrerPolicy | undefined
  src?: string | undefined
  type?: StringLiteralUnion<'' | 'text/javascript' | 'importmap' | 'module'> | undefined
  crossOrigin?: JSX.CrossOrigin
  fetchPriority?: string | undefined
  noModule?: boolean | undefined
  referrer?: HTMLAttributeReferrerPolicy | undefined
  onError?: ((event: Event) => void) | undefined
  onLoad?: ((event: Event) => void) | undefined
  blocking?: 'render' | undefined
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
