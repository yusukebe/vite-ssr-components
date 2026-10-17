import { defineConfig } from 'tsdown'
import solid from 'unplugin-solid/rolldown'

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
  plugins: [solid({ include: ['src/solid/**'], ssr: true })],
})
