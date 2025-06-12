import { describe, it, expect, vi } from 'vitest'
import clientFirstBuild from './client-first-build.js'

describe('clientFirstBuild', () => {
  it('should return plugin with correct name', () => {
    const plugin = clientFirstBuild()
    expect(plugin.name).toBe('client-first-build')
  })

  it('should have config function', () => {
    const plugin = clientFirstBuild()
    expect(plugin.config).toBeDefined()
    expect(typeof plugin.config).toBe('function')
  })

  it('should build client environment before server environment', async () => {
    const plugin = clientFirstBuild()
    const config: Record<string, unknown> = {}

    if (typeof plugin.config === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      plugin.config(config, { command: 'build', mode: 'production' })
    }

    const buildOrder: string[] = []
    const mockBuilder = {
      environments: {
        client: { name: 'client' },
        server: { name: 'server' },
      },
      build: vi.fn().mockImplementation((env: { name: string }) => {
        buildOrder.push(env.name)
        return Promise.resolve()
      }),
    }

    const buildApp = (config.builder as Record<string, unknown>).buildApp as (
      builder: unknown
    ) => Promise<void>
    await buildApp(mockBuilder)

    expect(buildOrder).toEqual(['client', 'server'])
    expect(mockBuilder.build).toHaveBeenCalledTimes(2)
  })
})
