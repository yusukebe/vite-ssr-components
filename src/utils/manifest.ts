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

  // Auto-detect: Search through dist directory hierarchy up to 3 levels deep
  const MANIFEST = import.meta.glob<{ default: Manifest }>(
    [
      '/dist/.vite/manifest.json',
      '/dist/*/.vite/manifest.json',
      '/dist/*/*/.vite/manifest.json',
      '/dist/*/*/*/.vite/manifest.json',
    ],
    {
      eager: true,
    }
  )

  // Return the first manifest.json found
  for (const [, manifestFile] of Object.entries(MANIFEST)) {
    return manifestFile.default
  }

  return undefined
}
