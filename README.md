# vite-ssr-components

**_vite-ssr-components_** provides JSX components and Vite plugins for helping the development and deployment for SSR application with Vite.

## Motivation

When using Cloudflare's Vite plugin for SSR applications, several challenges arise:

- **Missing Vite client scripts**: The Vite client script (`/@vite/client`) is not automatically embedded in server-side rendered HTML
- **No SSR hot reload**: Server-side code changes don't trigger hot reloads during development
- **Complex asset path resolution**: Resolving script and asset paths after build requires manual manifest.json handling

This library solves these issues by providing:

- **Automatic Vite client injection** for development mode
- **SSR hot reload** plugin for seamless development experience
- **Automatic asset path resolution** using Vite's manifest.json
- **Framework agnostic** components for both hono/jsx and React

## Install

```bash
npm i -D vite-ssr-components
```

## Components

### ViteClient

Adds Vite client script for development mode.

```tsx
import { ViteClient } from 'vite-ssr-components/hono'
// import { ViteClient } from 'vite-ssr-components/react'

function App() {
  return (
    <html>
      <head>
        <ViteClient />
      </head>
    </html>
  )
}
// Renders: <script type="module" src="/@vite/client"></script>
```

### Script

Adds script tags with proper Vite handling. In production mode, automatically reads `manifest.json` to resolve the correct built file paths.

```tsx
import { Script } from 'vite-ssr-components/hono'
// import { Script } from 'vite-ssr-components/react'

function App() {
  return (
    <html>
      <head>
        <Script src='/src/client.tsx' />
      </head>
    </html>
  )
}
// Development: <script type="module" src="/src/client.tsx"></script>
// Production: <script type="module" src="/assets/client-abc123.js"></script>
```

#### Options

- `src` (required): Source path of the script file
- `manifest`: Custom Vite manifest object (auto-loaded if not provided)
- `prod`: Force production mode (defaults to `import.meta.env.PROD`)
- `baseUrl`: Base URL for assets (defaults to `/`)
- All standard HTML script attributes are supported

```tsx
<Script src='/src/client.tsx' baseUrl='/app/' defer onLoad={() => console.log('loaded')} />
```

### Link

Adds link tags for stylesheets and other resources. In production mode, automatically reads `manifest.json` to resolve the correct built file paths.

```tsx
import { Link } from 'vite-ssr-components/hono'
// import { Link } from 'vite-ssr-components/react'

function App() {
  return (
    <html>
      <head>
        <Link href='/src/style.css' rel='stylesheet' />
      </head>
    </html>
  )
}
// Development: <link href="/src/style.css" rel="stylesheet">
// Production: <link href="/assets/style-def456.css" rel="stylesheet">
```

#### Options

- `href` (required): Source path of the resource
- `manifest`: Custom Vite manifest object (auto-loaded if not provided)
- `prod`: Force production mode (defaults to `import.meta.env.PROD`)
- `baseUrl`: Base URL for assets (defaults to `/`)
- All standard HTML link attributes are supported

```tsx
<Link href='/src/style.css' rel='stylesheet' baseUrl='/app/' media='screen' />
```

### ReactRefresh (React only)

Enables React Fast Refresh in development. Requires [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react) to be installed and configured.

```tsx
import { ReactRefresh } from 'vite-ssr-components/react'

function App() {
  return (
    <html>
      <head>
        <ReactRefresh />
      </head>
    </html>
  )
}
// Adds React refresh runtime in development mode
```

## Plugins

### SSR Hot Reload

Vite plugin for SSR hot reload functionality.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import ssrHotReload from 'vite-ssr-components/plugin/hot-reload'

export default defineConfig({
  plugins: [
    ssrHotReload({
      entry: ['src/**/*.ts', 'src/**/*.tsx'],
      ignore: ['src/client/**/*'],
    }),
  ],
})
```

#### Options

- `entry`: File patterns to watch for SSR hot reload (defaults to `['src/**/*.ts', 'src/**/*.tsx']`)
- `ignore`: File patterns to ignore (optional)

## Examples

See the [examples](./examples) directory for complete working examples.

### hono/jsx

#### Directory Structure

```
examples/hono/
├── src/
│   ├── index.tsx      # Server entry point
│   ├── client.tsx     # Client entry point
│   └── style.css      # Stylesheet
├── vite.config.ts     # Vite configuration
└── package.json
```

#### vite.config.ts

```ts
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import ssrHotReload from 'vite-ssr-components/plugin/hot-reload'

export default defineConfig({
  plugins: [cloudflare(), ssrHotReload()],
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
        manifest: true,
        rollupOptions: {
          input: ['./src/client.tsx', './src/style.css'],
        },
      },
    },
  },
})
```

#### Server Code

```tsx
import { Hono } from 'hono'
import { Script, Link, ViteClient } from 'vite-ssr-components/hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html(
    <html>
      <head>
        <ViteClient />
        <Script src='/src/client.tsx' />
        <Link href='/src/style.css' rel='stylesheet' />
      </head>
      <body>
        <div id='root' />
      </body>
    </html>
  )
})
```

### React

#### Directory Structure

```
examples/react/
├── src/
│   ├── index.tsx          # Server entry point
│   ├── style.css          # Stylesheet
│   └── client/
│       ├── index.tsx      # Client entry point
│       └── app.tsx        # React app component
├── vite.config.ts         # Vite configuration
└── package.json
```

#### vite.config.ts

```ts
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import ssrHotReload from 'vite-ssr-components/plugin/hot-reload'

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
```

#### Server Code

```tsx
import { Hono } from 'hono'
import { Script, Link, ViteClient, ReactRefresh } from 'vite-ssr-components/react'
import { renderToReadableStream } from 'react-dom/server'

const app = new Hono()

app.get('/', async (c) => {
  c.header('Content-Type', 'text/html')
  return c.body(
    await renderToReadableStream(
      <html>
        <head>
          <ViteClient />
          <ReactRefresh />
          <Script src='/src/client/index.tsx' />
          <Link href='/src/style.css' rel='stylesheet' />
        </head>
        <body>
          <div id='root' />
        </body>
      </html>
    )
  )
})
```

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
