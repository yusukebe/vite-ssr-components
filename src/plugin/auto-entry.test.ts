/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import { autoEntry } from './auto-entry.js'

// Mock fs module
vi.mock('node:fs', () => ({
  default: {
    promises: {
      readdir: vi.fn(),
    },
    readFileSync: vi.fn(),
  },
}))

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
      import { Script, Link } from 'ssr-components'
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
      '/src/client.tsx',
      '/src/style.css',
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
      import { CustomScript, CustomLink } from 'ssr-components'
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
      '/src/app.js',
      '/src/main.css',
    ])
  })

  it('should handle custom patterns correctly', async () => {
    const plugin = autoEntry({
      pattern: 'app/**/*.tsx',
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
      import { Script } from 'ssr-components'
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
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['/src/client.tsx'])
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
      import { Script } from 'ssr-components'
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
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['/src/client.tsx'])
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
      import { Script } from 'ssr-components'
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

    // Verify that parse error was handled gracefully
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to parse file for auto-entry detection:',
      expect.any(Error)
    )

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
      import { Script } from 'ssr-components'
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
      '/existing/entry.js',
      '/src/client.tsx',
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
      import { Script, Link } from 'ssr-components'
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
      '/src/reset.css',
      '/src/main.css',
      '/src/polyfills.js',
      '/src/app.js',
    ])
  })
})
