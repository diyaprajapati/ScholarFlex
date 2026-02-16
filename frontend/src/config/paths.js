/**
 * Application Route Paths
 * Centralized route definitions for consistent navigation across the app
 */

export const ROUTES = {
  // Public Routes
  LANDING: '/',
  LOGIN: '/login',
  CANDIDATE_REGISTER: '/register',

  // Protected Routes
  DASHBOARD: '/dashboard',
  TEST_ATTEMPTS: '/test-attempts',
  ADMIN_MANAGEMENT: '/admin-management',
  SETTINGS: '/settings',
  NOC_MANAGEMENT: '/noc-management',
  FEEDBACK_MANAGEMENT: '/feedback-management',
  STUDENT_ANALYTICS: '/student-analytics',
  OPEN_STUDENT_ANALYTICS: '/open-student-analytics',
  FIREBASE_ANALYTICS: '/firebase-analytics',
  TIMER_LOGS: '/timer-logs',
  VIDEO_ANALYTICS: '/video-analytics',
  RETEST_MANAGEMENT: '/retest-management',
  INTERNSHIP_STATUS: '/internship-status',
  PROJECT_MANAGEMENT: '/project-management',
  EVALUATION_MANAGEMENT: '/evaluation-management',
  DOMAIN_MANAGEMENT: '/domain-management',
  INSTITUTE_MANAGEMENT: '/institute-management',

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
    DASHBOARD: '/student/dashboard',
    DASHBOARD_TABS: {
      DASHBOARD: '/student/dashboard',
      PLAYLISTS: '/student/playlists',
      ACTIVITY: '/student/activity',
      INTERNSHIP: '/student/internship',
      NOC: '/student/noc',
    },
    INSTRUCTIONS: '/student/instructions',
    TEST: '/student/test',
    SUBMISSION: '/student/submission',
    VIDEO: (videoId) => `/student/video/${videoId}`,
    VIDEO_ANALYTICS: '/student/video-analytics',
    FEEDBACK: '/student/feedback',
    FORM: '/student/form',
    // Open student routes
    OPEN: {
      BASE: '/student/open',
      REGISTER: '/student/open/register',
      DASHBOARD: '/student/open',
      PLAYLISTS: '/student/open/playlists',
      DEMO: '/student/open/demo',
      VIDEO: (videoId) => `/student/open/video/${videoId}`,
    },
    // Intern routes (full access)
    INTERN: {
      BASE: '/student/intern',
      DASHBOARD: '/student/intern/dashboard',
      PLAYLISTS: '/student/intern/playlists',
      ACTIVITY: '/student/intern/activity',
      INTERNSHIP: '/student/intern/internship',
      VIDEO_ANALYTICS: '/student/intern/video-analytics',
      PROFILE: '/student/intern/profile',
      NOC: '/student/intern/noc',
    },
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

