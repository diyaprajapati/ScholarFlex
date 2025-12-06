import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../utils/auth'
import { ROUTES } from '../config/paths'

export default function ProtectedRoute({ children, allowedRoles = null, requireSelected = false }) {
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
      if (role === 'STUDENT') {
        // Student should be redirected to student instructions
        return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
      } else {
        return <Navigate to={ROUTES.DASHBOARD} replace />
      }
    }

    // Check if student needs to be selected
    if (requireSelected && userRole === 'STUDENT') {
      const user = authService.getUser()
      if (!user?.is_selected) {
        // Student is not selected, redirect to test instructions page
        return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
      }
    }
  }

  return children
}

