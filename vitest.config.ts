import { defineConfig } from 'vite'
import solid from 'unplugin-solid/vite'

export default defineConfig({
  test: {
    globals: true
  },
  plugins: [solid({ include: ['src/solid/**'] })],
})
