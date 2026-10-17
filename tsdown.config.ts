import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/common/index.ts', 'src/react/index.ts', 'src/hono/index.ts', 'src/solid/index.ts', 'src/plugin/index.ts'],
  format: 'esm',
  dts: true,
  exports: true,
  // The package is ESM-only ("type": "module"), so plain .js / .d.ts are enough.
  fixedExtension: false,
  deps: {
    neverBundle: [/^vite(\/|$)/, /^react(\/|$)/, /^hono(\/|$)/, /^solid-js(\/|$)/],
  },
  clean: false,
  target: false,
})
