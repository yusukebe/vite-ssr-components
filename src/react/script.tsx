/** @jsxImportSource react */
/** @jsxRuntime automatic */
import type { JSX } from 'react'
import type { GetSrcOptions } from '../common/script.js'
import { getSrcFromManifest } from '../common/script.js'

export const Script = (props: GetSrcOptions & Omit<JSX.IntrinsicElements['script'], 'src'>) => {
  const { src, manifest, prod, baseUrl, nonce, crossOrigin, ...rest } = props
  const { src: scriptSrc, css: cssInScript } = getSrcFromManifest({ src, prod, manifest, baseUrl })
  return (
    <>
      <script type='module' src={scriptSrc} crossOrigin={crossOrigin} {...rest} />
      {cssInScript ? (
        cssInScript.map((css) => {
          return <link rel='stylesheet' crossOrigin={crossOrigin} nonce={nonce} href={css} />
        })
      ) : (
        <></>
      )}
    </>
  )
}
