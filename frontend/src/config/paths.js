/**
 * Application Route Paths
 * Centralized route definitions for consistent navigation across the app
 */

export const ROUTES = {
  // Public Routes
  LOGIN: '/',
  
  // Protected Routes
  DASHBOARD: '/dashboard',
  TEST_ATTEMPTS: '/test-attempts',
  ADMIN_MANAGEMENT: '/admin-management',
  RETAKE_PERMISSIONS: '/retake-permissions',
  
  // Question Papers Routes
  QUESTION_PAPERS: {
    BASE: '/question-papers',
    LIST: '/question-papers',
    ADD: '/question-papers/add',
    EDIT: (id) => `/question-papers/edit/${id}`,
    VIEW: (id) => `/question-papers/view/${id}`,
  },
  
  // Interns Routes
  INTERNS: {
    BASE: '/interns',
    ADD: '/interns/add',
    VIEW: '/interns/view',
  },
  
  // Playlist Routes
  PLAYLISTS: {
    BASE: '/playlists',
    MANAGEMENT: '/playlists/management',
    ADD_VIDEOS: '/playlists/add-videos',
  },
  
  // Student Routes
  STUDENT: {
    BASE: '/student',
    INSTRUCTIONS: '/student/instructions',
    TEST: '/student/test',
    SUBMISSION: '/student/submission',
  },
}

/**
 * Helper function to check if a path matches a route pattern
 */
export const isActiveRoute = (currentPath, routePath) => {
  if (typeof routePath === 'function') {
    return false // Dynamic routes need special handling
  }
  return currentPath === routePath || currentPath.startsWith(routePath + '/')
}

