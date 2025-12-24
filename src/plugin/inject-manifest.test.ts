import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import injectManifest from './inject-manifest.js'

vi.mock('node:fs')
vi.mock('node:path')

describe('injectManifest', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(path.resolve).mockImplementation((...args: string[]) => args.join('/'))
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return plugin with correct name', () => {
    const plugin = injectManifest()
    expect(plugin.name).toBe('inject-manifest')
  })

  it('should have config and transform functions', () => {
    const plugin = injectManifest()
    expect(plugin.config).toBeDefined()
    expect(plugin.transform).toBeDefined()
  })

  it('should not transform non-SSR code', () => {
    const plugin = injectManifest()
    const code = 'const MANIFEST = "__VITE_MANIFEST_CONTENT__"'

    const result =
      typeof plugin.transform === 'function'
        ? plugin.transform.call({} as never, code, 'test.js', { ssr: false })
        : undefined

    expect(result).toBeUndefined()
  })

  it('should not transform code without placeholder', () => {
    const plugin = injectManifest()
    const code = 'const foo = "bar"'

    const result =
      typeof plugin.transform === 'function'
        ? plugin.transform.call({} as never, code, 'test.js', { ssr: true })
        : undefined

    expect(result).toBeUndefined()
  })

  it('should not transform if manifest file not found', () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('File not found')
    })

    const plugin = injectManifest()
    const code = 'const MANIFEST = "__VITE_MANIFEST_CONTENT__"'

    const result =
      typeof plugin.transform === 'function'
        ? plugin.transform.call({} as never, code, 'test.js', { ssr: true })
        : undefined

    expect(result).toBeUndefined()
  })

  it('should replace placeholder with manifest content', () => {
    const manifestContent = '{"src/style.css":{"file":"assets/style-abc123.css"}}'
    vi.mocked(fs.readFileSync).mockReturnValue(manifestContent)

    const plugin = injectManifest()
    const code = 'const MANIFEST = "__VITE_MANIFEST_CONTENT__"'

    const result =
      typeof plugin.transform === 'function'
        ? plugin.transform.call({} as never, code, 'test.js', { ssr: true })
        : undefined

    expect(result).toBeDefined()
    expect((result as { code: string }).code).toBe(
      `const MANIFEST = { "__manifest__": { default: ${manifestContent} } }`
    )
  })

  it('should use custom client outDir from config', () => {
    const manifestContent = '{"src/style.css":{"file":"assets/style-abc123.css"}}'
    vi.mocked(fs.readFileSync).mockReturnValue(manifestContent)

    const plugin = injectManifest()

    // Call config to set custom outDir
    if (typeof plugin.config === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      plugin.config(
        {
          environments: {
            client: {
              build: {
                outDir: 'custom/client/dir',
              },
            },
          },
        },
        { command: 'build', mode: 'production' }
      )
    }

    const code = 'const MANIFEST = "__VITE_MANIFEST_CONTENT__"'

    if (typeof plugin.transform === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      plugin.transform.call({} as never, code, 'test.js', { ssr: true })
    }

    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('custom/client/dir'),
      'utf-8'
    )
  })
})
