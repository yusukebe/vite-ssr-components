/** @jsxImportSource react */
/** @jsxRuntime automatic */

export const ReactRefresh = () => {
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unnecessary-condition
  if (import.meta.env && import.meta.env.PROD) return <></>
  const refreshScript = `
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  `
  return (
    <>
      <script type='module' src='/@react-refresh'></script>
      <script type='module' dangerouslySetInnerHTML={{ __html: refreshScript }} />
    </>
  )
}
