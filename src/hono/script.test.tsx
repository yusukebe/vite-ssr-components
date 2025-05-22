/* eslint-disable @typescript-eslint/no-base-to-string */
/** @jsxImportSource hono/jsx */
/** @jsxRuntime automatic */
import { describe, it, expect } from 'vitest'
import { Script } from './script.js'

describe('hono/jsx - Script', () => {
  it('renders <script> with correct src from manifest in production mode', () => {
    const manifest = {
      'src/main.js': { file: 'assets/main.12345.js', src: 'src/main.js' },
    }
    const html = <Script src='src/main.js' manifest={manifest} prod={true} baseUrl='/' />
    expect(html.toString()).toContain('src="/assets/main.12345.js"')
  })

  it('renders <script> with original src in development mode', () => {
    const html = <Script src='/dev.js' prod={false} />
    expect(html.toString()).toContain('src="/dev.js"')
  })

  it('handles custom baseUrl in production mode', () => {
    const manifest = {
      'src/main.js': { file: 'assets/main.12345.js', src: 'src/main.js' },
    }
    const html = <Script src='src/main.js' manifest={manifest} prod={true} baseUrl='/custom/' />
    expect(html.toString()).toContain('src="/custom/assets/main.12345.js"')
  })

  it('passes through additional props to the script element', () => {
    const html = (
      <Script
        src='/dev.js'
        prod={false}
        type='module'
        id='main-script'
        async
        defer
        data-testid='script-tag'
      />
    )
    expect(html.toString()).toContain('id="main-script"')
    expect(html.toString()).toContain('async')
    expect(html.toString()).toContain('defer')
    expect(html.toString()).toContain('data-testid="script-tag"')
  })
})
