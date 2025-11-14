import { useState, useEffect } from 'react'
import { authService } from '../utils/auth'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated()
      const userData = authenticated ? authService.getUser() : null
      setIsAuthenticated(authenticated)
      setUser(userData)
      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = (userData) => {
    authService.login(userData)
    setIsAuthenticated(true)
    setUser(userData)
  }

  const logout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
  }

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  }
}

