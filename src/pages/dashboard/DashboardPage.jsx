import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import Sidebar from '../../components/dashboard/Sidebar'
import DashboardHeader from '../../components/dashboard/layout/DashboardHeader'
import KPIGrid from '../../components/dashboard/cards/KPIGrid'
import RevenueTrendChart from '../../components/dashboard/charts/RevenueTrendChart'
import PipelineFunnelChart from '../../components/dashboard/charts/PipelineFunnelChart'
import TeamPerformanceTable from '../../components/dashboard/tables/TeamPerformanceTable'
import RecentActivities from '../../components/dashboard/lists/RecentActivities'
import TaskProgress from '../../components/dashboard/lists/TaskProgress'
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

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/', { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)
  }, [navigate])

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar user={user} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 space-y-10">
          <DashboardHeader user={user} />
          <KPIGrid items={kpiCards} />
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RevenueTrendChart data={revenueTrend} />
            </div>
            <PipelineFunnelChart data={pipelineBreakdown} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <TeamPerformanceTable rows={teamPerformance} />
            </div>
            <div className="space-y-6">
              <RecentActivities items={activities} />
              <TaskProgress items={taskProgress} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


