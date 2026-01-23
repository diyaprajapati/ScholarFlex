import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import KPIGrid from '../../components/dashboard/cards/KPIGrid'
import DynamicDashboardContent from '../../components/dashboard/DynamicDashboardContent'
import api from '../../services/api'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [selectedCard, setSelectedCard] = useState('total-interns') // Default to Total Register Interns
  const [kpiCards, setKpiCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)
    
    // Check if user has access to dashboard (Admin or Super Admin only)
    const userRole = authService.getUserRole()
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      // Student should be redirected
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    // Fetch dashboard statistics
    fetchDashboardStats()
  }, [navigate])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.dashboard.getStats()
      
      if (response.success && response.data) {
        const stats = response.data
        const cards = [
          {
            id: 'total-interns',
            label: 'Total Register Interns',
            value: stats.totalInterns.value.toString(),
            change: stats.totalInterns.change >= 0 ? `+${stats.totalInterns.change}` : stats.totalInterns.change.toString(),
            trend: stats.totalInterns.trend,
          },
          {
            id: 'all-domains',
            label: 'All Domains',
            value: stats.allDomains.value.toString(),
            change: stats.allDomains.change >= 0 ? `+${stats.allDomains.change}` : stats.allDomains.change.toString(),
            trend: stats.allDomains.trend,
          },
          {
            id: 'completed-aptitude',
            label: 'Total Completed Aptitude',
            value: stats.completedAptitude.value.toString(),
            change: stats.completedAptitude.change >= 0 ? `+${stats.completedAptitude.change}` : stats.completedAptitude.change.toString(),
            trend: stats.completedAptitude.trend,
          },
          {
            id: 'selected-students',
            label: 'Total Selected Student',
            value: stats.selectedStudents.value.toString(),
            change: stats.selectedStudents.change >= 0 ? `+${stats.selectedStudents.change}` : stats.selectedStudents.change.toString(),
            trend: stats.selectedStudents.trend,
          },
        ]
        setKpiCards(cards)
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
      setError(err.message || 'Failed to load dashboard statistics')
      // Set default cards on error
      setKpiCards([
        {
          id: 'total-interns',
          label: 'Total Register Interns',
          value: '0',
          change: '0',
          trend: 'up',
        },
        {
          id: 'all-domains',
          label: 'All Domains',
          value: '0',
          change: '0',
          trend: 'up',
        },
        {
          id: 'completed-aptitude',
          label: 'Total Completed Aptitude',
          value: '0',
          change: '0',
          trend: 'up',
        },
        {
          id: 'selected-students',
          label: 'Total Selected Student',
          value: '0',
          change: '0',
          trend: 'up',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (cardId) => {
    setSelectedCard(cardId)
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-[1280px] 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#4C763B] border-t-transparent"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={fetchDashboardStats}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <KPIGrid items={kpiCards} onCardClick={handleCardClick} selectedCard={selectedCard} />
              <DynamicDashboardContent selectedCard={selectedCard} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}


