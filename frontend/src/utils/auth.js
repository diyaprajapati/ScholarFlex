// Auth utility functions for localStorage - stores only JWT token

const TOKEN_KEY = 'scholarflex_token'

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

export const authService = {
  // Store JWT token only
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token)
  },

  // Get JWT token
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY)
  },

  // Remove JWT token
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
  },

  // Check if user is authenticated (has valid token)
  isAuthenticated: () => {
    const token = authService.getToken()
    if (!token) {
      return false
    }
    // Check if token is expired
    if (isTokenExpired(token)) {
      authService.logout()
      return false
    }
    return true
  },

  // Get user data from token
  getUser: () => {
    const token = authService.getToken()
    if (!token) {
      return null
    }
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      authService.logout()
      return null
    }

    const decoded = decodeToken(token)
    if (!decoded) {
      return null
    }

    return {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }
  },

  // Get user role from token
  getUserRole: () => {
    const user = authService.getUser()
    return user?.role || null
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

  // Check if user is student
  isStudent: () => {
    return authService.getUserRole() === 'STUDENT'
  },
}

