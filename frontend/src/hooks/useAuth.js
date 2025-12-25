import { useState, useEffect } from 'react'
import { authService } from '../utils/auth'
import { api } from '../services/api'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = authService.isAuthenticated()
      
      if (authenticated) {
        // Try to get user data from token
        const userData = authService.getUser()
        
        // Optionally verify token with backend
        try {
          const response = await api.auth.getCurrentUser()
          if (response.success && response.user) {
            // Merge backend flags like is_selected and can_retest into stored user
            const mergedUser = {
              ...(userData || {}),
              is_selected: response.user.is_selected,
              can_retest: response.user.can_retest,
            }
            authService.updateUser({
              is_selected: response.user.is_selected,
              can_retest: response.user.can_retest,
            })
            setIsAuthenticated(true)
            setUser(mergedUser)
          } else {
            // Token might be invalid, clear it
            authService.logout()
            setIsAuthenticated(false)
            setUser(null)
          }
        } catch (error) {
          // Check if this is an authentication error (401) or network/server error
          const statusCode = error.status || (error.message && error.message.match(/\b(401|403|500|502|503|504)\b/)?.[1])
          const isAuthError = statusCode === 401 || 
                             (error.message && (
                               error.message.includes('Unauthorized') ||
                               error.message.includes('Invalid token') ||
                               error.message.includes('Token expired')
                             ))
          
          // Check if it's a network error (no response from server - server restart, network issue, etc.)
          const isNetworkError = error.isNetworkError || 
                                 (!statusCode && (
                                   error.message && (
                                     error.message.includes('Failed to fetch') ||
                                     error.message.includes('NetworkError') ||
                                     error.message.includes('Network request failed')
                                   ) ||
                                   error.name === 'TypeError'
                                 ))
          
          // Only logout if it's an actual authentication error (401)
          // For network/server errors (server restart, 500, 502, 503, etc.), keep the session
          if (isAuthError) {
            // Token is invalid or expired, clear it
            authService.logout()
            setIsAuthenticated(false)
            setUser(null)
          } else if (isNetworkError || (statusCode && statusCode >= 500)) {
            // Server is down or network error - keep the session using locally stored data
            // User can continue using the app, and we'll retry when server is back
            setIsAuthenticated(true)
            setUser(userData)
            // Only log in development to avoid console spam
            if (process.env.NODE_ENV === 'development') {
              console.warn('Server unavailable, using cached session:', error.message || 'Network error')
            }
          } else {
            // Other errors (403, etc.) - keep session but don't update user data
            setIsAuthenticated(true)
            setUser(userData)
          }
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
      
      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = (token) => {
    authService.setToken(token)
    const userData = authService.getUser()
    setIsAuthenticated(true)
    setUser(userData)
  }

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await api.auth.logout()
    } catch (error) {
      // Even if logout fails, clear local token
      console.error('Logout error:', error)
    } finally {
      authService.logout()
      setIsAuthenticated(false)
      setUser(null)
    }
  }

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  }
}

