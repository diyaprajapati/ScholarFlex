import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRoutes from './config/routes'

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  )
}

export default App
