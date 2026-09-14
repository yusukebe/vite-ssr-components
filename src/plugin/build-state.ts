/**
 * State shared by the plugins of one `ssrPlugin()` call across the client and
 * server builds of `vite build`. The plugins that read or write it opt into
 * `sharedDuringBuild`, so every environment sees the same instance.
 */
export interface BuildState {
  /** Set while `buildApp` runs the client build followed by the server builds in this process. */
  appBuild: boolean
  /** The client manifest taken from the client bundle, inlined into the server bundle. */
  clientManifest?: string
}

export const createBuildState = (): BuildState => ({ appBuild: false })
