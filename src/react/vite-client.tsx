/** @jsxImportSource react */
/** @jsxRuntime automatic */
import type { JSX } from 'react'

// The virtual module served by the plugin; Vite exposes `\0`-prefixed ids under /@id/__x00__
const HOT_RELOAD_CLIENT_URL = '/@id/__x00__virtual:vite-ssr-components/hot-reload'

export const ViteClient = (): JSX.Element => {
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unnecessary-condition
  if (import.meta.env && import.meta.env.PROD) {
    return <></>
  }
  return (
    <>
      <script type='module' src='/@vite/client'></script>
      <script type='module' src={HOT_RELOAD_CLIENT_URL}></script>
    </>
  )
}
