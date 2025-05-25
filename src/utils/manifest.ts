import type { Manifest } from 'vite'

// Use Vite's import.meta.glob to dynamically search for manifest.json
export const loadManifest = (): Manifest | undefined => {
  // Use import.meta.glob to search for manifest.json with multiple patterns
  // Search through dist directory hierarchy up to 3 levels deep
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
