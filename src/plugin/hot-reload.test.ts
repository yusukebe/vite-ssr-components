import { describe, it, expect, vi, beforeEach } from 'vitest'
import hotReload from './hot-reload.js'

/**
 * Tests for hotReload plugin
 * These tests verify the hot-reload functionality for SSR development
 */
describe('hotReload plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a plugin with correct name', () => {
    const plugin = hotReload()
    expect(plugin.name).toBe('vite-plugin-ssr-hot-reload')
    expect(plugin.apply).toBe('serve')
    expect(plugin.configResolved).toBeDefined()
    expect(plugin.handleHotUpdate).toBeDefined()
  })

  it('should use default options when none provided', () => {
    const plugin = hotReload()
    expect(plugin.name).toBe('vite-plugin-ssr-hot-reload')
  })

  it('should accept custom entry patterns', () => {
    const options = {
      entry: ['custom/**/*.ts', 'custom/**/*.tsx'],
    }
    const plugin = hotReload(options)
    expect(plugin.name).toBe('vite-plugin-ssr-hot-reload')
  })

  it('should accept custom ignore patterns', () => {
    const options = {
      ignore: ['**/*.test.ts', '**/*.spec.ts'],
    }
    const plugin = hotReload(options)
    expect(plugin.name).toBe('vite-plugin-ssr-hot-reload')
  })

  it('should handle string entry pattern', () => {
    const options = {
      entry: 'src/**/*.tsx',
    }
    const plugin = hotReload(options)
    expect(plugin.name).toBe('vite-plugin-ssr-hot-reload')
  })

  it('should handle string ignore pattern', () => {
    const options = {
      ignore: '**/*.test.ts',
    }
    const plugin = hotReload(options)
    expect(plugin.name).toBe('vite-plugin-ssr-hot-reload')
  })

  it('should configure patterns on configResolved', () => {
    const plugin = hotReload()
    const mockConfig = {
      root: '/mock/project',
    }

    expect(() => {
      if (plugin.configResolved) {
        // @ts-expect-error - Testing plugin behavior with mock config
        plugin.configResolved(mockConfig)
      }
    }).not.toThrow()
  })

  it('should send full-reload for matching files', () => {
    const plugin = hotReload()
    const mockConfig = {
      root: '/mock/project',
    }

    // Configure the plugin first
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    const mockServer = {
      hot: {
        send: vi.fn(),
      },
    }

    const mockContext = {
      server: mockServer,
      file: '/mock/project/src/index.tsx',
    }

    if (plugin.handleHotUpdate) {
      // @ts-expect-error - Testing plugin behavior with mock context
      const result = plugin.handleHotUpdate(mockContext)

      expect(mockServer.hot.send).toHaveBeenCalledWith({ type: 'full-reload' })
      expect(result).toEqual([])
    }
  })

  it('should not send reload for non-matching files', () => {
    const plugin = hotReload()
    const mockConfig = {
      root: '/mock/project',
    }

    // Configure the plugin first
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    const mockServer = {
      hot: {
        send: vi.fn(),
      },
    }

    const mockContext = {
      server: mockServer,
      file: '/mock/project/public/image.png',
    }

    if (plugin.handleHotUpdate) {
      // @ts-expect-error - Testing plugin behavior with mock context
      plugin.handleHotUpdate(mockContext)

      expect(mockServer.hot.send).not.toHaveBeenCalled()
    }
  })

  it('should handle missing file gracefully', () => {
    const plugin = hotReload()
    const mockConfig = {
      root: '/mock/project',
    }

    // Configure the plugin first
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    const mockServer = {
      hot: {
        send: vi.fn(),
      },
    }

    const mockContext = {
      server: mockServer,
      file: undefined,
    }

    expect(() => {
      if (plugin.handleHotUpdate) {
        // @ts-expect-error - Testing plugin behavior with mock context
        plugin.handleHotUpdate(mockContext)
      }
    }).not.toThrow()

    expect(mockServer.hot.send).not.toHaveBeenCalled()
  })

  it('should handle custom entry patterns correctly', () => {
    const plugin = hotReload({
      entry: ['custom/**/*.ts'],
    })
    const mockConfig = {
      root: '/mock/project',
    }

    // Configure the plugin first
    if (plugin.configResolved) {
      // @ts-expect-error - Testing plugin behavior with mock config
      plugin.configResolved(mockConfig)
    }

    const mockServer = {
      hot: {
        send: vi.fn(),
      },
    }

    // Should match custom pattern
    const mockContext1 = {
      server: mockServer,
      file: '/mock/project/custom/module.ts',
    }

    if (plugin.handleHotUpdate) {
      // @ts-expect-error - Testing plugin behavior with mock context
      const result = plugin.handleHotUpdate(mockContext1)
      expect(mockServer.hot.send).toHaveBeenCalledWith({ type: 'full-reload' })
      expect(result).toEqual([])
    }

    // Should not match default pattern
    mockServer.hot.send.mockClear()
    const mockContext2 = {
      server: mockServer,
      file: '/mock/project/src/index.tsx',
    }

    if (plugin.handleHotUpdate) {
      // @ts-expect-error - Testing plugin behavior with mock context
      plugin.handleHotUpdate(mockContext2)
      expect(mockServer.hot.send).not.toHaveBeenCalled()
    }
  })
})
