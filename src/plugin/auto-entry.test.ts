/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { parse as babelParse } from '@babel/parser'
import type * as BabelParser from '@babel/parser'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { autoEntry, extractEntriesFromAST, makeStrictIsSsrSource } from './auto-entry.js'

const DEFAULT_COMPONENTS = [
  { name: 'Script', attribute: 'src' },
  { name: 'Link', attribute: 'href' },
]

// Mock fs module
vi.mock('node:fs', () => ({
  default: {
    promises: {
      readdir: vi.fn(),
    },
    readFileSync: vi.fn(),
  },
}))

// Wrap @babel/parser.parse so tests can spy on parse invocations while the
// real implementation continues to drive entry detection.
vi.mock('@babel/parser', async () => {
  const actual = await vi.importActual<typeof BabelParser>('@babel/parser')
  return {
    ...actual,
    parse: vi.fn(actual.parse),
  }
})

/**
 * Tests for autoEntry plugin
 * These tests verify the file-scanning based auto-entry functionality including
 * Script/Link component detection and build configuration
 */
describe('autoEntry plugin', () => {
  const mockReaddir = vi.mocked(fs.promises.readdir)
  const mockReadFileSync = vi.mocked(fs.readFileSync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a plugin with correct name and hooks', () => {
    const plugin = autoEntry()
    expect(plugin.name).toBe('ssr-auto-entry')
    expect(plugin.configResolved).toBeDefined()
  })

  it('should detect Script and Link components and configure client build', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system structure
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'package.json', isDirectory: () => false, isFile: () => true },
      ] as any)
      .mockResolvedValueOnce([
        { name: 'index.tsx', isDirectory: () => false, isFile: () => true },
        { name: 'client.tsx', isDirectory: () => false, isFile: () => true },
        { name: 'style.css', isDirectory: () => false, isFile: () => true },
      ] as any)

    // Mock file contents with Script and Link components
    const indexTsxContent = `
      import { Script, Link } from 'vite-ssr-components/react'
      export default function App() {
        return (
          <html>
            <head>
              <Script src="/src/client.tsx" />
              <Link href="/src/style.css" rel="stylesheet" />
            </head>
          </html>
        )
      }
    `

    mockReadFileSync.mockReturnValue(indexTsxContent)

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that client environment was configured
    expect(mockConfig.environments).toHaveProperty('client')
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.outDir).toBe('dist/client')
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.manifest).toBe(true)
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      'src/client.tsx',
      'src/style.css',
    ])
  })

  it('should not configure client build when no entries detected', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system with no matching files
    mockReaddir.mockResolvedValueOnce([
      { name: 'README.md', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that client environment was not configured
    expect(mockConfig.environments).toEqual({})
  })

  it('should handle custom components correctly', async () => {
    const plugin = autoEntry({
      components: [
        { name: 'CustomScript', attribute: 'source' },
        { name: 'CustomLink', attribute: 'url' },
      ],
    })
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system structure
    mockReaddir.mockResolvedValueOnce([
      { name: 'src', isDirectory: () => true, isFile: () => false },
    ] as any)
    mockReaddir.mockResolvedValueOnce([
      { name: 'app.tsx', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Mock file contents with custom components
    const appTsxContent = `
      import { CustomScript, CustomLink } from 'vite-ssr-components/react'
      export default function App() {
        return (
          <html>
            <head>
              <CustomScript source="/src/app.js" />
              <CustomLink url="/src/main.css" />
            </head>
          </html>
        )
      }
    `

    mockReadFileSync.mockReturnValue(appTsxContent)

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that custom entries were detected and configured
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      'src/app.js',
      'src/main.css',
    ])
  })

  it('should handle custom patterns correctly', async () => {
    const plugin = autoEntry({
      target: 'app/**/*.tsx',
    })
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system structure
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'app', isDirectory: () => true, isFile: () => false },
      ] as any)
      .mockResolvedValueOnce([
        { name: 'index.tsx', isDirectory: () => false, isFile: () => true },
      ] as any)
      .mockResolvedValueOnce([
        { name: 'main.tsx', isDirectory: () => false, isFile: () => true },
      ] as any)

    // Mock file contents
    const mainTsxContent = `
      import { Script } from 'vite-ssr-components/react'
      export default function App() {
        return <Script src="/src/client.tsx" />
      }
    `

    mockReadFileSync.mockReturnValue(mainTsxContent)

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that only app/**/*.tsx files were processed and entries detected
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['src/client.tsx'])
  })

  it('should deduplicate entries from multiple files', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system structure
    mockReaddir.mockResolvedValueOnce([
      { name: 'src', isDirectory: () => true, isFile: () => false },
    ] as any)
    mockReaddir.mockResolvedValueOnce([
      { name: 'page1.tsx', isDirectory: () => false, isFile: () => true },
      { name: 'page2.tsx', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Mock file contents with same Script src
    const pageContent = `
      import { Script } from 'vite-ssr-components/react'
      export default function Page() {
        return <Script src="/src/client.tsx" />
      }
    `

    mockReadFileSync.mockReturnValue(pageContent)

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that duplicate entries were removed
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['src/client.tsx'])
  })

  it('should handle parse errors gracefully', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system structure
    mockReaddir.mockResolvedValueOnce([
      { name: 'src', isDirectory: () => true, isFile: () => false },
    ] as any)
    mockReaddir.mockResolvedValueOnce([
      { name: 'invalid.tsx', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Mock file contents with invalid syntax
    const invalidContent = `
      import { Script } from 'vite-ssr-components/react'
      export default function App() {
        return <Script src="/src/client.tsx" />
      // Missing closing brace
    `

    mockReadFileSync.mockReturnValue(invalidContent)

    // Mock console.warn to capture warnings
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that no entries were configured due to parse error
    expect(mockConfig.environments).toEqual({})

    consoleSpy.mockRestore()
  })

  it('should handle file read errors gracefully', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system structure
    mockReaddir.mockResolvedValueOnce([
      { name: 'src', isDirectory: () => true, isFile: () => false },
    ] as any)
    mockReaddir.mockResolvedValueOnce([
      { name: 'test.tsx', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Mock file read error
    mockReadFileSync.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    // Mock console.warn to capture warnings
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that file read error was handled gracefully
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to process file src/test.tsx:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should handle directory scan errors gracefully', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock directory read error
    mockReaddir.mockRejectedValue(new Error('Directory not found'))

    // Mock console.warn to capture warnings
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that directory scan error was handled gracefully
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to scan directory /mock/project:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should merge with existing rollup input configuration', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {
        client: {
          build: {
            rollupOptions: {
              input: '/existing/entry.js',
            },
          },
        },
      },
    }

    // Mock file system structure
    mockReaddir.mockResolvedValueOnce([
      { name: 'src', isDirectory: () => true, isFile: () => false },
    ] as any)
    mockReaddir.mockResolvedValueOnce([
      { name: 'app.tsx', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Mock file contents
    const appContent = `
      import { Script } from 'vite-ssr-components/react'
      export default function App() {
        return <Script src="/src/client.tsx" />
      }
    `

    mockReadFileSync.mockReturnValue(appContent)

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that existing input was merged with detected entries
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      'existing/entry.js',
      'src/client.tsx',
    ])
  })

  it('should handle files with no Script/Link components', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system structure
    mockReaddir.mockResolvedValueOnce([
      { name: 'src', isDirectory: () => true, isFile: () => false },
    ] as any)
    mockReaddir.mockResolvedValueOnce([
      { name: 'component.tsx', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Mock file contents without Script/Link components
    const componentContent = `
      export default function Component() {
        return <div>Hello World</div>
      }
    `

    mockReadFileSync.mockReturnValue(componentContent)

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that no client environment was configured
    expect(mockConfig.environments).toEqual({})
  })

  it('should handle multiple Script and Link components in same file', async () => {
    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      environments: {},
    }

    // Mock file system structure
    mockReaddir.mockResolvedValueOnce([
      { name: 'src', isDirectory: () => true, isFile: () => false },
    ] as any)
    mockReaddir.mockResolvedValueOnce([
      { name: 'layout.tsx', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Mock file contents with multiple Script and Link components
    const layoutContent = `
      import { Script, Link } from 'vite-ssr-components/react'
      export default function Layout() {
        return (
          <html>
            <head>
              <Link href="/src/reset.css" rel="stylesheet" />
              <Link href="/src/main.css" rel="stylesheet" />
              <Script src="/src/polyfills.js" />
              <Script src="/src/app.js" />
            </head>
          </html>
        )
      }
    `

    mockReadFileSync.mockReturnValue(layoutContent)

    // Execute configResolved hook
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      await plugin.configResolved(mockConfig)
    }

    // Verify that all entries were detected
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      'src/reset.css',
      'src/main.css',
      'src/polyfills.js',
      'src/app.js',
    ])
  })

  /**
   * Regression: Vite 8 / rolldown rejects leading-slash inputs as absolute FS
   * paths. The plugin must normalize detected entries to project-relative
   * paths and gracefully merge with whatever the upstream config has set
   * (including the default `["/"]` placed by `@cloudflare/vite-plugin`).
   */
  describe('rolldown-compatible input normalization', () => {
    const setupEntryDetection = (src: string) => {
      mockReaddir.mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
      ] as any)
      mockReaddir.mockResolvedValueOnce([
        { name: 'app.tsx', isDirectory: () => false, isFile: () => true },
      ] as any)
      mockReadFileSync.mockReturnValue(`
        import { Script } from 'vite-ssr-components/react'
        export default function App() {
          return <Script src="${src}" />
        }
      `)
    }

    it('strips a leading slash from detected entries', async () => {
      setupEntryDetection('/foo.tsx')
      const plugin = autoEntry()
      const mockConfig: any = { root: '/mock/project', environments: {} }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['foo.tsx'])
    })

    it('drops the default ["/"] placeholder when merging with detected entries', async () => {
      setupEntryDetection('/foo.tsx')
      const plugin = autoEntry()
      const mockConfig: any = {
        root: '/mock/project',
        environments: {
          client: {
            build: {
              rollupOptions: { input: ['/'] },
            },
          },
        },
      }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['foo.tsx'])
    })

    it('preserves user-provided array inputs alongside detected entries', async () => {
      setupEntryDetection('/foo.tsx')
      const plugin = autoEntry()
      const mockConfig: any = {
        root: '/mock/project',
        environments: {
          client: {
            build: {
              rollupOptions: { input: ['src/main.ts'] },
            },
          },
        },
      }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
        'src/main.ts',
        'foo.tsx',
      ])
    })

    it('leaves existing input untouched when no entries are detected', async () => {
      mockReaddir.mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true, isFile: () => false },
      ] as any)
      mockReaddir.mockResolvedValueOnce([
        { name: 'plain.tsx', isDirectory: () => false, isFile: () => true },
      ] as any)
      // No Script/Link components -> no detected entries
      mockReadFileSync.mockReturnValue(`
        export default function Plain() {
          return <div>nothing to detect</div>
        }
      `)

      const plugin = autoEntry()
      const originalInput = ['/']
      const mockConfig: any = {
        root: '/mock/project',
        environments: {
          client: {
            build: {
              rollupOptions: { input: originalInput },
            },
          },
        },
      }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockConfig.environments.client.build.rollupOptions.input).toBe(originalInput)
      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['/'])
    })

    it('still works for existing users who pass paths without a leading slash', async () => {
      setupEntryDetection('src/client.tsx')
      const plugin = autoEntry()
      const mockConfig: any = { root: '/mock/project', environments: {} }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['src/client.tsx'])
    })
  })

  /**
   * Default scan range was widened from `src/**\/*.{tsx,ts}` to
   * `**\/*.{tsx,ts}` so users who keep SSR code under `app/`, `lib/`, `pages/`
   * etc. can call `ssrPlugin()` with no arguments. The added scan cost is
   * mitigated by (a) excluding common build/output directories from traversal
   * and (b) skipping the AST parse for files that don't even substring-match
   * any configured component name.
   */
  describe('default scan range and exclusions', () => {
    const scriptOnlyContent = `
      import { Script } from 'vite-ssr-components/react'
      export default function Page() {
        return <Script src="/app/client.tsx" />
      }
    `

    it('detects entries under app/ when only the default target is used', async () => {
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'app', isDirectory: () => true, isFile: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'index.tsx', isDirectory: () => false, isFile: () => true },
        ] as any)
      mockReadFileSync.mockReturnValue(scriptOnlyContent)

      const plugin = autoEntry()
      const mockConfig: any = { root: '/mock/project', environments: {} }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['app/client.tsx'])
    })

    it('detects entries under arbitrary top-level directories like lib/ and pages/', async () => {
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'lib', isDirectory: () => true, isFile: () => false },
          { name: 'pages', isDirectory: () => true, isFile: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'shared.tsx', isDirectory: () => false, isFile: () => true },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'home.tsx', isDirectory: () => false, isFile: () => true },
        ] as any)

      mockReadFileSync.mockImplementation((filePath: any) => {
        if (String(filePath).includes('lib/shared.tsx')) {
          return `
            import { Link } from 'vite-ssr-components/react'
            export const Head = () => <Link href="/lib/style.css" rel="stylesheet" />
          `
        }
        return `
          import { Script } from 'vite-ssr-components/react'
          export default function Home() {
            return <Script src="/pages/home-client.tsx" />
          }
        `
      })

      const plugin = autoEntry()
      const mockConfig: any = { root: '/mock/project', environments: {} }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
        'lib/style.css',
        'pages/home-client.tsx',
      ])
    })

    it('does not recurse into the fixed-excluded `dist/` directory', async () => {
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'app', isDirectory: () => true, isFile: () => false },
          { name: 'dist', isDirectory: () => true, isFile: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'index.tsx', isDirectory: () => false, isFile: () => true },
        ] as any)

      mockReadFileSync.mockReturnValue(scriptOnlyContent)

      const plugin = autoEntry()
      const mockConfig: any = { root: '/mock/project', environments: {} }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      // readdir should be called only twice (root + app/), never for dist/.
      expect(mockReaddir).toHaveBeenCalledTimes(2)
      expect(mockReaddir.mock.calls.some((call) => String(call[0]).includes('dist'))).toBe(false)
      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['app/client.tsx'])
    })

    it('honors a custom build.outDir for dynamic dir exclusion', async () => {
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'app', isDirectory: () => true, isFile: () => false },
          { name: 'custom-dist', isDirectory: () => true, isFile: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'index.tsx', isDirectory: () => false, isFile: () => true },
        ] as any)

      mockReadFileSync.mockReturnValue(scriptOnlyContent)

      const plugin = autoEntry()
      const mockConfig: any = {
        root: '/mock/project',
        environments: {},
        build: { outDir: 'custom-dist' },
      }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockReaddir.mock.calls.some((call) => String(call[0]).includes('custom-dist'))).toBe(
        false
      )
      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['app/client.tsx'])
    })

    it('skips the AST parse for files that contain no configured component names', async () => {
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'app', isDirectory: () => true, isFile: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'plain-a.tsx', isDirectory: () => false, isFile: () => true },
          { name: 'plain-b.tsx', isDirectory: () => false, isFile: () => true },
          { name: 'plain-c.tsx', isDirectory: () => false, isFile: () => true },
          { name: 'page.tsx', isDirectory: () => false, isFile: () => true },
        ] as any)

      mockReadFileSync.mockImplementation((filePath: any) => {
        if (String(filePath).endsWith('page.tsx')) {
          return `
            import { Script } from 'vite-ssr-components/react'
            export default function Page() {
              return <Script src="/app/client.tsx" />
            }
          `
        }
        // No "Script" / "Link" substrings anywhere in these files.
        return `
          export default function Plain() {
            return <div>nothing here</div>
          }
        `
      })

      const parseSpy = vi.mocked(babelParse)
      parseSpy.mockClear()

      const plugin = autoEntry()
      const mockConfig: any = { root: '/mock/project', environments: {} }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      // Only page.tsx should reach the AST parser; the three plain files are
      // filtered out by the substring prefilter.
      expect(parseSpy).toHaveBeenCalledTimes(1)
      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['app/client.tsx'])
    })

    it('uses the user-provided target verbatim and ignores the default', async () => {
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'app', isDirectory: () => true, isFile: () => false },
          { name: 'src', isDirectory: () => true, isFile: () => false },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'page.tsx', isDirectory: () => false, isFile: () => true },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'main.tsx', isDirectory: () => false, isFile: () => true },
        ] as any)

      mockReadFileSync.mockImplementation((filePath: any) => {
        if (String(filePath).includes('app/page.tsx')) {
          return `
            import { Script } from 'vite-ssr-components/react'
            export default function Page() {
              return <Script src="/app/should-not-be-detected.tsx" />
            }
          `
        }
        return `
          import { Script } from 'vite-ssr-components/react'
          export default function Main() {
            return <Script src="/src/main-client.tsx" />
          }
        `
      })

      const plugin = autoEntry({ target: 'src/**/*.{tsx,ts}' })
      const mockConfig: any = { root: '/mock/project', environments: {} }

      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        await plugin.configResolved(mockConfig)
      }

      expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
        'src/main-client.tsx',
      ])
    })
  })
})

describe('autoEntry plugin - manifest loading', () => {
  const mockReadFileSync = vi.mocked(fs.readFileSync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set manifest content in config.define', async () => {
    const mockConfig: any = {
      root: '/mock/project',
      define: {},
      environments: {},
    }

    // Mock file system structure to trigger entry detection
    const mockReaddir = vi.mocked(fs.promises.readdir)
    mockReaddir.mockResolvedValueOnce([
      { name: 'src', isDirectory: () => true, isFile: () => false },
    ] as any)
    mockReaddir.mockResolvedValueOnce([
      { name: 'app.tsx', isDirectory: () => false, isFile: () => true },
    ] as any)

    // Mock file contents with Script component to trigger client build
    const appContent = `
      import { Script } from 'vite-ssr-components/react'
      export default function App() {
        return <Script src="/src/client.tsx" />
      }
    `
    mockReadFileSync
      .mockReturnValueOnce(appContent) // For app.tsx
      .mockReturnValueOnce(JSON.stringify({ 'main.js': { file: 'main.js' } })) // For manifest.json

    const plugin = autoEntry({})

    if (plugin.configResolved) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await plugin.configResolved(mockConfig)
    }

    expect(mockConfig.define['import.meta.env.VITE_MANIFEST_CONTENT']).toBeDefined()
  })
})

/**
 * Detection must be import-aware so that same-named components from unrelated
 * packages (e.g. `@inertiajs/react`'s `<Link>` for client-side navigation, or
 * `next/script`) are not mistakenly treated as SSR build entries. Only JSX
 * elements whose tag resolves back to a named import from `vite-ssr-components`
 * (or one of its subpath exports) should be picked up.
 */
describe('extractEntriesFromAST - import-aware detection', () => {
  it('detects entries when components are imported from vite-ssr-components/react', () => {
    const code = `
      import { Script, Link } from 'vite-ssr-components/react'
      export default function App() {
        return (
          <>
            <Script src="/src/client.tsx" />
            <Link href="/src/style.css" />
          </>
        )
      }
    `
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS)).toEqual([
      '/src/client.tsx',
      '/src/style.css',
    ])
  })

  it('detects entries from any vite-ssr-components subpath (e.g. /hono)', () => {
    const code = `
      import { Script } from 'vite-ssr-components/hono'
      export default () => <Script src="/src/hono-client.tsx" />
    `
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS)).toEqual(['/src/hono-client.tsx'])
  })

  it('resolves aliased named imports back to the original component name', () => {
    const code = `
      import { Link as L, Script as S } from 'vite-ssr-components/react'
      export default () => (
        <>
          <L href="/src/style.css" />
          <S src="/src/client.tsx" />
        </>
      )
    `
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS)).toEqual([
      '/src/style.css',
      '/src/client.tsx',
    ])
  })

  it('ignores <Link> imported from a foreign package like @inertiajs/react', () => {
    const code = `
      import { Link } from '@inertiajs/react'
      export default () => <Link href="/users">Users</Link>
    `
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS)).toEqual([])
  })

  it('ignores <Script> imported as a default import from a foreign package like next/script', () => {
    const code = `
      import Script from 'next/script'
      export default () => <Script src="https://example.com/x.js" />
    `
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS)).toEqual([])
  })

  it('only picks up the vite-ssr-components import when both packages are imported with aliases', () => {
    const code = `
      import { Link as SsrLink } from 'vite-ssr-components/react'
      import { Link as NavLink } from '@inertiajs/react'
      export default () => (
        <>
          <NavLink href="/users">Users</NavLink>
          <SsrLink href="/src/style.css" />
        </>
      )
    `
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS)).toEqual(['/src/style.css'])
  })

  it('returns no entries when no vite-ssr-components import is present', () => {
    const code = `
      import { Link } from '@inertiajs/react'
      import Script from 'next/script'
      export default () => (
        <>
          <Script src="https://example.com/x.js" />
          <Link href="/users">Users</Link>
        </>
      )
    `
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS)).toEqual([])
  })

  it('honors a custom isSsrSource predicate (matches a workspace alias)', () => {
    const code = `
      import { Script } from '@my/ssr'
      export default () => <Script src="/src/client.tsx" />
    `
    const isSsrSource = (s: string) => s === '@my/ssr'
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS, isSsrSource)).toEqual([
      '/src/client.tsx',
    ])
  })

  it('rejects the canonical name when a custom predicate excludes it', () => {
    const code = `
      import { Script } from 'vite-ssr-components/react'
      export default () => <Script src="/src/client.tsx" />
    `
    const isSsrSource = () => false
    expect(extractEntriesFromAST(code, DEFAULT_COMPONENTS, isSsrSource)).toEqual([])
  })
})

/**
 * Strict-mode predicate. When the package can be resolved from the project
 * root, scanFiles passes a predicate that recognises:
 *  - canonical name imports
 *  - relative imports that resolve into the package directory
 *  - bare specifiers under another name that resolve to the same package
 *    (workspace alias / link)
 *
 * The bare-specifier branch is exercised through the integration path; here we
 * cover the deterministic, fs-free rules.
 */
describe('makeStrictIsSsrSource', () => {
  const pkgDir = path.resolve('/abs/repo/node_modules/vite-ssr-components')
  const importerFile = path.resolve('/abs/repo/src/page.tsx')
  const isSsr = makeStrictIsSsrSource(importerFile, pkgDir)

  it('accepts the canonical bare name', () => {
    expect(isSsr('vite-ssr-components')).toBe(true)
  })

  it('accepts canonical subpath imports', () => {
    expect(isSsr('vite-ssr-components/react')).toBe(true)
    expect(isSsr('vite-ssr-components/hono')).toBe(true)
  })

  it('rejects names that merely start with vite-ssr-components- but are different packages', () => {
    expect(isSsr('vite-ssr-components-extra')).toBe(false)
  })

  it('accepts relative imports that resolve into pkgDir', () => {
    const deepImporter = path.join(pkgDir, 'src', 'plugin', 'auto-entry.ts')
    const innerIsSsr = makeStrictIsSsrSource(deepImporter, pkgDir)
    expect(innerIsSsr('./other.ts')).toBe(true)
    expect(innerIsSsr('../react/index.ts')).toBe(true)
  })

  it('rejects relative imports that escape pkgDir', () => {
    expect(isSsr('./components/foo.ts')).toBe(false)
    expect(isSsr('../../elsewhere/util.ts')).toBe(false)
  })

  it('rejects unrelated bare specifiers that fail to resolve', () => {
    expect(isSsr('@inertiajs/react')).toBe(false)
    expect(isSsr('next/script')).toBe(false)
  })
})
