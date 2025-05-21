import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
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
})
