/// <reference lib="dom" />

/**
 * Browser code for SSR hot reload. When a server-side file changes, the page
 * is fetched again and the new HTML is applied to the current DOM, so scroll
 * position, open `<details>`, focus, and typed input survive the update.
 *
 * Each function is serialized with `Function.prototype.toString()` into a
 * virtual module, so a function may only reference the other functions listed
 * in `createClientCode()` and browser globals.
 */

/**
 * Records `root` and every node under it. Updates only change or remove recorded nodes,
 * so elements injected later by browser extensions or other scripts are left alone.
 */
export function markNodes(root: Node, nodes: WeakSet<Node>): void {
  nodes.add(root)
  root.childNodes.forEach((child) => {
    markNodes(child, nodes)
  })
}

/** Whether `to` can be applied onto `from` in place instead of replacing it. */
export function isSameNode(from: Node, to: Node): boolean {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) {
    return false
  }
  if (from.nodeType !== 1) {
    return true
  }
  return (from as Element).id === (to as Element).id
}

/** Copies the attributes of `to` onto `from`, keeping state the user toggled. */
export function syncAttributes(from: Element, to: Element): void {
  const preserved = from.nodeName === 'DETAILS' || from.nodeName === 'DIALOG' ? ['open'] : []
  for (const { name } of Array.from(from.attributes)) {
    if (!to.hasAttribute(name) && !preserved.includes(name)) {
      from.removeAttribute(name)
    }
  }
  for (const { name, value } of Array.from(to.attributes)) {
    if (!preserved.includes(name) && from.getAttribute(name) !== value) {
      from.setAttribute(name, value)
    }
  }
}

/**
 * Applies the children of `to` onto the children of `from`, position by position.
 * When `nodes` is given, children that are not recorded in it are skipped and kept.
 */
export function morphChildren(from: Node, to: Node, nodes?: WeakSet<Node>): void {
  // Nodes that did not come from the server HTML, such as styles injected by Vite's client
  const isForeign = (node: Node) =>
    (node.nodeType === 1 && (node as Element).hasAttribute('data-vite-dev-id')) ||
    (nodes !== undefined && !nodes.has(node))
  const fromChildren = Array.from(from.childNodes).filter((node) => !isForeign(node))
  const toChildren = Array.from(to.childNodes)
  const ownerDocument = from.ownerDocument ?? (from as Document)

  const importNode = (node: Node): Node => {
    const imported = ownerDocument.importNode(node, true)
    if (nodes) {
      markNodes(imported, nodes)
    }
    return imported
  }

  toChildren.forEach((toChild, index) => {
    if (index >= fromChildren.length) {
      from.appendChild(importNode(toChild))
      return
    }
    const fromChild = fromChildren[index]
    if (isSameNode(fromChild, toChild)) {
      morphNode(fromChild, toChild, nodes)
    } else {
      from.replaceChild(importNode(toChild), fromChild)
    }
  })

  for (const extra of fromChildren.slice(toChildren.length)) {
    from.removeChild(extra)
  }
}

/** Applies `to` onto `from` in place. See `morphChildren` for `nodes`. */
export function morphNode(from: Node, to: Node, nodes?: WeakSet<Node>): void {
  if (from.nodeType === 3 || from.nodeType === 8) {
    if (from.nodeValue !== to.nodeValue) {
      from.nodeValue = to.nodeValue
    }
    return
  }
  if (from.nodeType !== 1) {
    return
  }
  const fromElement = from as Element
  const toElement = to as Element

  // Scripts are never re-run or replaced
  if (fromElement.nodeName === 'SCRIPT') {
    return
  }

  syncAttributes(fromElement, toElement)

  // Rendered empty by the server but filled in the browser: a mount point for client-side rendering
  if (toElement.childNodes.length === 0 && fromElement.childNodes.length > 0) {
    return
  }
  // Keep what the user is typing
  if (fromElement.nodeName === 'TEXTAREA') {
    return
  }

  morphChildren(fromElement, toElement, nodes)
}

/** Listens for server-side updates and applies the fetched page to the document. */
export function setupHotReload(
  hot: { on: (event: string, callback: () => void) => void } | undefined
): void {
  if (!hot) {
    return
  }
  // Everything on the page now came from the server; later additions by other scripts are kept
  const nodes = new WeakSet<Node>()
  markNodes(document.documentElement, nodes)
  let running = false
  let queued = false

  const refresh = async (): Promise<void> => {
    if (running) {
      queued = true
      return
    }
    running = true
    try {
      const response = await fetch(location.href, { headers: { accept: 'text/html' } })
      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok || !contentType.includes('text/html')) {
        location.reload()
        return
      }
      const next = new DOMParser().parseFromString(await response.text(), 'text/html')
      morphNode(document.documentElement, next.documentElement, nodes)
    } catch {
      location.reload()
    } finally {
      running = false
      if (queued) {
        queued = false
        void refresh()
      }
    }
  }

  hot.on('vite-ssr-components:update', () => {
    void refresh()
  })
}

/** The source of the virtual module that runs in the browser. */
export function createClientCode(): string {
  const functions = [
    markNodes,
    isSameNode,
    syncAttributes,
    morphChildren,
    morphNode,
    setupHotReload,
  ]
  return `${functions.map((fn) => fn.toString()).join('\n\n')}\n\nsetupHotReload(import.meta.hot)\n`
}
