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
      navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })
    } else {
      navigate(ROUTES.DASHBOARD, { replace: true })
    }
  }, [navigate])

  return <SplitLayout left={<LeftPanel />} right={<LoginForm />} />
}


