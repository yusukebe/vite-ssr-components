import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  external: ['vite'],
  format: 'esm',
  splitting: false,
  dts: true
})
