import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import Sidebar from '../../components/dashboard/Sidebar'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/', { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)
  }, [navigate])

  const handleLogout = () => {
    authService.logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Dashboard
          </h1>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">
              Welcome to your dashboard{user ? `, ${user.email}` : ''}!
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}


