import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/common/index.ts',
    'src/react/index.ts',
    'src/hono/index.ts',
    'src/plugin/hot-reload.ts',
  ],
  external: ['vite', 'react', 'hono'],
  format: 'esm',
  splitting: false,
  dts: true,
})
