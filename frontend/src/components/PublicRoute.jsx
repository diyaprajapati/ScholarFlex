import React from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../utils/auth'
import { ROUTES } from '../config/paths'

export default function PublicRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated()

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}

