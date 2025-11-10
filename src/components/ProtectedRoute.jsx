import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../utils/auth'

export default function ProtectedRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

