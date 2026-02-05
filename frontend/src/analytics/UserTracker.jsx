import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { setUserId, setUserProperties } from 'firebase/analytics'
import { analytics } from '../firebase'
import { authService } from '../utils/auth'

const UserTracker = () => {
  const location = useLocation()

  useEffect(() => {
    if (!analytics) return

    // Check if user is authenticated
    const user = authService.getUser()
    const isOpenStudent = authService.isOpenStudent()

    if (user) {
      try {
        // Set user ID for Firebase Analytics
        setUserId(analytics, `user_${user.id}`)
        
        // Set user properties
        setUserProperties(analytics, {
          user_role: user.role || 'UNKNOWN',
          user_type: 'authenticated',
          is_student: user.role === 'STUDENT' ? 'true' : 'false',
          is_admin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'true' : 'false'
        })

        if (import.meta.env.DEV) {
          // console.log('User ID set in Analytics:', `user_${user.id}`, 'Role:', user.role)
        }
      } catch (error) {
        console.error('Error setting user ID in Analytics:', error)
      }
    } else if (isOpenStudent) {
      // Handle open student (they might not have a user object)
      try {
        // For open students, we can use a session-based identifier
        const openToken = localStorage.getItem('open_student_token')
        if (openToken) {
          // Use a hash or session ID if available
          setUserId(analytics, `open_student_${Date.now()}`)
          setUserProperties(analytics, {
            user_role: 'OPEN_STUDENT',
            user_type: 'open_student'
          })
        }
      } catch (error) {
        console.error('Error setting open student in Analytics:', error)
      }
    } else {
      // User is not authenticated - clear user ID
      try {
        setUserId(analytics, null)
        if (import.meta.env.DEV) {
          // console.log('User logged out - Analytics user ID cleared')
        }
      } catch (error) {
        console.error('Error clearing user ID in Analytics:', error)
      }
    }
  }, [location.pathname]) // Update when route changes (in case auth state changes)

  return null
}

export default UserTracker
