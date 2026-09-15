import type { Plugin } from 'vite'
import { describe, it, expect, vi } from 'vitest'
import hotReload, { HOT_RELOAD_CLIENT_ID, hotReloadClient } from './hot-reload.js'

/**
 * Tests for the hot reload plugins.
 * `hotUpdate` runs once per environment; only the client environment notifies the browser.
 */
const setup = (
  options: Parameters<typeof hotReload>[0] = {},
  config: object = { root: '/mock/project' }
) => {
  const plugin = hotReload(options)
  // @ts-expect-error - Testing plugin behavior with mock config
  plugin.configResolved?.(config)
  return plugin
}

const update = (
  plugin: Plugin,
  {
    file,
    modules = [],
    environment = 'client',
  }: { file: string; modules?: unknown[]; environment?: string }
) => {
  const send = vi.fn()
  const hook = plugin.hotUpdate as (this: unknown, options: unknown) => unknown
  const result = hook.call({ environment: { name: environment, hot: { send } } }, { file, modules })
  return { send, result }
}

const updateEvent = (file: string) => ({
  type: 'custom',
  event: 'vite-ssr-components:update',
  data: { file },
})

describe('hotReload plugin', () => {
  it('should return a plugin with correct name', () => {
    const plugin = hotReload()
    expect(plugin.name).toBe('vite-plugin-ssr-hot-reload')
    expect(plugin.apply).toBe('serve')
    expect(plugin.configResolved).toBeDefined()
    expect(plugin.hotUpdate).toBeDefined()
  })

  it('should accept entry and ignore patterns as strings or arrays', () => {
    expect(hotReload({ entry: 'src/**/*.tsx', ignore: '**/*.test.ts' }).name).toBe(
      'vite-plugin-ssr-hot-reload'
    )
    expect(hotReload({ entry: ['custom/**/*.ts'], ignore: ['**/*.spec.ts'] }).name).toBe(
      'vite-plugin-ssr-hot-reload'
    )
  })

  it('should configure patterns on configResolved', () => {
    expect(() => setup()).not.toThrow()
  })

  it('should tell the browser to apply a changed server file', () => {
    const plugin = setup()
    const { send, result } = update(plugin, { file: '/mock/project/src/index.tsx' })

    expect(send).toHaveBeenCalledWith(updateEvent('/mock/project/src/index.tsx'))
    expect(result).toEqual([])
  })

  it('should leave files in the client module graph to Vite', () => {
    const plugin = setup()
    const { send, result } = update(plugin, {
      file: '/mock/project/src/client.tsx',
      modules: [{ id: '/mock/project/src/client.tsx' }],
    })

    expect(send).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('should not interfere with server environments', () => {
    const plugin = setup()
    const { send, result } = update(plugin, {
      file: '/mock/project/src/index.tsx',
      environment: 'ssr',
    })

    expect(send).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('should not notify for non-matching files', () => {
    const plugin = setup()
    const { send, result } = update(plugin, { file: '/mock/project/public/image.png' })

    expect(send).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('should fully reload when morph is disabled', () => {
    const plugin = setup({ morph: false })
    const serverFile = update(plugin, { file: '/mock/project/src/index.tsx' })
    const clientFile = update(plugin, {
      file: '/mock/project/src/client.tsx',
      modules: [{ id: '/mock/project/src/client.tsx' }],
    })

    expect(serverFile.send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(serverFile.result).toEqual([])
    expect(clientFile.send).toHaveBeenCalledWith({ type: 'full-reload' })
  })

  it('should handle custom entry patterns correctly', () => {
    const plugin = setup({ entry: ['custom/**/*.ts'] })

    expect(update(plugin, { file: '/mock/project/custom/module.ts' }).send).toHaveBeenCalledWith(
      updateEvent('/mock/project/custom/module.ts')
    )
    expect(update(plugin, { file: '/mock/project/src/index.tsx' }).send).not.toHaveBeenCalled()
  })

  /**
   * The default entry was widened from `src/**` to `**` so users with non-src
   * project layouts work without configuration. To prevent the wider matcher
   * from firing on build output, common output dirs are added to the picomatch
   * `ignore` list in addition to any user-supplied ignores.
   */
  describe('default entry widening with build-output ignores', () => {
    it('matches files under app/ with the new default entry', () => {
      const plugin = setup()
      expect(update(plugin, { file: '/mock/project/app/page.tsx' }).send).toHaveBeenCalledWith(
        updateEvent('/mock/project/app/page.tsx')
      )
    })

    it('ignores files under fixed-excluded dirs (dist, node_modules, etc.)', () => {
      const plugin = setup()
      const ignored = [
        '/mock/project/dist/index.tsx',
        '/mock/project/build/main.ts',
        '/mock/project/out/page.tsx',
        '/mock/project/coverage/lcov-report.tsx',
        '/mock/project/node_modules/pkg/index.ts',
      ]
      for (const file of ignored) {
        expect(update(plugin, { file }).send).not.toHaveBeenCalled()
      }
    })

    it('ignores files under a custom build.outDir', () => {
      const plugin = setup({}, { root: '/mock/project', build: { outDir: 'custom-dist' } })
      expect(
        update(plugin, { file: '/mock/project/custom-dist/foo.tsx' }).send
      ).not.toHaveBeenCalled()
    })
  })
})

describe('hotReloadClient plugin', () => {
  const resolve = (plugin: Plugin, id: string) =>
    (plugin.resolveId as (this: unknown, id: string) => unknown).call({}, id)
  const load = (plugin: Plugin, id: string) =>
    (plugin.load as (this: unknown, id: string) => unknown).call({}, id)

  it('should resolve and load the browser module', () => {
    const plugin = hotReloadClient({ enabled: true })
    const resolved = resolve(plugin, HOT_RELOAD_CLIENT_ID)

    expect(plugin.apply).toBe('serve')
    expect(resolved).toBe(`\0${HOT_RELOAD_CLIENT_ID}`)
    expect(load(plugin, resolved as string)).toContain('setupHotReload(import.meta.hot)')
  })

  it('should serve an empty module when disabled', () => {
    const plugin = hotReloadClient({ enabled: false })
    const resolved = resolve(plugin, HOT_RELOAD_CLIENT_ID) as string

    expect(load(plugin, resolved)).toBe('export {}\n')
  })

  it('should ignore other modules', () => {
    const plugin = hotReloadClient({ enabled: true })
    expect(resolve(plugin, '/src/index.tsx')).toBeUndefined()
    expect(load(plugin, '/src/index.tsx')).toBeUndefined()
  })
})
