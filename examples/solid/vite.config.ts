import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import solidPlugin from 'vite-plugin-solid'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin(), solidPlugin({ ssr: true })],
})
