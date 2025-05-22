import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import build from '@hono/vite-build/cloudflare-workers'
import react from '@vitejs/plugin-react'
import ssrHotReload from '../../src/plugin/hot-reload'

export default defineConfig(({ mode, command }) => {
  if (command === 'build') {
    if (mode === 'client') {
      return {
        build: {
          manifest: true,
          rollupOptions: {
            input: ['./src/client/index.tsx', './src/style.css'],
          },
        },
      }
    }
    return {
      resolve: {
        alias: {
          'react-dom/server': 'react-dom/server.edge',
        },
      },
      plugins: [
        build({
          outputDir: 'dist-server',
        }),
      ],
    }
  }
  return {
    plugins: [
      cloudflare(),
      ssrHotReload({
        ignore: ['./src/client/**/*.tsx'],
      }),
      react(),
    ],
  }
})
