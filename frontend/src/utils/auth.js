// Auth utility functions for localStorage - stores JWT token and user data

const TOKEN_KEY = 'scholarflex_token'
const USER_KEY = 'scholarflex_user'
const OPEN_STUDENT_TOKEN_KEY = 'open_student_token'
const OPEN_STUDENT_DATA_KEY = 'open_student_data'

/** Session expired flag for login page message (sessionStorage) */
export const SESSION_EXPIRED_KEY = 'scholarflex_session_expired'

/**
 * Decode JWT token to get payload (without verification)
 * Note: This is only for reading token data on client side
 */
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return true
  }
  const currentTime = Math.floor(Date.now() / 1000)
  return decoded.exp < currentTime
}

/**
 * Get token expiry time in seconds (Unix). Returns null if no token or no exp.
 * Used by AuthWatcher for proactive logout.
 */
const getTokenExpirySeconds = (token) => {
  const decoded = decodeToken(token)
  return decoded?.exp ?? null
}

export const authService = {
  // Store JWT token and user data
  setToken: (token, userData = null) => {
    try {
      if (!token) {
        console.error('setToken called with empty token')
        throw new Error('Token is required')
      }
      
      localStorage.setItem(TOKEN_KEY, token)
      
      // Verify token was stored
      const storedToken = localStorage.getItem(TOKEN_KEY)
      if (storedToken !== token) {
        console.error('Token storage verification failed', { expected: token, stored: storedToken })
        throw new Error('Failed to verify token storage')
      }
      
      if (userData) {
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
        
        // Verify user data was stored
        const storedUser = localStorage.getItem(USER_KEY)
        if (!storedUser) {
          console.error('User data storage verification failed')
          throw new Error('Failed to verify user data storage')
        }
      }
      
      // console.log('Token and user data stored successfully')
    } catch (error) {
      console.error('Error storing token/user data:', error)
      // Check if localStorage is available
      if (typeof Storage === 'undefined') {
        throw new Error('localStorage is not available in this browser')
      }
      throw error
    }
  },

  // Get JWT token
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY)
  },

  // Remove JWT token and user data
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    authService.removeHistoryPrevention()
  },

  /**
   * Mark that session expired (so login page can show "Session expired").
   * Call before logout() when doing automatic logout due to expiry.
   */
  setSessionExpiredMessage: () => {
    try {
      sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true')
    } catch (_) {}
  },

  /**
   * Get and clear session-expired flag. Returns true if session had expired.
   */
  getAndClearSessionExpired: () => {
    try {
      const value = sessionStorage.getItem(SESSION_EXPIRED_KEY)
      sessionStorage.removeItem(SESSION_EXPIRED_KEY)
      return value === 'true'
    } catch (_) {
      return false
    }
  },

  /**
   * Returns token expiry (Unix seconds) or null. For proactive expiry check.
   */
  getTokenExpirySeconds: () => {
    const token = authService.getToken()
    if (!token) return null
    return getTokenExpirySeconds(token)
  },

  // Check if user is authenticated (has access token; may be expired — refresh flow will extend session)
  isAuthenticated: () => {
    const token = authService.getToken()
    return !!token
  },

  // Get user data from stored user object or token.
  // Does NOT logout when access token is expired; API layer will 401 → refresh → retry or logout on refresh failure.
  getUser: () => {
    const storedUser = localStorage.getItem(USER_KEY)
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        const token = authService.getToken()
        // Prefer stored user when we have a token (expired or not; refresh flow handles expiry)
        if (token) return user
      } catch (e) {
        // Invalid stored user, fall through
      }
    }

    const token = authService.getToken()
    if (!token) return null

    const decoded = decodeToken(token)
    if (!decoded) return null

    return {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }
  },

  // Get user role from token or open student session
  getUserRole: () => {
    // First check for regular JWT token (intern/regular student)
    const user = authService.getUser()
    if (user?.role) {
      return user.role
    }
    
    // Check for open student session token
    const openToken = localStorage.getItem(OPEN_STUDENT_TOKEN_KEY)
    if (openToken) {
      return 'OPEN_STUDENT'
    }
    
    return null
  },

  // Check if user is admin or super admin
  isAdmin: () => {
    const role = authService.getUserRole()
    return role === 'ADMIN' || role === 'SUPER_ADMIN'
  },

  // Check if user is super admin
  isSuperAdmin: () => {
    return authService.getUserRole() === 'SUPER_ADMIN'
  },

  // Check if user is student (regular intern)
  isStudent: () => {
    return authService.getUserRole() === 'STUDENT'
  },

  // Check if user is open student
  isOpenStudent: () => {
    return authService.getUserRole() === 'OPEN_STUDENT'
  },

  // Check if user is any type of student (regular or open)
  isAnyStudent: () => {
    const role = authService.getUserRole()
    return role === 'STUDENT' || role === 'OPEN_STUDENT'
  },

  // Update user data in localStorage
  updateUser: (userData) => {
    const storedUser = localStorage.getItem(USER_KEY)
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        const updatedUser = { ...user, ...userData }
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
        return updatedUser
      } catch (e) {
        console.error('Error updating user data:', e)
        return null
      }
    }
    return null
  },

  // Clear browser history stack to prevent back navigation to public pages
  // This should be called after successful login to prevent users from going back
  clearHistoryStack: () => {
    try {
      // Remove any existing listener first
      if (window._preventBackListener) {
        window.removeEventListener('popstate', window._preventBackListener)
      }
      
      // Replace current history entry to clear previous entries
      // This creates a fresh history state starting from the current page
      window.history.replaceState(null, '', window.location.href)
      
      // Push a new state to create a fresh history entry
      // This ensures the current page is the "first" page in the history stack
      window.history.pushState(null, '', window.location.href)
      
      // Add popstate listener to prevent back navigation to public pages
      const preventBack = (e) => {
        const currentPath = window.location.pathname
        const publicRoutes = ['/', '/login']
        
        // If trying to navigate to a public route while authenticated, prevent it
        if (authService.isAuthenticated() && publicRoutes.includes(currentPath)) {
          // Push current state again to prevent going back
          window.history.pushState(null, '', window.location.href)
          // Force navigation to appropriate dashboard using window.location
          const role = authService.getUserRole()
          if (role === 'STUDENT') {
            window.location.href = '/student/dashboard'
          } else if (role === 'ADMIN') {
            // Admin users can only access Evaluations, Student Analytics, and Open Student Analytics
            window.location.href = '/evaluation-management'
          } else if (role === 'SUPER_ADMIN') {
            window.location.href = '/dashboard'
          }
        } else {
          // For other routes, allow normal navigation but limit history depth
          // If history is getting too long, replace current entry
          if (window.history.length > 10) {
            window.history.replaceState(null, '', window.location.href)
          }
        }
      }
      
      // Add new listener
      window.addEventListener('popstate', preventBack)
      
      // Store the listener so we can remove it on logout
      window._preventBackListener = preventBack
    } catch (error) {
      console.error('Error clearing history stack:', error)
    }
  },

  // Remove history prevention (should be called on logout)
  removeHistoryPrevention: () => {
    try {
      if (window._preventBackListener) {
        window.removeEventListener('popstate', window._preventBackListener)
        delete window._preventBackListener
      }
      if (window._preventHashBackListener) {
        window.removeEventListener('hashchange', window._preventHashBackListener)
        delete window._preventHashBackListener
      }
    } catch (error) {
      console.error('Error removing history prevention:', error)
    }
  },
}

