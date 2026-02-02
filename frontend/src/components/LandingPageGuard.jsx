import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../utils/auth'
import { ROUTES } from '../config/paths'

/**
 * LandingPageGuard - Prevents authenticated users from accessing the landing page
 * Redirects them to their appropriate dashboard based on role
 */
export default function LandingPageGuard({ children }) {
  const [redirectPath, setRedirectPath] = useState(null)
  const isAuthenticated = authService.isAuthenticated()

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    // Clear browser history stack for authenticated users trying to access landing page
    authService.clearHistoryStack()

    const role = authService.getUserRole()
    
    // For admins, redirect immediately (no async needed)
    if (role === 'ADMIN') {
      // Admin users can only access Evaluations, Student Analytics, and Open Student Analytics
      setRedirectPath(ROUTES.EVALUATION_MANAGEMENT)
      return
    }
    if (role === 'SUPER_ADMIN') {
      setRedirectPath(ROUTES.DASHBOARD)
      return
    }

    // For students, check selection status and profile completion
    if (role === 'STUDENT') {
      const checkAndRedirect = async () => {
        const user = authService.getUser()
        
        // Only selected students need to complete the profile form
        if (user?.is_selected) {
          // Check profile completion from database
          try {
            const api = (await import('../services/api')).default
            const response = await api.studentProfile.checkCompletion()
            if (response.success) {
              if (response.isCompleted) {
                // Profile completed, redirect to dashboard
                setRedirectPath(ROUTES.STUDENT.DASHBOARD)
              } else {
                // Profile not completed, redirect to form page (only for selected students)
                setRedirectPath(ROUTES.STUDENT.FORM)
              }
            } else {
              // Error checking, redirect to form to be safe
              setRedirectPath(ROUTES.STUDENT.FORM)
            }
          } catch (error) {
            console.error('Error checking profile completion:', error)
            // Error checking, redirect to form to be safe
            setRedirectPath(ROUTES.STUDENT.FORM)
          }
        } else {
          // Non-selected students go directly to instructions page
          setRedirectPath(ROUTES.STUDENT.INSTRUCTIONS)
        }
      }

      checkAndRedirect()
    } else {
      // Fallback - should not reach here
      setRedirectPath(ROUTES.LOGIN)
    }
  }, [isAuthenticated])

  // If not authenticated, show landing page
  if (!isAuthenticated) {
    return children
  }

  // If we have a redirect path, navigate there
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />
  }

  // Show landing page while determining redirect (should be very brief)
  return children
}

