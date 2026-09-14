import type { BuildEnvironment, Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Whether the client environment has anything to build. Without an explicit
 * input Vite falls back to `index.html`, which SSR apps usually don't have, so
 * building would fail with an unresolved entry.
 */
export function hasClientInput(environment: BuildEnvironment): boolean {
  const { build, root } = environment.config
  const input = build.rolldownOptions.input
  if (typeof input === 'string' || Array.isArray(input)) {
    return input.length > 0
  }
  if (input && typeof input === 'object') {
    return Object.keys(input).length > 0
  }
  return fs.existsSync(path.resolve(root, 'index.html'))
}

export default function clientFirstBuild(): Plugin {
  return {
    name: 'client-first-build',
    config(config) {
      config.builder ??= {}
      config.builder.buildApp = async (builder) => {
        const clientEnvironment = builder.environments.client as BuildEnvironment | undefined
        const workerEnvironments = Object.keys(builder.environments)
          .filter((name) => name !== 'client')
          .map((name) => builder.environments[name])

        // Client build first, when there is something to build.
        // Mirrors @cloudflare/vite-plugin, which also checks the input or index.html.
        if (clientEnvironment !== undefined && hasClientInput(clientEnvironment)) {
          await builder.build(clientEnvironment)
        }

        // Then worker builds
        for (const workerEnv of workerEnvironments) {
          await builder.build(workerEnv)
        }
      }
    },
  }
}
