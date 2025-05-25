/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { autoEntry } from './auto-entry.js'

// Mock modules
vi.mock('node:fs')
vi.mock('node:path')

/**
 * Tests for autoEntry plugin
 * These tests verify the auto-entry functionality including
 * Script/Link component detection and build configuration
 */
describe('autoEntry plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return a plugin with correct name', () => {
    const plugin = autoEntry()
    expect(plugin.name).toBe('ssr-auto-entry')
    expect(plugin.configResolved).toBeDefined()
  })

  it('should use default options when none provided', () => {
    const plugin = autoEntry()
    expect(plugin.name).toBe('ssr-auto-entry')
  })

  it('should accept custom options', () => {
    const options = {
      entryFile: 'custom/entry.tsx',
      componentNames: ['CustomScript', 'CustomLink'],
    }
    const plugin = autoEntry(options)
    expect(plugin.name).toBe('ssr-auto-entry')
  })

  it('should detect Script and Link components and configure build', async () => {
    const mockFileContent = `
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

    const { existsSync, readFileSync } = await import('node:fs')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { resolve } = await import('node:path')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(mockFileContent)
    vi.mocked(resolve).mockReturnValue('/mock/project/src/index.tsx')

    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      build: { ssr: false },
      environments: {},
    }

    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    // Verify that environments.client.build was created and configured
    expect(mockConfig.environments).toHaveProperty('client')
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client).toHaveProperty('build')
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build).toHaveProperty('outDir', 'dist/client')
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build).toHaveProperty('manifest', true)
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build).toHaveProperty('rollupOptions')
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions).toHaveProperty('input')
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      '/src/client.tsx',
      '/src/style.css',
    ])
  })

  it('should detect custom component names', async () => {
    const mockFileContent = `
      export default function App() {
        return (
          <html>
            <head>
              <CustomScript src="/src/app.js" />
              <CustomLink href="/src/main.css" rel="stylesheet" />
            </head>
          </html>
        )
      }
    `

    const { existsSync, readFileSync } = await import('node:fs')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { resolve } = await import('node:path')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(mockFileContent)
    vi.mocked(resolve).mockReturnValue('/mock/project/src/index.tsx')

    const plugin = autoEntry({
      componentNames: ['CustomScript', 'CustomLink'],
    })
    const mockConfig = {
      root: '/mock/project',
      build: { ssr: false },
      environments: {},
    }

    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      '/src/app.js',
      '/src/main.css',
    ])
  })

  it('should handle empty file gracefully', async () => {
    const { existsSync, readFileSync } = await import('node:fs')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { resolve } = await import('node:path')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('')
    vi.mocked(resolve).mockReturnValue('/mock/project/src/index.tsx')

    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      build: { ssr: false },
      environments: {},
    }

    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    // Should not create environments.client if no entries detected
    expect(Object.keys(mockConfig.environments)).toHaveLength(0)
  })

  it('should handle non-existent entry file gracefully', async () => {
    const { existsSync } = await import('node:fs')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { resolve } = await import('node:path')

    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(resolve).mockReturnValue('/mock/project/src/index.tsx')

    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      build: { ssr: false },
      environments: {},
    }

    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    // Should not create environments.client if file doesn't exist
    expect(Object.keys(mockConfig.environments)).toHaveLength(0)
  })

  it('should use SSR entry when available', async () => {
    const mockFileContent = `
      import { Script } from 'ssr-components'
      export default function App() {
        return <Script src="/src/client.tsx" />
      }
    `

    const { existsSync, readFileSync } = await import('node:fs')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { resolve } = await import('node:path')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(mockFileContent)
    vi.mocked(resolve).mockReturnValue('/mock/project/src/server.tsx')

    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      build: { ssr: 'src/server.tsx' },
      environments: {},
    }

    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    expect(resolve).toHaveBeenCalledWith('/mock/project', 'src/server.tsx')
  })

  it('should deduplicate entries', async () => {
    const mockFileContent = `
      import { Script } from 'ssr-components'
      export default function App() {
        return (
          <div>
            <Script src="/src/client.tsx" />
            <Script src="/src/client.tsx" />
          </div>
        )
      }
    `

    const { existsSync, readFileSync } = await import('node:fs')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { resolve } = await import('node:path')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(mockFileContent)
    vi.mocked(resolve).mockReturnValue('/mock/project/src/index.tsx')

    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      build: { ssr: false },
      environments: {},
    }

    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['/src/client.tsx'])
  })

  it('should handle attributes in different order', async () => {
    const mockFileContent = `
      import { Script, Link } from 'ssr-components'
      export default function App() {
        return (
          <html>
            <head>
              <Link foo="bar" href="/src/style.css" rel="stylesheet" />
              <Script type="module" src="/src/client.tsx" defer />
            </head>
          </html>
        )
      }
    `

    const { existsSync, readFileSync } = await import('node:fs')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { resolve } = await import('node:path')

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(mockFileContent)
    vi.mocked(resolve).mockReturnValue('/mock/project/src/index.tsx')

    const plugin = autoEntry()
    const mockConfig = {
      root: '/mock/project',
      build: { ssr: false },
      environments: {},
    }

    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      '/src/client.tsx',
      '/src/style.css',
    ])
  })
})
