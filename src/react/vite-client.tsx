/** @jsxImportSource react */
/** @jsxRuntime automatic */
import type { JSX } from 'react'

export const ViteClient = (): JSX.Element => {
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unnecessary-condition
  if (import.meta.env && import.meta.env.PROD) {
    return <></>
  }
  return <script type='module' src='/@vite/client'></script>
}
