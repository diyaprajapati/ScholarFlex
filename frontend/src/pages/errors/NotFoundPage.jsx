import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import { NotFoundError } from '../../components/common/errors'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (authService.isAuthenticated()) {
      const userData = authService.getUser()
      setUser(userData)
    }
  }, [])

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {user && <Sidebar user={user} />}
      {user && <TopNavbar user={user} />}
      <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex items-center justify-center">
          <NotFoundError />
        </div>
      </main>
    </div>
  )
}

