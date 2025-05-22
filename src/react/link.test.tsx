/** @jsxImportSource react */
/** @jsxRuntime automatic */
import { renderToString } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { Link } from './link.js'

describe('React - Link', () => {
  it('renders <link> with correct href and rel', () => {
    const manifest = {
      'src/style.css': { file: 'assets/style.12345.css', src: 'src/style.css' },
    }
    const html = renderToString(
      <Link
        href='/src/style.css'
        manifest={manifest}
        prod={true}
        baseUrl='/'
        rel='stylesheet'
        media='all'
      />
    )
    expect(html).toContain('<link href="/assets/style.12345.css" rel="stylesheet" media="all"')
  })

  it('renders <link> with original href in dev mode', () => {
    const html = renderToString(<Link href='/dev.css' prod={false} rel='stylesheet' />)
    expect(html).toContain('<link href="/dev.css" rel="stylesheet"')
  })

  it('handles custom baseUrl in production mode', () => {
    const manifest = {
      'src/style.css': { file: 'assets/style.12345.css', src: 'src/style.css' },
    }
    const html = renderToString(
      <Link
        href='/src/style.css'
        manifest={manifest}
        prod={true}
        baseUrl='/custom/'
        rel='stylesheet'
      />
    )
    expect(html).toContain('<link href="/custom/assets/style.12345.css" rel="stylesheet"')
  })

  it('passes through additional props to the link element', () => {
    const html = renderToString(
      <Link
        href='/dev.css'
        prod={false}
        rel='stylesheet'
        id='main-style'
        crossOrigin='anonymous'
        data-testid='link-tag'
      />
    )
    expect(html).toContain('id="main-style"')
    expect(html).toContain('crossorigin="anonymous"')
    expect(html).toContain('data-testid="link-tag"')
  })
})
