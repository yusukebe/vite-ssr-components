/** @jsxImportSource solid-js */
import type { JSX } from 'solid-js'
import type { GetSrcOptions } from '../common/script.js'
import { getSrcFromManifest } from '../common/script.js'

export const Script = (
  props: GetSrcOptions & Omit<JSX.IntrinsicElements['script'], 'src'>
): JSX.Element => {
  const { src, manifest, prod, baseUrl, nonce, crossorigin, ...rest } = props
  const { src: scriptSrc, css: cssInScript } = getSrcFromManifest({ src, prod, manifest, baseUrl })
  return (
    <>
      <script type='module' src={scriptSrc} crossorigin={crossorigin} {...rest} />
      {cssInScript ? (
        cssInScript.map((css) => {
          return <link rel='stylesheet' crossorigin={crossorigin} nonce={nonce} href={css} />
        })
      ) : (
        <></>
      )}
    </>
  )
}
