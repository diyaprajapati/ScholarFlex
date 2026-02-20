import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SplitLayout from '../../components/layouts/SplitLayout'
import LeftPanel from '../../components/login/LeftPanel'
import LoginForm from '../../components/login/LoginForm'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'

const LOGIN_MESSAGE_KEY = 'scholarflex_login_message'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loginMessage, setLoginMessage] = useState('')

  // Show "Session expired" or "Please login again" when redirected after 401 or proactive logout
  useEffect(() => {
    try {
      const sessionExpired = authService.getAndClearSessionExpired()
      if (sessionExpired) {
        setLoginMessage('Session expired. Please log in again.')
        const t = setTimeout(() => setLoginMessage(''), 5000)
        return () => clearTimeout(t)
      }
      const msg = sessionStorage.getItem(LOGIN_MESSAGE_KEY)
      if (msg) {
        sessionStorage.removeItem(LOGIN_MESSAGE_KEY)
        setLoginMessage(msg)
        const t = setTimeout(() => setLoginMessage(''), 5000)
        return () => clearTimeout(t)
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      return
    }

    const checkAndRedirect = async () => {
      const role = authService.getUserRole()
      if (role === 'STUDENT') {
        const user = authService.getUser()
        
        // Only selected students need to complete the profile form
        if (user?.is_selected) {
          // Check profile completion from database
          try {
            const api = (await import('../../services/api')).default
            const response = await api.studentProfile.checkCompletion()
            if (response.success) {
              if (response.isCompleted) {
                // Profile completed, redirect to dashboard
                navigate(ROUTES.STUDENT.DASHBOARD, { replace: true })
              } else {
                // Profile not completed, redirect to form page (only for selected students)
                navigate(ROUTES.STUDENT.FORM, { replace: true })
              }
            } else {
              // Error checking, redirect to form to be safe
              navigate(ROUTES.STUDENT.FORM, { replace: true })
            }
          } catch (error) {
            console.error('Error checking profile completion:', error)
            // Error checking, redirect to form to be safe
            navigate(ROUTES.STUDENT.FORM, { replace: true })
          }
        } else {
          // Non-selected students go directly to instructions page
          navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })
        }
      } else if (role === 'ADMIN') {
        // Admin users can only access Evaluations, Student Analytics, and Open Student Analytics
        navigate(ROUTES.EVALUATION_MANAGEMENT, { replace: true })
      } else {
        // Super Admin goes to dashboard
        navigate(ROUTES.DASHBOARD, { replace: true })
      }
    }

    checkAndRedirect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {loginMessage && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-9999 px-4 py-3 rounded-lg shadow-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium max-w-md text-center"
        >
          {loginMessage}
        </div>
      )}
      <SplitLayout left={<LeftPanel />} right={<LoginForm />} />
    </>
  )
}


