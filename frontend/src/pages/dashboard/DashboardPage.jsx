import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import KPIGrid from '../../components/dashboard/cards/KPIGrid'
import RevenueTrendChart from '../../components/dashboard/charts/RevenueTrendChart'
import PipelineFunnelChart from '../../components/dashboard/charts/PipelineFunnelChart'
import TeamPerformanceTable from '../../components/dashboard/tables/TeamPerformanceTable'
import RecentActivities from '../../components/dashboard/lists/RecentActivities'
import TaskProgress from '../../components/dashboard/lists/TaskProgress'
import DynamicDashboardContent from '../../components/dashboard/DynamicDashboardContent'
import {
  activities,
  kpiCards,
  pipelineBreakdown,
  revenueTrend,
  taskProgress,
  teamPerformance,
} from '../../utils/dashboardData'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [selectedCard, setSelectedCard] = useState('total-interns') // Default to Total Register Interns

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
    }
  }, [navigate])

  const handleCardClick = (cardId) => {
    setSelectedCard(cardId)
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-[1280px] 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
          <KPIGrid items={kpiCards} onCardClick={handleCardClick} selectedCard={selectedCard} />
          <DynamicDashboardContent selectedCard={selectedCard} />
        </div>
      </main>
    </div>
  )
}


