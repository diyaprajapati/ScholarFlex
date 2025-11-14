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
            setIsAuthenticated(true)
            setUser(response.user)
          } else {
            // Token might be invalid, clear it
            authService.logout()
            setIsAuthenticated(false)
            setUser(null)
          }
        } catch (error) {
          // Token is invalid or expired, clear it
          authService.logout()
          setIsAuthenticated(false)
          setUser(null)
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

