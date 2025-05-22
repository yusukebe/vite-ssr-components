import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)
  return (
    <>
      <h1>Hello</h1>
      <button onClick={() => setCount(count + 1)}>count: {count}</button>
    </>
  )
}

export default App
