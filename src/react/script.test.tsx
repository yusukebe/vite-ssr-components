/** @jsxImportSource react */
/** @jsxRuntime automatic */
import { renderToString } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { Script } from './script.js'

describe('React - Script', () => {
  it('renders <script> with correct src from manifest in production mode', () => {
    const manifest = {
      'src/main.js': { file: 'assets/main.12345.js', src: 'src/main.js' },
    }
    const html = renderToString(
      <Script src='src/main.js' manifest={manifest} prod={true} baseUrl='/' />
    )
    expect(html).toContain('src="/assets/main.12345.js"')
  })

  it('renders <script> with original src in development mode', () => {
    const html = renderToString(<Script src='/dev.js' prod={false} />)
    expect(html).toContain('src="/dev.js"')
  })

  it('handles custom baseUrl in production mode', () => {
    const manifest = {
      'src/main.js': { file: 'assets/main.12345.js', src: 'src/main.js' },
    }
    const html = renderToString(
      <Script src='src/main.js' manifest={manifest} prod={true} baseUrl='/custom/' />
    )
    expect(html).toContain('src="/custom/assets/main.12345.js"')
  })

  it('passes through additional props to the script element', () => {
    const html = renderToString(
      <Script src='/dev.js' prod={false} id='main-script' async defer data-testid='script-tag' />
    )
    expect(html).toContain('id="main-script"')
    expect(html).toContain('async=""')
    expect(html).toContain('defer=""')
    expect(html).toContain('data-testid="script-tag"')
  })
})
