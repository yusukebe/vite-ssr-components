/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { autoEntry } from './auto-entry.js'

// Mock modules
vi.mock('node:fs')
vi.mock('node:path')

/**
 * Tests for autoEntry plugin
 * These tests verify the AST-based auto-entry functionality including
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

  it('should detect Script and Link components using AST', async () => {
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
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      '/src/client.tsx',
      '/src/style.css',
    ])
  })

  it('should handle custom component configurations', async () => {
    const mockFileContent = `
      import { CustomScript, CustomLink, Foo } from 'ssr-components'
      export default function App() {
        return (
          <html>
            <head>
              <CustomScript source="/src/app.js" />
              <CustomLink url="/src/main.css" rel="stylesheet" />
              <Foo hoge="/src/data.json" />
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
      components: [
        { name: 'CustomScript', attribute: 'source' },
        { name: 'CustomLink', attribute: 'url' },
        { name: 'Foo', attribute: 'hoge' },
      ],
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
      '/src/data.json',
    ])
  })

  it('should handle JSX expressions gracefully', async () => {
    const mockFileContent = `
      import { Script, Link } from 'ssr-components'
      const clientPath = '/src/client.tsx'
      export default function App() {
        return (
          <html>
            <head>
              <Script src={clientPath} />
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

    // Should only detect the static string value
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual(['/src/style.css'])
  })

  it('should only detect specified attributes for each component', async () => {
    const mockFileContent = `
      import { Script, Link } from 'ssr-components'
      export default function App() {
        return (
          <html>
            <head>
              <Script href="/src/wrong.css" src="/src/client.tsx" />
              <Link src="/src/wrong.js" href="/src/style.css" rel="stylesheet" />
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

    // Should only detect src for Script and href for Link
    // @ts-expect-error - Dynamic properties created by plugin
    expect(mockConfig.environments.client.build.rollupOptions.input).toEqual([
      '/src/client.tsx',
      '/src/style.css',
    ])
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
      '/src/style.css',
      '/src/client.tsx',
    ])
  })
})
