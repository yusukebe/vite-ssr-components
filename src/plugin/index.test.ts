import { describe, it, expect } from 'vitest'
import ssrPlugin from './index.js'

/**
 * Tests for ssrPlugin (integration plugin)
 * These tests verify the plugin composition and basic functionality
 * Detailed tests for individual plugins are in their respective test files
 */
describe('ssrPlugin', () => {
  it('should return an array of plugins', () => {
    const plugins = ssrPlugin()
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.length).toBeGreaterThan(0)
  })

  it('should include auto-entry plugin by default', () => {
    const plugins = ssrPlugin()
    const autoEntryPlugin = plugins.find((p) => p.name === 'ssr-auto-entry')
    expect(autoEntryPlugin).toBeDefined()
  })

  it('should include hot-reload plugin by default', () => {
    const plugins = ssrPlugin()
    const hotReloadPlugin = plugins.find((p) => p.name === 'vite-plugin-ssr-hot-reload')
    expect(hotReloadPlugin).toBeDefined()
  })

  it('should include inject-manifest plugin by default', () => {
    const plugins = ssrPlugin()
    const injectManifestPlugin = plugins.find((p) => p.name === 'inject-manifest')
    expect(injectManifestPlugin).toBeDefined()
  })

  it('should exclude hot-reload plugin when disabled', () => {
    const plugins = ssrPlugin({ hotReload: false })
    const hotReloadPlugin = plugins.find((p) => p.name === 'vite-plugin-ssr-hot-reload')
    expect(hotReloadPlugin).toBeUndefined()
  })

  it('should pass options to auto-entry plugin', () => {
    const options = {
      entry: {
        target: 'custom/**/*.tsx',
        components: [
          { name: 'CustomScript', attribute: 'src' },
          { name: 'CustomLink', attribute: 'href' },
        ],
      },
    }
    const plugins = ssrPlugin(options)
    const autoEntryPlugin = plugins.find((p) => p.name === 'ssr-auto-entry')
    expect(autoEntryPlugin).toBeDefined()
  })

  it('should return correct number of plugins based on options', () => {
    const pluginsWithHotReload = ssrPlugin({ hotReload: true })
    const pluginsWithoutHotReload = ssrPlugin({ hotReload: false })

    expect(pluginsWithHotReload.length).toBe(4)
    expect(pluginsWithoutHotReload.length).toBe(3)
  })

  it('should pass hot-reload options', () => {
    const options = {
      hotReload: {
        target: ['custom/**/*.ts'],
        ignore: ['**/*.test.ts'],
      },
    }
    const plugins = ssrPlugin(options)
    const hotReloadPlugin = plugins.find((p) => p.name === 'vite-plugin-ssr-hot-reload')
    expect(hotReloadPlugin).toBeDefined()
  })
})
