import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'

function App() {
  const [count, setCount] = createSignal(0)
  return (
    <>
      <h1>Hello</h1>
      <button onClick={() => setCount((prev) => prev + 1)}>count: {count()}</button>
    </>
  )
}

const root = document.getElementById('root')!
render(() => <App />, root)
