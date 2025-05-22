/** @jsxImportSource react */
/** @jsxRuntime automatic */
export const ViteClient = () => {
  if (import.meta.env.PROD) return <></>
  return <script type='module' src='/@vite/client'></script>
}
