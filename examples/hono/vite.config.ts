import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import ssrHotReload from '../../src/plugin/hot-reload'

export default defineConfig({
  plugins: [cloudflare(), ssrHotReload()],
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
        manifest: true,
        rollupOptions: {
          input: ['./src/client.tsx', './src/style.css'],
        },
      },
    },
  },
})
