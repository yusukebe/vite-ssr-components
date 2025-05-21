import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/common/index.ts', 'src/react/index.ts', 'src/hono/index.ts'],
  external: ['vite', 'react', 'hono'],
  format: 'esm',
  splitting: false,
  dts: true,
})
