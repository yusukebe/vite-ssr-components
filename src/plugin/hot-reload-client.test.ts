// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClientCode, markNodes, morphNode, setupHotReload } from './hot-reload-client.js'

const parse = (html: string): Document => new DOMParser().parseFromString(html, 'text/html')

const render = (body: string) => {
  document.documentElement.innerHTML = `<head><title>Page</title></head><body>${body}</body>`
}

const apply = (body: string, head = '<title>Page</title>') => {
  const next = parse(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`)
  morphNode(document.documentElement, next.documentElement)
}

describe('morphNode', () => {
  beforeEach(() => {
    render('')
  })

  it('updates changed text without replacing the element', () => {
    render('<h1 id="title">Hello</h1>')
    const title = document.getElementById('title')

    apply('<h1 id="title">Hello, Hono</h1>')

    expect(document.getElementById('title')).toBe(title)
    expect(title?.textContent).toBe('Hello, Hono')
  })

  it('adds, removes, and updates attributes', () => {
    render('<a id="link" href="/old" class="a">link</a>')

    apply('<a id="link" href="/new" data-x="1">link</a>')

    const link = document.getElementById('link')
    expect(link?.getAttribute('href')).toBe('/new')
    expect(link?.getAttribute('data-x')).toBe('1')
    expect(link?.hasAttribute('class')).toBe(false)
  })

  it('appends and removes children', () => {
    render('<ul><li>a</li><li>b</li><li>c</li></ul>')

    apply('<ul><li>a</li><li>B</li></ul>')
    expect(document.querySelector('ul')?.innerHTML).toBe('<li>a</li><li>B</li>')

    apply('<ul><li>a</li><li>B</li><li>d</li></ul>')
    expect(document.querySelector('ul')?.innerHTML).toBe('<li>a</li><li>B</li><li>d</li>')
  })

  it('replaces an element whose tag changed', () => {
    render('<div id="box"><p>text</p></div>')

    apply('<div id="box"><section>text</section></div>')

    expect(document.getElementById('box')?.innerHTML).toBe('<section>text</section>')
  })

  it('keeps a <details> the user opened', () => {
    render('<details id="risks"><summary>Risks</summary><p>one</p></details>')
    const details = document.getElementById('risks') as HTMLDetailsElement
    details.setAttribute('open', '')

    apply('<details id="risks"><summary>Risks (2)</summary><p>one</p><p>two</p></details>')

    expect(document.getElementById('risks')).toBe(details)
    expect(details.hasAttribute('open')).toBe(true)
    expect(details.querySelector('summary')?.textContent).toBe('Risks (2)')
  })

  it('keeps the value of an input the user typed into', () => {
    render('<input id="name" value="">')
    const input = document.getElementById('name') as HTMLInputElement
    input.value = 'typed'

    apply('<input id="name" value="" placeholder="Name">')

    expect(document.getElementById('name')).toBe(input)
    expect(input.value).toBe('typed')
    expect(input.getAttribute('placeholder')).toBe('Name')
  })

  it('keeps content rendered into an empty mount point by client-side code', () => {
    render('<div id="root"><h1>Rendered in the browser</h1></div><p>server</p>')

    apply('<div id="root"></div><p>server, updated</p>')

    expect(document.getElementById('root')?.innerHTML).toBe('<h1>Rendered in the browser</h1>')
    expect(document.querySelector('p')?.textContent).toBe('server, updated')
  })

  it('does not replace or re-run scripts', () => {
    render('<script id="app">window.__ran = true</script>')
    const script = document.getElementById('app')

    apply('<script id="app">window.__ran = "again"</script>')

    expect(document.getElementById('app')).toBe(script)
    expect(script?.textContent).toBe('window.__ran = true')
  })

  it('keeps styles injected by the Vite client in <head>', () => {
    const style = document.createElement('style')
    style.setAttribute('data-vite-dev-id', '/src/style.css')
    document.head.appendChild(style)

    apply('<p>page</p>', '<title>Updated</title><meta name="description" content="Updated">')

    expect(document.head.contains(style)).toBe(true)
    expect(document.title).toBe('Updated')
    expect(document.head.querySelector('meta[name="description"]')).not.toBeNull()
  })
})

describe('morphNode with recorded server nodes', () => {
  const applyTracked = (body: string, nodes: WeakSet<Node>) => {
    const next = parse(
      `<!doctype html><html><head><title>Page</title></head><body>${body}</body></html>`
    )
    morphNode(document.documentElement, next.documentElement, nodes)
  }

  it('keeps elements injected after the page loaded, such as by browser extensions', () => {
    render('<main><p id="text">server</p></main>')
    const nodes = new WeakSet<Node>()
    markNodes(document.documentElement, nodes)
    const injectedStyle = document.createElement('style')
    injectedStyle.textContent = 'html { scrollbar-width: none }'
    document.head.appendChild(injectedStyle)
    const overlay = document.createElement('div')
    overlay.id = 'extension-overlay'
    document.body.appendChild(overlay)

    applyTracked('<main><p id="text">updated</p></main>', nodes)

    expect(document.head.contains(injectedStyle)).toBe(true)
    expect(document.body.contains(overlay)).toBe(true)
    expect(document.getElementById('text')?.textContent).toBe('updated')
  })

  it('records nodes added by an update so a later update can remove them', () => {
    render('<ul><li>a</li></ul>')
    const nodes = new WeakSet<Node>()
    markNodes(document.documentElement, nodes)

    applyTracked('<ul><li>a</li><li>b</li></ul>', nodes)
    expect(document.querySelector('ul')?.innerHTML).toBe('<li>a</li><li>b</li>')

    applyTracked('<ul><li>a</li></ul>', nodes)
    expect(document.querySelector('ul')?.innerHTML).toBe('<li>a</li>')
  })
})

describe('setupHotReload', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  const createHot = () => {
    const listeners = new Map<string, () => void>()
    return {
      on: (event: string, callback: () => void) => {
        listeners.set(event, callback)
      },
      emit: (event: string) => listeners.get(event)?.(),
    }
  }

  it('does nothing without an HMR context', () => {
    expect(() => {
      setupHotReload(undefined)
    }).not.toThrow()
  })

  it('fetches the current page and applies it on an update', async () => {
    render('<h1 id="title">Before</h1>')
    const title = document.getElementById('title')
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          '<!doctype html><html><head><title>Page</title></head><body><h1 id="title">After</h1></body></html>',
          {
            headers: { 'content-type': 'text/html; charset=utf-8' },
          }
        )
      )
    )
    const hot = createHot()
    setupHotReload(hot)

    hot.emit('vite-ssr-components:update')
    await vi.waitFor(() => {
      expect(title?.textContent).toBe('After')
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(location.href, {
      headers: { accept: 'text/html' },
    })
    expect(document.getElementById('title')).toBe(title)
  })
})

describe('createClientCode', () => {
  it('serializes the browser functions and starts listening', () => {
    const code = createClientCode()
    expect(code).toContain('function morphNode')
    expect(code).toContain('function setupHotReload')
    expect(code.trim().endsWith('setupHotReload(import.meta.hot)')).toBe(true)
  })

  it('produces code that defines every function it calls', () => {
    const code = createClientCode().replace('setupHotReload(import.meta.hot)', '')
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function(`${code}\nreturn { morphNode, setupHotReload }`) as () => {
      morphNode: typeof morphNode
    }
    const { morphNode: serializedMorph } = factory()
    render('<p id="p">old</p>')
    const next = parse(
      '<!doctype html><html><head><title>Page</title></head><body><p id="p">new</p></body></html>'
    )

    serializedMorph(document.documentElement, next.documentElement)

    expect(document.getElementById('p')?.textContent).toBe('new')
  })
})
