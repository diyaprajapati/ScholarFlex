import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRoutes from './config/routes'
import { SidebarProvider } from './contexts/SidebarContext'
import PageTracker from './analytics/PageTracker'
import UserTracker from './analytics/UserTracker'
import AuthWatcher from './components/AuthWatcher'

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <SidebarProvider>
          <AuthWatcher />
          <UserTracker />
          <PageTracker />
          <AppRoutes />
        </SidebarProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
