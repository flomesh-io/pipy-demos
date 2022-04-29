// Step 1: Import React
import * as React from 'react'
import logo from '../images/flomesh.png'

// Step 2: Define your component
const IndexPage = () => {
  return (
    <main>
      <title>Sample Page</title>
      <h1>Hello world</h1>
      <img src={logo} width="150px"/>
    </main>
  )
}

// Step 3: Export your component
export default IndexPage