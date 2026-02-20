import React, { useRef, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '../utils/auth'
import { ROUTES } from '../config/paths'

export default function ProtectedRoute({ children, allowedRoles = null, requireSelected = false }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated())
  const [isOpenStudent, setIsOpenStudent] = useState(() => authService.isOpenStudent())
  const isAnyAuthenticated = isAuthenticated || isOpenStudent
  const location = useLocation()
  const hasNavigated = useRef(false)
  const lastPathname = useRef(location.pathname)
  
  // Initialize profile completion state from localStorage if available
  // Use function initializer to only compute once on mount
  const getInitialProfileState = () => {
    const currentAuth = authService.isAuthenticated()
    if (currentAuth && authService.getUserRole() === 'STUDENT') {
      const user = authService.getUser()
      if (user?.is_selected && user?.profileCompleted !== undefined) {
        return { checked: true, completed: user.profileCompleted }
      }
    }
    return { checked: false, completed: false }
  }
  
  const initialProfileState = getInitialProfileState()
  const [profileCompletionChecked, setProfileCompletionChecked] = useState(initialProfileState.checked)
  const [isProfileCompleted, setIsProfileCompleted] = useState(initialProfileState.completed)
  
  // Update profile completion state when authentication changes
  useEffect(() => {
    if (isAuthenticated && authService.getUserRole() === 'STUDENT') {
      const user = authService.getUser()
      if (user?.is_selected && user?.profileCompleted !== undefined) {
        setProfileCompletionChecked(true)
        setIsProfileCompleted(user.profileCompleted)
      }
    }
  }, [isAuthenticated])

  // Reset navigation flag when pathname changes
  useEffect(() => {
    if (lastPathname.current !== location.pathname) {
      hasNavigated.current = false
      lastPathname.current = location.pathname
    }
  }, [location.pathname])


  // Listen for authentication changes (token stored in other tabs, or token expiry)
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(authService.isAuthenticated())
      setIsOpenStudent(authService.isOpenStudent())
    }

    checkAuth()

    const handleStorageChange = (e) => {
      if (e.key === 'scholarflex_token' || e.key === 'open_student_token') {
        checkAuth()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth()
      }
    }

    const handleFocus = () => {
      checkAuth()
    }

    // Periodic check so expired JWT updates auth state (AuthWatcher will redirect; this keeps UI in sync)
    const AUTH_CHECK_INTERVAL_MS = 60 * 1000
    const intervalId = setInterval(checkAuth, AUTH_CHECK_INTERVAL_MS)

    window.addEventListener('storage', handleStorageChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

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
      
      // Only check for selected students
      if (user?.is_selected) {
        // First, sync with localStorage to ensure we have latest cached status
        const cachedStatus = user?.profileCompleted
        if (cachedStatus !== undefined) {
          setIsProfileCompleted(cachedStatus)
          setProfileCompletionChecked(true)
        } else {
          // If no cached status, mark as checked with false to allow navigation
          setIsProfileCompleted(false)
          setProfileCompletionChecked(true)
        }
        
        const checkProfileCompletion = async () => {
          try {
            const api = (await import('../services/api')).default
            const response = await api.studentProfile.checkCompletion()
            if (response.success) {
              const newCompletionStatus = response.isCompleted
              setIsProfileCompleted(newCompletionStatus)
              setProfileCompletionChecked(true)
              
              // Always update localStorage to keep it in sync
              const currentUser = authService.getUser()
              if (currentUser?.profileCompleted !== newCompletionStatus) {
                authService.updateUser({ profileCompleted: newCompletionStatus })
              }
            } else {
              // API call succeeded but returned error, use cached status
              const currentUser = authService.getUser()
              const cachedStatus = currentUser?.profileCompleted
              setIsProfileCompleted(cachedStatus !== undefined ? cachedStatus : false)
              setProfileCompletionChecked(true)
            }
          } catch (error) {
            console.error('Error checking profile completion:', error)
            // If error, use cached status from localStorage if available
            const currentUser = authService.getUser()
            const cachedStatus = currentUser?.profileCompleted
            if (cachedStatus !== undefined) {
              setIsProfileCompleted(cachedStatus)
            } else {
              // If no cached status, assume not completed to be safe
              setIsProfileCompleted(false)
            }
            // Always mark as checked so we don't get stuck
            setProfileCompletionChecked(true)
          }
        }
        
        // Check immediately (will update if cached status was wrong)
        // Only check if we don't have cached status, or check in background
        if (cachedStatus === undefined) {
          checkProfileCompletion()
        } else {
          // We have cached status, check in background to update if needed
          checkProfileCompletion()
        }
        
        // Also set up periodic check to detect changes from other tabs or database updates
        const intervalId = setInterval(checkProfileCompletion, 5000) // Check every 5 seconds
        return () => clearInterval(intervalId)
      } else {
        // Not selected, mark as checked to avoid blank page
        setProfileCompletionChecked(true)
        setIsProfileCompleted(false)
      }
    } else {
      // Not a student, mark as checked to avoid blank page
      setProfileCompletionChecked(true)
      setIsProfileCompleted(false)
    }
  }, [isAuthenticated, location.pathname])

  // Listen for storage events to detect profile completion changes from other tabs
  useEffect(() => {
    if (isAuthenticated && authService.getUserRole() === 'STUDENT') {
      const handleStorageChange = (e) => {
        // Check if profile completion changed
        if (e.key === 'profile_completion_changed' && e.newValue) {
          try {
            const eventData = JSON.parse(e.newValue)
            if (eventData.profileCompleted !== undefined) {
              // console.log('Profile completion changed via storage event:', eventData.profileCompleted)
              setIsProfileCompleted(eventData.profileCompleted)
              setProfileCompletionChecked(true)
              // Update user data in localStorage
              authService.updateUser({ profileCompleted: eventData.profileCompleted })
            }
          } catch (error) {
            console.error('Error parsing storage event:', error)
          }
        }
        
        // Also check if user data was updated directly
        if (e.key === 'scholarflex_user' && e.newValue) {
          try {
            const updatedUser = JSON.parse(e.newValue)
            if (updatedUser.profileCompleted !== undefined) {
              // console.log('Profile completion changed via user data update:', updatedUser.profileCompleted)
              setIsProfileCompleted(updatedUser.profileCompleted)
              setProfileCompletionChecked(true)
            }
          } catch (error) {
            console.error('Error parsing user data:', error)
          }
        }
      }
      
      // Also listen for custom events (for same-tab updates)
      const handleCustomEvent = () => {
        const user = authService.getUser()
        if (user?.profileCompleted !== undefined) {
          // console.log('Profile completion changed via custom event:', user.profileCompleted)
          setIsProfileCompleted(user.profileCompleted)
          setProfileCompletionChecked(true)
        }
      }
      
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('profileCompletionChanged', handleCustomEvent)
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('profileCompletionChanged', handleCustomEvent)
      }
    }
  }, [isAuthenticated])
  
  // Also check localStorage periodically for profile completion changes (same-tab updates)
  useEffect(() => {
    if (isAuthenticated && authService.getUserRole() === 'STUDENT') {
      const checkProfileStatus = () => {
        const user = authService.getUser()
        if (user?.is_selected && user?.profileCompleted !== undefined) {
          // Check if state needs updating
          const currentState = isProfileCompleted
          const localStorageState = user.profileCompleted
          if (currentState !== localStorageState) {
            // console.log('Profile completion status changed in localStorage:', {
            //   from: currentState,
            //   to: localStorageState,
            //   pathname: location.pathname
            // })
            setIsProfileCompleted(localStorageState)
            setProfileCompletionChecked(true)
          }
        }
      }
      
      // Check immediately
      checkProfileStatus()
      
      // Check periodically (more frequent to catch changes quickly)
      const interval = setInterval(checkProfileStatus, 500)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, isProfileCompleted, location.pathname])

  // Check authentication (either JWT token or open student session)
  if (!isAnyAuthenticated) {
    // For open student routes, redirect to registration
    if (location.pathname.startsWith('/student/')) {
      if (location.pathname !== ROUTES.STUDENT.OPEN.REGISTER) {
        return <Navigate to={ROUTES.STUDENT.OPEN.REGISTER} replace />
      }
      // Already on registration page, show loading
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      )
    }
    // For admin routes, redirect to login
    if (location.pathname !== ROUTES.LOGIN) {
      return <Navigate to={ROUTES.LOGIN} replace />
    }
    // Already on login page, show loading
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
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
        // Always navigate - don't use hasNavigated flag to prevent loops
        return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
      }
    }
    
    // Check profile completion for selected students
    if (user?.is_selected && (user?.email || user?.id)) {
      // Wait for profile check to complete (but we've initialized from localStorage, so this should be quick)
      if (!profileCompletionChecked) {
        // Debug: Log why we're showing loading
        // console.log('Profile completion not checked yet', {
        //   isAuthenticated,
        //   userRole,
        //   isSelected: user?.is_selected,
        //   profileCompleted: user?.profileCompleted,
        //   stateProfileCompleted: isProfileCompleted
        // })
        // Show loading indicator instead of blank screen
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        )
      }
      
      // Debug: Log current state
      // console.log('Profile completion check:', {
      //   pathname: location.pathname,
      //   isProfileCompleted,
      //   cachedProfileCompleted: user?.profileCompleted,
      //   profileCompletionChecked
      // })
      
      // If not on form page and profile is not completed, redirect to form page
      // (But allow access to form even after completion for viewing/editing)
      if (location.pathname !== ROUTES.STUDENT.FORM && !isProfileCompleted) {
        // console.log('Redirecting to form - profile not completed')
        // Always navigate - don't use hasNavigated flag to prevent loops
        return <Navigate to={ROUTES.STUDENT.FORM} replace />
      }
      
      // If profile is completed, allow access to all student routes
      // Note: We no longer redirect away from form page if profile is completed
      // Students can now access the form to view/edit their profile anytime
      if (isProfileCompleted) {
        // console.log('Profile completed - allowing access to:', location.pathname)
        // Profile is completed, user can access any student route
        // No redirect needed - they can navigate freely
      }
    } else if (user?.is_selected === false) {
      // User is not selected, but we already handled that above
      // This is just for clarity
    }
    if (user?.internship_end_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = new Date(user.internship_end_date)
      endDate.setHours(23, 59, 59, 999)
      
      // Only redirect to feedback if internship has ended AND not already on feedback page
      if (today > endDate && location.pathname !== ROUTES.STUDENT.FEEDBACK) {
        // Redirect to feedback page if internship has ended
        return <Navigate to={ROUTES.STUDENT.FEEDBACK} replace />
      }
      
      // If internship hasn't ended but trying to access feedback page, redirect away
      if (today <= endDate && location.pathname === ROUTES.STUDENT.FEEDBACK) {
        return <Navigate to={ROUTES.STUDENT.DASHBOARD} replace />
      }
    } else {
      // No internship end date, redirect away from feedback page
      if (location.pathname === ROUTES.STUDENT.FEEDBACK) {
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
        if (location.pathname !== ROUTES.STUDENT.INSTRUCTIONS) {
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
        
        if (!isAllowedRoute) {
          return <Navigate to={ROUTES.STUDENT.DASHBOARD_TABS.DASHBOARD} replace />
        }
        return null
      } else {
        // Admin/Super Admin
        if (userRole === 'ADMIN') {
          // Admin users can only access Evaluations, Student Analytics, and Open Student Analytics
          if (location.pathname !== ROUTES.EVALUATION_MANAGEMENT) {
            return <Navigate to={ROUTES.EVALUATION_MANAGEMENT} replace />
          }
          return null
        } else {
          if (location.pathname !== ROUTES.DASHBOARD) {
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
        if (location.pathname !== ROUTES.STUDENT.INSTRUCTIONS) {
          return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
        }
        return null
      }
    }
  }

  return children
}

