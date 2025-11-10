import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SplitLayout from '../../components/layouts/SplitLayout'
import LeftPanel from '../../components/login/LeftPanel'
import LoginForm from '../../components/login/LoginForm'
import { authService } from '../../utils/auth'

export default function LoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  return <SplitLayout left={<LeftPanel />} right={<LoginForm />} />
}


