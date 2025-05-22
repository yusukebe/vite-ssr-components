import { Hono } from 'hono'
import { Script, Link, ViteClient, ReactRefresh } from '../../../src/react'
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

export default app
