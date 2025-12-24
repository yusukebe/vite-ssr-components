import type { Manifest } from 'vite'

// Use Vite's import.meta.glob to dynamically search for manifest.json
export const loadManifest = (): Manifest | undefined => {
  // Check if manifest content is provided via plugin
  const manifestContent = import.meta.env.VITE_MANIFEST_CONTENT as string | undefined
  if (manifestContent) {
    try {
      return JSON.parse(manifestContent) as Manifest
    } catch {
      // Fall through to auto-detection if parsing fails
    }
  }

  // Placeholder replaced by inject-manifest plugin during SSR build
  const MANIFEST = '__VITE_MANIFEST_CONTENT__' as unknown as Record<
    string,
    { default: Manifest }
  >

  let manifestData = {}
  for (const [, manifestFile] of Object.entries(MANIFEST)) {
    manifestData = { ...manifestData, ...manifestFile.default }
  }
  // Return merged values
  return manifestData
}
