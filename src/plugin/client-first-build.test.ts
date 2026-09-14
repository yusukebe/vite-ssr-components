import type { BuildEnvironment } from 'vite'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import clientFirstBuild, { hasClientInput } from './client-first-build.js'

let root: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'client-first-build-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

const environment = (name: string, build: Record<string, unknown> = {}) => ({
  name,
  config: { root, build: { outDir: `dist/${name}`, rolldownOptions: {}, ...build } },
})

const clientEnvironment = (build: Record<string, unknown> = {}) =>
  environment('client', build) as unknown as BuildEnvironment

const runBuildApp = async (environments: Record<string, ReturnType<typeof environment>>) => {
  const plugin = clientFirstBuild()
  const config: Record<string, unknown> = {}
  if (typeof plugin.config === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    plugin.config(config, { command: 'build', mode: 'production' })
  }
  const buildOrder: string[] = []
  const builder = {
    environments,
    build: vi.fn().mockImplementation((env: { name: string }) => {
      buildOrder.push(env.name)
      return Promise.resolve()
    }),
  }
  const buildApp = (config.builder as Record<string, unknown>).buildApp as (
    builder: unknown
  ) => Promise<void>
  await buildApp(builder)
  return { buildOrder, builder }
}

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
    const { buildOrder, builder } = await runBuildApp({
      client: environment('client', { rolldownOptions: { input: ['src/client.tsx'] } }),
      server: environment('server'),
    })
    expect(buildOrder).toEqual(['client', 'server'])
    expect(builder.build).toHaveBeenCalledTimes(2)
  })

  it('should skip the client build when it has no input and no index.html', async () => {
    const { buildOrder } = await runBuildApp({
      client: environment('client'),
      server: environment('server'),
    })
    expect(buildOrder).toEqual(['server'])
  })
})

describe('hasClientInput', () => {
  it('should be true for string, array, and object inputs', () => {
    const cases = ['src/client.tsx', ['src/client.tsx'], { main: 'src/client.tsx' }]
    for (const input of cases) {
      expect(hasClientInput(clientEnvironment({ rolldownOptions: { input } }))).toBe(true)
    }
  })

  it('should be false for an empty input', () => {
    expect(hasClientInput(clientEnvironment({ rolldownOptions: { input: [] } }))).toBe(false)
  })

  it('should fall back to index.html when there is no input', () => {
    expect(hasClientInput(clientEnvironment())).toBe(false)
    fs.writeFileSync(path.join(root, 'index.html'), '<html></html>')
    expect(hasClientInput(clientEnvironment())).toBe(true)
  })
})
