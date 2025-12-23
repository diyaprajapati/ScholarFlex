import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRoutes from './config/routes'
import { SidebarProvider } from './contexts/SidebarContext'

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <SidebarProvider>
          <AppRoutes />
        </SidebarProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
