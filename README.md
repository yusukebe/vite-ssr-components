# vite-ssr-components

**_vite-ssr-components_** provides JSX components and Vite plugins for helping the development and deployment for SSR application with Vite.

## Motivation

When using Cloudflare's Vite plugin for SSR applications, several challenges arise:

- **Missing Vite client scripts**: The Vite client script (`/@vite/client`) needs to be manually embedded in server-side rendered HTML
- **No SSR hot reload**: Server-side code changes don't trigger hot reloads during development
- **Complex asset path resolution**: Resolving script and asset paths after build requires manual `manifest.json` handling
- **Manual build configuration**: Manually specifying entry files in `vite.config.ts` for each Script/Link component

This library solves these issues by providing:

- **ViteClient component** for development mode
- **SSR hot reload** plugin for seamless development experience
- **Automatic asset path resolution** using Vite's `manifest.json`
- **Automatic build entry detection** from Script/Link components with flexible component-attribute mapping
- **Framework agnostic** components for both hono/jsx and React

## Install

```bash
npm i -D vite-ssr-components
```

## Quick Start

### 1. Add the SSR Plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin()],
})
```

### 2. Use Components in Your SSR Code

```tsx
import { Script, Link, ViteClient } from 'vite-ssr-components/hono'
// import { Script, Link, ViteClient } from 'vite-ssr-components/react'

function App() {
  return (
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
}
```

That's it! The plugin automatically:

- Scans your source files for Script/Link components
- Detects the referenced files from component attributes
- Adds the detected files to Vite's build input
- Configures client build settings
- Enables SSR hot reload

## Components

> [!IMPORTANT]
> If you define custom components with the same names as the default `Link` and `Script` components, unexpected behavior may occur. In such cases, use different names for your custom components or specify custom component names in the plugin's `components` configuration.

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

### SSR Plugin

The main plugin that combines auto-entry detection and SSR hot reload functionality.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [ssrPlugin()],
})
```

#### Options

```ts
interface Component {
  name: string // Component name to detect
  attribute: string // Attribute name to extract file path from
}

interface SSRPluginOptions {
  entry?: {
    target?: string | string[] // File patterns to scan (default: 'src/**/*.{tsx,ts}')
    components?: Component[] // Component configurations (default: [{ name: 'Script', attribute: 'src' }, { name: 'Link', attribute: 'href' }])
  }
  hotReload?:
    | boolean
    | {
        target?: string | string[] // File patterns to watch (default: ['src/**/*.ts', 'src/**/*.tsx'])
        ignore?: string | string[] // File patterns to ignore
      }
}
```

#### Examples

```ts
// Basic usage
export default defineConfig({
  plugins: [ssrPlugin()],
})

// Custom file patterns and component configurations
export default defineConfig({
  plugins: [
    ssrPlugin({
      entry: {
        target: ['src/**/*.tsx', 'app/**/*.ts'], // Scan multiple patterns
        components: [
          { name: 'Script', attribute: 'src' },
          { name: 'Link', attribute: 'href' },
          { name: 'CustomScript', attribute: 'source' },
          { name: 'CustomLink', attribute: 'url' },
          { name: 'Foo', attribute: 'bar' },
          { name: 'DataLoader', attribute: 'dataPath' },
          { name: 'AssetLoader', attribute: 'assetUrl' },
        ],
      },
      hotReload: {
        target: ['src/**/*.ts', 'src/**/*.tsx'],
        ignore: ['src/client/**/*'],
      },
    }),
  ],
})

// Scan only specific directories
export default defineConfig({
  plugins: [
    ssrPlugin({
      entry: {
        target: 'app/**/*.tsx', // Only scan app directory
      },
    }),
  ],
})

// Disable hot reload
export default defineConfig({
  plugins: [
    ssrPlugin({
      hotReload: false,
    }),
  ],
})
```

#### Auto-Entry Detection

The plugin automatically scans your source files to detect Script/Link components and extracts file paths from their attributes. This eliminates the need to manually configure build entries.

**How it works:**

1. **File Scanning**: The plugin scans files matching the specified patterns (default: `src/**/*.{tsx,ts}`)
2. **AST Analysis**: Each file is parsed and analyzed to find JSX components
3. **Component Detection**: Components matching the configured names are detected
4. **Attribute Extraction**: File paths are extracted from the specified attributes
5. **Build Configuration**: Detected files are automatically added to Vite's build input

**Example:**

```tsx
// src/pages/home.tsx
function HomePage() {
  return (
    <html>
      <head>
        <Script src='/src/client.tsx' />
        <Link href='/src/style.css' rel='stylesheet' />
      </head>
    </html>
  )
}

// src/pages/about.tsx
function AboutPage() {
  return (
    <html>
      <head>
        <Script src='/src/about-client.tsx' />
        <Link href='/src/about.css' rel='stylesheet' />
      </head>
    </html>
  )
}
```

The plugin will automatically detect and add these files to the build:

- `/src/client.tsx`
- `/src/style.css`
- `/src/about-client.tsx`
- `/src/about.css`

#### Custom Component Detection

The plugin can detect any custom components with any attribute names:

```tsx
// Custom components in your SSR code
function App() {
  return (
    <html>
      <head>
        <CustomScript source='/src/app.js' />
        <CustomLink url='/src/main.css' />
        <Foo bar='/src/data.json' />
        <DataLoader dataPath='/src/config.json' />
        <AssetLoader assetUrl='/src/assets/image.png' />
      </head>
    </html>
  )
}
```

The plugin will automatically:

- Detect `CustomScript` components and extract paths from the `source` attribute
- Detect `CustomLink` components and extract paths from the `url` attribute
- Detect `Foo` components and extract paths from the `bar` attribute
- And so on...

Each component type only looks for its specified attribute, ensuring accurate detection:

```tsx
// Only the correct attributes are detected for each component
<Script href="/src/wrong.css" src="/src/client.tsx" />  // Only 'src' is detected
<Link src="/src/wrong.js" href="/src/style.css" />     // Only 'href' is detected
```

#### File Pattern Matching

The plugin supports flexible file pattern matching using glob patterns:

```ts
// Single pattern
pattern: 'src/**/*.tsx'

// Multiple patterns
pattern: ['src/**/*.tsx', 'app/**/*.ts', 'components/**/*.jsx']

// Exclude specific directories
pattern: ['src/**/*.{tsx,ts}', '!src/test/**/*']
```

**Pattern Examples:**

- `src/**/*.tsx` - All .tsx files in src directory and subdirectories
- `app/**/*.{ts,tsx}` - All .ts and .tsx files in app directory
- `**/*.jsx` - All .jsx files in the entire project
- `!node_modules/**/*` - Exclude node_modules directory

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
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin()],
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
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [
    cloudflare(),
    ssrPlugin({
      hotReload: {
        ignore: ['./src/client/**/*.tsx'],
      },
    }),
    react(),
  ],
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
