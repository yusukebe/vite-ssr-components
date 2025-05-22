import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import build from '@hono/vite-build/cloudflare-workers'
import ssrHotReload from '../../src/plugin/hot-reload'

export default defineConfig(({ mode, command }) => {
  if (command === 'build') {
    if (mode === 'client') {
      return {
        build: {
          manifest: true,
          rollupOptions: {
            input: ['./src/client.tsx', './src/style.css'],
          },
        },
      }
    }
    return {
      plugins: [
        build({
          outputDir: 'dist-server',
        }),
      ],
    }
  }
  return {
    plugins: [cloudflare(), ssrHotReload()],
  }
})
