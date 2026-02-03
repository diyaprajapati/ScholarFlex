import React, { useRef, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '../utils/auth'
import { ROUTES } from '../config/paths'

export default function ProtectedRoute({ children, allowedRoles = null, requireSelected = false }) {
  const isAuthenticated = authService.isAuthenticated()
  const isOpenStudent = authService.isOpenStudent()
  const isAnyAuthenticated = isAuthenticated || isOpenStudent
  const location = useLocation()
  const hasNavigated = useRef(false)
  const lastPathname = useRef(location.pathname)
  const [profileCompletionChecked, setProfileCompletionChecked] = useState(false)
  const [isProfileCompleted, setIsProfileCompleted] = useState(false)

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

  // Check profile completion for selected students
  useEffect(() => {
    if (isAuthenticated && authService.getUserRole() === 'STUDENT') {
      const user = authService.getUser()
      
      // Only check for selected students (check both when not on form and when on form)
      if (user?.is_selected && !profileCompletionChecked) {
        const checkProfileCompletion = async () => {
          try {
            const api = (await import('../services/api')).default
            const response = await api.studentProfile.checkCompletion()
            if (response.success) {
              setIsProfileCompleted(response.isCompleted)
              setProfileCompletionChecked(true)
            }
          } catch (error) {
            console.error('Error checking profile completion:', error)
            // If error, assume not completed to be safe
            setIsProfileCompleted(false)
            setProfileCompletionChecked(true)
          }
        }
        
        checkProfileCompletion()
      }
    }
  }, [isAuthenticated, profileCompletionChecked, location.pathname])

  // Check authentication (either JWT token or open student session)
  if (!isAnyAuthenticated) {
    // For open student routes, redirect to registration
    if (location.pathname.startsWith('/student/')) {
      if (location.pathname !== ROUTES.STUDENT.OPEN.REGISTER && !hasNavigated.current) {
        hasNavigated.current = true
        return <Navigate to={ROUTES.STUDENT.OPEN.REGISTER} replace />
      }
      return null
    }
    // For admin routes, redirect to login
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
    
    // Check profile completion for selected students
    if (user?.is_selected && (user?.email || user?.id)) {
      // Wait for profile check to complete
      if (!profileCompletionChecked) {
        return null // Show loading state
      }
      
      // If not on form page and profile is not completed, redirect to form page
      // (But allow access to form even after completion for viewing/editing)
      if (location.pathname !== ROUTES.STUDENT.FORM && !isProfileCompleted) {
        if (!hasNavigated.current) {
          hasNavigated.current = true
          return <Navigate to={ROUTES.STUDENT.FORM} replace />
        }
        return null
      }
      // Note: We no longer redirect away from form page if profile is completed
      // Students can now access the form to view/edit their profile anytime
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
      } else if (userRole === 'OPEN_STUDENT') {
        // Open students can access dashboard, playlists, and videos
        const allowedOpenStudentRoutes = [
          ROUTES.STUDENT.DASHBOARD_TABS.DASHBOARD,
          ROUTES.STUDENT.DASHBOARD_TABS.PLAYLISTS,
        ]
        const isVideoRoute = location.pathname.startsWith('/student/video/')
        const isAllowedRoute = allowedOpenStudentRoutes.includes(location.pathname) || isVideoRoute
        
        if (!isAllowedRoute && !hasNavigated.current) {
          hasNavigated.current = true
          return <Navigate to={ROUTES.STUDENT.DASHBOARD_TABS.DASHBOARD} replace />
        }
        return null
      } else {
        // Admin/Super Admin
        if (userRole === 'ADMIN') {
          // Admin users can only access Evaluations, Student Analytics, and Open Student Analytics
          if (location.pathname !== ROUTES.EVALUATION_MANAGEMENT && !hasNavigated.current) {
            hasNavigated.current = true
            return <Navigate to={ROUTES.EVALUATION_MANAGEMENT} replace />
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

