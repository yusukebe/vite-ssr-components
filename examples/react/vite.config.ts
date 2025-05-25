import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import ssrHotReload from '../../src/plugin/hot-reload'

export default defineConfig({
  plugins: [
    cloudflare(),
    ssrHotReload({
      ignore: ['./src/client/**/*.tsx'],
    }),
    react(),
  ],
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
        manifest: true,
        rollupOptions: {
          input: ['./src/client/index.tsx', './src/style.css'],
        },
      },
    },
  },
})
