// Auth utility functions for localStorage

const AUTH_KEY = 'scholarflex_auth'
const USER_KEY = 'scholarflex_user'

export const authService = {
  // Store user data and authentication status
  login: (userData) => {
    localStorage.setItem(AUTH_KEY, 'true')
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
  },

  // Remove user data and authentication status
  logout: () => {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(USER_KEY)
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return localStorage.getItem(AUTH_KEY) === 'true'
  },

  // Get current user data
  getUser: () => {
    const userData = localStorage.getItem(USER_KEY)
    return userData ? JSON.parse(userData) : null
  },

  // Get user role
  getUserRole: () => {
    const userData = authService.getUser()
    return userData?.role || null
  },

  // Check if user is admin or super admin
  isAdmin: () => {
    const role = authService.getUserRole()
    return role === 'admin' || role === 'superadmin'
  },

  // Check if user is super admin
  isSuperAdmin: () => {
    return authService.getUserRole() === 'superadmin'
  },

  // Check if user is student
  isStudent: () => {
    return authService.getUserRole() === 'student'
  },
}

