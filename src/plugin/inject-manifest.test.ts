import type { Plugin } from 'vite'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createBuildState } from './build-state.js'
import injectManifest from './inject-manifest.js'

const inlinePlugin = (state = createBuildState()): Plugin => {
  const plugin = injectManifest(state).find((p) => p.name === 'inject-manifest')
  if (!plugin) {
    throw new Error('inject-manifest plugin not found')
  }
  return plugin
}

const capturePlugin = (state = createBuildState()): Plugin => {
  const plugin = injectManifest(state).find((p) => p.name === 'inject-manifest:capture')
  if (!plugin) {
    throw new Error('inject-manifest:capture plugin not found')
  }
  return plugin
}

const runGenerateBundle = (plugin: Plugin, bundle: Record<string, unknown>) => {
  const hook = plugin.generateBundle as { handler: (...args: unknown[]) => void }
  hook.handler.call({} as never, {}, bundle, false)
}

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

  it('should return the capture and inline plugins', () => {
    expect(injectManifest().map((p) => p.name)).toEqual([
      'inject-manifest:capture',
      'inject-manifest',
    ])
  })

  it('should share both plugins across environments during build', () => {
    expect(injectManifest().every((p) => p.sharedDuringBuild === true)).toBe(true)
  })

  it('should have config and transform functions', () => {
    const plugin = inlinePlugin()
    expect(plugin.config).toBeDefined()
    expect(plugin.transform).toBeDefined()
  })

  it('should not transform non-SSR code', () => {
    const plugin = inlinePlugin()
    const code = 'const MANIFEST = "__VITE_MANIFEST_CONTENT__"'

    const result =
      typeof plugin.transform === 'function'
        ? plugin.transform.call({} as never, code, 'test.js', { ssr: false })
        : undefined

    expect(result).toBeUndefined()
  })

  it('should not transform code without placeholder', () => {
    const plugin = inlinePlugin()
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

    const plugin = inlinePlugin()
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

    const plugin = inlinePlugin()
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

    const plugin = inlinePlugin()

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

  it('should take the manifest from the client bundle during an app build', () => {
    const manifestContent = '{"src/style.css":{"file":"assets/style-abc123.css"}}'
    const state = createBuildState()
    state.appBuild = true
    const bundle: Record<string, unknown> = {
      '.vite/manifest.json': { type: 'asset', source: manifestContent },
      'assets/style-abc123.css': { type: 'asset', source: 'body{}' },
    }

    runGenerateBundle(capturePlugin(state), bundle)

    expect(state.clientManifest).toBe(manifestContent)
    expect(Object.keys(bundle)).toEqual(['assets/style-abc123.css'])
  })

  it('should keep the manifest in the client bundle outside an app build', () => {
    const state = createBuildState()
    const bundle: Record<string, unknown> = {
      '.vite/manifest.json': { type: 'asset', source: '{}' },
    }

    runGenerateBundle(capturePlugin(state), bundle)

    expect(state.clientManifest).toBeUndefined()
    expect(Object.keys(bundle)).toEqual(['.vite/manifest.json'])
  })

  it('should decode a binary manifest source', () => {
    const state = createBuildState()
    state.appBuild = true
    const bundle: Record<string, unknown> = {
      '.vite/manifest.json': { type: 'asset', source: new TextEncoder().encode('{"a":1}') },
    }

    runGenerateBundle(capturePlugin(state), bundle)

    expect(state.clientManifest).toBe('{"a":1}')
  })

  it('should inline the captured manifest without reading from disk', () => {
    const manifestContent = '{"src/style.css":{"file":"assets/style-abc123.css"}}'
    const state = createBuildState()
    state.clientManifest = manifestContent
    const plugin = inlinePlugin(state)
    const code = 'const MANIFEST = "__VITE_MANIFEST_CONTENT__"'

    const result =
      typeof plugin.transform === 'function'
        ? plugin.transform.call({} as never, code, 'test.js', { ssr: true })
        : undefined

    expect(fs.readFileSync).not.toHaveBeenCalled()
    expect((result as { code: string }).code).toBe(
      `const MANIFEST = { "__manifest__": { default: ${manifestContent} } }`
    )
  })

  it('should only capture in the client environment', () => {
    const plugin = capturePlugin()
    const applyToEnvironment = plugin.applyToEnvironment as (env: { name: string }) => boolean
    expect(applyToEnvironment({ name: 'client' })).toBe(true)
    expect(applyToEnvironment({ name: 'ssr' })).toBe(false)
  })
})
