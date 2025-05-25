/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

interface AutoEntryOptions {
  entryFile?: string
  componentNames?: string[]
}

export function autoEntry(options: AutoEntryOptions = {}): Plugin {
  const { entryFile = 'src/index.tsx', componentNames = ['Script', 'Link'] } = options

  return {
    name: 'ssr-auto-entry',
    configResolved(config) {
      // Auto-detect SSR entry point if entryFile is not specified
      let targetFile = entryFile
      if (entryFile === 'src/index.tsx') {
        // For default case, prioritize SSR setting if available
        const ssrEntry = config.build.ssr
        if (typeof ssrEntry === 'string') {
          targetFile = ssrEntry
        }
      }

      const entryPath = path.resolve(config.root, targetFile)

      if (fs.existsSync(entryPath)) {
        const content = fs.readFileSync(entryPath, 'utf-8')
        const detectedEntries = extractEntriesFromCode(content, componentNames)

        if (detectedEntries.length > 0) {
          const configAny = config

          if (!configAny.environments) {
            // @ts-expect-error - configAny.environments may be blank
            configAny.environments = {}
          }
          if (!configAny.environments.client) {
            // @ts-expect-error - configAny.environments.client may be blank
            configAny.environments.client = {}
          }
          if (!configAny.environments.client.build) {
            // @ts-expect-error - configAny.environments.client.build may be blank
            configAny.environments.client.build = {}
          }

          const clientBuild = configAny.environments.client.build

          // Automatically set outDir
          if (!clientBuild.outDir) {
            clientBuild.outDir = 'dist/client'
          }

          // Automatically enable manifest
          clientBuild.manifest = true

          // Set rollupOptions.input
          if (!clientBuild.rollupOptions) {
            clientBuild.rollupOptions = {}
          }

          const clientInput = clientBuild.rollupOptions.input

          if (Array.isArray(clientInput)) {
            clientBuild.rollupOptions.input = [...clientInput, ...detectedEntries]
          } else if (typeof clientInput === 'string') {
            clientBuild.rollupOptions.input = [clientInput, ...detectedEntries]
          } else {
            clientBuild.rollupOptions.input = detectedEntries
          }
        }
      }
    },
  }
}

function extractEntriesFromCode(code: string, componentNames: string[]): string[] {
  const entries: string[] = []

  componentNames.forEach((componentName) => {
    const srcPattern = new RegExp(
      `<${componentName}[^>]*\\s(?:src|href)=['"]([^'"]+)['"][^>]*/?>`,
      'g'
    )

    let match
    while ((match = srcPattern.exec(code)) !== null) {
      const srcValue = match[1]
      if (srcValue) {
        // Use path as-is without conversion
        entries.push(srcValue)
      }
    }
  })

  return [...new Set(entries)]
}
