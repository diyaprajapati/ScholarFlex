import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../utils/auth'
import { ROUTES } from '../config/paths'

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const isAuthenticated = authService.isAuthenticated()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = authService.getUserRole()
    if (!allowedRoles.includes(userRole)) {
      // Redirect to appropriate page based on role
      const role = authService.getUserRole()
      if (role === 'student') {
        // Student should be redirected to student dashboard (to be created)
        return <Navigate to={ROUTES.DASHBOARD} replace />
      } else {
        return <Navigate to={ROUTES.DASHBOARD} replace />
      }
    }
  }

  return children
}

