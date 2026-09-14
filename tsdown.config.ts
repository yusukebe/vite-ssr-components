import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/common/index.ts', 'src/react/index.ts', 'src/hono/index.ts', 'src/plugin/index.ts'],
  format: 'esm',
  dts: true,
  exports: true,
  deps: {
    neverBundle: [/^vite(\/|$)/, /^react(\/|$)/, /^hono(\/|$)/],
  },
  clean: false,
  target: false,
})
