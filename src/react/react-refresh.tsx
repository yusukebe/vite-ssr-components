/** @jsxImportSource react */
/** @jsxRuntime automatic */

export const ReactRefresh = () => {
  if (import.meta.env.PROD) return <></>
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
