import { Hono } from 'hono'
import { Script, Link, ViteClient } from 'vite-ssr-components/solid'
import { renderToString } from 'solid-js/web'

const app = new Hono()

app.get('/', (c) => {
  return c.html(
    '<!DOCTYPE html>' +
      renderToString(() => (
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
      ))
  )
})

export default app
