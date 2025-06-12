import type { Plugin } from 'vite'

export default function clientFirstBuild(): Plugin {
  return {
    name: 'client-first-build',
    config(config) {
      config.builder ??= {}
      config.builder.buildApp = async (builder) => {
        const clientEnvironment = builder.environments.client
        const workerEnvironments = Object.keys(builder.environments)
          .filter((name) => name !== 'client')
          .map((name) => builder.environments[name])

        // Client build first
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (clientEnvironment) {
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
