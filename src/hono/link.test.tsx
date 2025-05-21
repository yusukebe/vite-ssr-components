/** @jsxImportSource hono/jsx */
/** @jsxRuntime automatic */

import { describe, it, expect } from 'vitest'
import { Link } from './link.js'

describe('hono/jsx - Link', () => {
  it('renders <link> with correct href and rel', () => {
    const manifest = {
      'src/style.css': { file: 'assets/style.12345.css' },
    }
    const html = (
      <Link
        href='/src/style.css'
        manifest={manifest}
        prod={true}
        baseUrl='/'
        rel='stylesheet'
        media='all'
      />
    )
    expect(html.toString()).toContain(
      '<link href="/assets/style.12345.css" rel="stylesheet" media="all"'
    )
  })

  it('renders <link> with original href in dev mode', () => {
    const html = <Link href='/dev.css' prod={false} rel='stylesheet' />
    expect(html.toString()).toContain('<link href="/dev.css" rel="stylesheet"')
  })
})
