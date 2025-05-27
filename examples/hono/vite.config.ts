import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import ssrPlugin from '../../src/plugin'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin()],
})
