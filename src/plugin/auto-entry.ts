/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

interface ComponentConfig {
  name: string
  attribute: string
}

interface AutoEntryOptions {
  entryFile?: string
  components?: ComponentConfig[]
}

export function autoEntry(options: AutoEntryOptions = {}): Plugin {
  const {
    entryFile = 'src/index.tsx',
    components = [
      { name: 'Script', attribute: 'src' },
      { name: 'Link', attribute: 'href' },
    ],
  } = options

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
        const detectedEntries = extractEntriesFromAST(content, components)

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

function extractEntriesFromAST(code: string, components: ComponentConfig[]): string[] {
  const entries: string[] = []

  // Parse the code into an AST
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  })

  // Create a map for quick lookup
  const componentMap = new Map<string, string>()
  components.forEach((comp) => {
    componentMap.set(comp.name, comp.attribute)
  })

  // Traverse the AST to find JSX elements
  traverse(ast, {
    JSXElement(path) {
      const element = path.node
      const openingElement = element.openingElement

      // Check if this is one of our target components
      if (
        openingElement.name.type === 'JSXIdentifier' &&
        componentMap.has(openingElement.name.name)
      ) {
        const targetAttribute = componentMap.get(openingElement.name.name)!

        // Look for the specific attribute for this component
        for (const attr of openingElement.attributes) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === targetAttribute &&
            attr.value?.type === 'StringLiteral'
          ) {
            const value = attr.value.value
            if (value) {
              entries.push(value)
            }
          }
        }
      }
    },
  })

  return [...new Set(entries)]
}
