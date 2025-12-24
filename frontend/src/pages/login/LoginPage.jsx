import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SplitLayout from '../../components/layouts/SplitLayout'
import LeftPanel from '../../components/login/LeftPanel'
import LoginForm from '../../components/login/LoginForm'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'

export default function LoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      return
    }

    const role = authService.getUserRole()
    if (role === 'STUDENT') {
      const user = authService.getUser()
      
      // Only selected students need to complete the form
      if (user?.is_selected) {
        // Check if form has been completed
        const FORM_STORAGE_KEY = 'student_form_completed'
        const storageKey = `${FORM_STORAGE_KEY}_${user?.email || user?.id}`
        const formCompleted = localStorage.getItem(storageKey) === 'true'
        
        if (!formCompleted) {
          // Form not completed, redirect to form page (only for selected students)
          navigate(ROUTES.STUDENT.FORM, { replace: true })
        } else {
          // Form completed, redirect to dashboard
          navigate(ROUTES.STUDENT.DASHBOARD, { replace: true })
        }
      } else {
        // Non-selected students go directly to instructions page
        navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })
      }
    } else {
      navigate(ROUTES.DASHBOARD, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <SplitLayout left={<LeftPanel />} right={<LoginForm />} />
}


