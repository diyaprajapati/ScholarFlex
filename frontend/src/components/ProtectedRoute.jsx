import React, { useRef, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '../utils/auth'
import { ROUTES } from '../config/paths'

export default function ProtectedRoute({ children, allowedRoles = null, requireSelected = false }) {
  const isAuthenticated = authService.isAuthenticated()
  const location = useLocation()
  const hasNavigated = useRef(false)
  const lastPathname = useRef(location.pathname)

  // Reset navigation flag when pathname changes
  useEffect(() => {
    if (lastPathname.current !== location.pathname) {
      hasNavigated.current = false
      lastPathname.current = location.pathname
    }
  }, [location.pathname])

  // Track if user is blocked from API access
  const isBlocked = useRef(false)

  // Check user status periodically for students (to detect selection status changes)
  useEffect(() => {
    if (isAuthenticated && authService.getUserRole() === 'STUDENT') {
      const user = authService.getUser()
      
      // Don't make API calls if user is blocked (not selected and has completed test)
      // This prevents unnecessary 403 errors
      if (isBlocked.current || (!user?.is_selected && !user?.can_retest)) {
        return
      }

      const checkUserStatus = async () => {
        // Skip if blocked
        if (isBlocked.current) {
          return
        }

        try {
          const api = (await import('../services/api')).default
          const response = await api.auth.getCurrentUser()
          if (response.success && response.user) {
            const currentUser = response.user
            const storedUser = authService.getUser()
            
            // If is_selected status changed, update localStorage
            if (storedUser && storedUser.is_selected !== currentUser.is_selected) {
              authService.updateUser({ is_selected: currentUser.is_selected })
              // Reset navigation flag to allow redirect
              hasNavigated.current = false
            }
          }
        } catch (error) {
          // Handle 403 error - student was deselected and can't access portal
          // This is expected behavior, not an actual error
          const errorMessage = error.message || error.toString() || ''
          if (errorMessage.includes('Access denied') && 
              (errorMessage.includes('not selected') || errorMessage.includes('evaluated'))) {
            // Mark as blocked to stop future API calls
            isBlocked.current = true
            
            const storedUser = authService.getUser()
            // Update user status to reflect they're not selected
            if (storedUser && storedUser.is_selected !== false) {
              authService.updateUser({ is_selected: false })
              // Reset navigation flag to allow redirect
              hasNavigated.current = false
            }
            // Don't log this as an error - it's expected behavior
            return
          }
          // Only log actual errors (network issues, etc.)
          // Skip logging if it's an access denied error
          if (!errorMessage.includes('Access denied')) {
            console.error('Error checking user status:', error)
          }
        }
      }

      // Check immediately and then every 10 seconds
      checkUserStatus()
      const intervalId = setInterval(checkUserStatus, 10000)
      return () => clearInterval(intervalId)
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    if (location.pathname !== ROUTES.LOGIN && !hasNavigated.current) {
      hasNavigated.current = true
      return <Navigate to={ROUTES.LOGIN} replace />
    }
    return null
  }

  // Check if student's internship has ended
  const userRole = authService.getUserRole()
  if (userRole === 'STUDENT') {
    const user = authService.getUser()
    
    // General check: Non-selected students should only access instructions, test, and submission pages
    // Redirect them away from other student pages (dashboard, form, videos, etc.)
    if (!user?.is_selected) {
      // Pages that non-selected students CAN access
      const allowedPagesForNonSelected = [
        ROUTES.STUDENT.INSTRUCTIONS,
        ROUTES.STUDENT.TEST,
        ROUTES.STUDENT.SUBMISSION,
      ]
      
      // Check if current path is an allowed page for non-selected students
      const isAllowedPage = allowedPagesForNonSelected.some(page => 
        location.pathname === page || 
        location.pathname.startsWith(page + '/')
      )
      
      // If not on an allowed page, redirect to instructions
      if (!isAllowedPage) {
        hasNavigated.current = true
        return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
      }
    }
    
    // Check if form has been completed (only for selected students and only if not already on form page)
    if (location.pathname !== ROUTES.STUDENT.FORM && (user?.email || user?.id)) {
      // Only selected students need to complete the form
      if (user?.is_selected) {
        const FORM_STORAGE_KEY = 'student_form_completed'
        const storageKey = `${FORM_STORAGE_KEY}_${user.email || user.id}`
        const formCompleted = localStorage.getItem(storageKey) === 'true'
        
        if (!formCompleted && location.pathname !== ROUTES.STUDENT.FORM) {
          // Form not completed, redirect to form page (only for selected students)
          if (!hasNavigated.current) {
            hasNavigated.current = true
            return <Navigate to={ROUTES.STUDENT.FORM} replace />
          }
          return null
        }
      }
    }
    if (user?.internship_end_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = new Date(user.internship_end_date)
      endDate.setHours(23, 59, 59, 999)
      
      // Only redirect to feedback if internship has ended AND not already on feedback page
      if (today > endDate && location.pathname !== ROUTES.STUDENT.FEEDBACK && !hasNavigated.current) {
        // Redirect to feedback page if internship has ended
        hasNavigated.current = true
        return <Navigate to={ROUTES.STUDENT.FEEDBACK} replace />
      }
      
      // If internship hasn't ended but trying to access feedback page, redirect away
      if (today <= endDate && location.pathname === ROUTES.STUDENT.FEEDBACK && !hasNavigated.current) {
        hasNavigated.current = true
        return <Navigate to={ROUTES.STUDENT.DASHBOARD} replace />
      }
    } else {
      // No internship end date, redirect away from feedback page
      if (location.pathname === ROUTES.STUDENT.FEEDBACK && !hasNavigated.current) {
        hasNavigated.current = true
        return <Navigate to={ROUTES.STUDENT.DASHBOARD} replace />
      }
    }
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      // Redirect to appropriate page based on role
      if (userRole === 'STUDENT') {
        // Student should be redirected to student instructions
        if (location.pathname !== ROUTES.STUDENT.INSTRUCTIONS && !hasNavigated.current) {
          hasNavigated.current = true
          return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
        }
        return null
      } else {
        if (location.pathname !== ROUTES.DASHBOARD && !hasNavigated.current) {
          hasNavigated.current = true
          return <Navigate to={ROUTES.DASHBOARD} replace />
        }
        return null
      }
    }

    // Check if student needs to be selected
    if (requireSelected && userRole === 'STUDENT') {
      const user = authService.getUser()
      if (!user?.is_selected) {
        // Student is not selected, redirect to test instructions page
        if (location.pathname !== ROUTES.STUDENT.INSTRUCTIONS && !hasNavigated.current) {
          hasNavigated.current = true
          return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
        }
        return null
      }
    }
  }

  return children
}

