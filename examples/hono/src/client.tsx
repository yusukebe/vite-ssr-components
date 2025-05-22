import { render } from 'hono/jsx/dom'

function App() {
  return <h1>Hello</h1>
}

const domNode = document.getElementById('root')!
render(<App />, domNode)
