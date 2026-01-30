import React, { useEffect } from 'react'
import PieChart from '../charts/PieChart'
import DetailTable from '../tables/DetailTable'
import { authService } from '../../../utils/auth'

export default function CardDetailView({ cardId, onBack }) {
  // Debug: Log the cardId to see what's being passed
  useEffect(() => {
    // console.log('CardDetailView - cardId:', cardId)
  }, [cardId])

  const renderDetailContent = () => {
    switch (cardId) {
      case 'total-interns':
        return <TotalInternsDetail />
      case 'all-domains':
        return <AllDomainsDetail />
      case 'completed-aptitude':
        return <CompletedAptitudeDetail />
      case 'selected-students':
        return <SelectedStudentsDetail />
      default:
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No detail view available for this card.</p>
            <p className="text-sm text-gray-500 mt-2">Card ID: {cardId}</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      {/* Content will be rendered based on cardId */}
      {renderDetailContent()}
    </div>
  )
}

// Total Register Interns Detail
function TotalInternsDetail() {
  const userRole = authService.getUserRole()
  const isSuperAdmin = userRole === 'superadmin'
  const showMarks = isSuperAdmin
  
  const pieData = [
    { label: 'Active', value: 180, color: '#4C763B' },
    { label: 'Inactive', value: 45, color: '#B0CE88' },
    { label: 'Pending', value: 23, color: '#88B0CE' },
  ]

  const totalStudentsData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', domain: 'Web Development', status: 'Active', registeredDate: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', domain: 'Data Science', status: 'Active', registeredDate: '2024-01-20' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', domain: 'Mobile Development', status: 'Inactive', registeredDate: '2024-02-01' },
    { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', domain: 'Web Development', status: 'Active', registeredDate: '2024-02-05' },
    { id: 5, name: 'David Brown', email: 'david@example.com', domain: 'Data Science', status: 'Pending', registeredDate: '2024-02-10' },
  ]

  const aptitudeStudentsData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', domain: 'Web Development', score: 85, status: 'Completed' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', domain: 'Data Science', score: 92, status: 'Completed' },
    { id: 3, name: 'Sarah Williams', email: 'sarah@example.com', domain: 'Web Development', score: 78, status: 'Completed' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Total Register Interns</h2>
        <p className="text-sm text-gray-600 mt-1">Detailed overview of all registered interns</p>
      </div>

      {/* Pie Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
        <PieChart data={pieData} />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailTable
          title="Total Register Students"
          data={totalStudentsData}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'domain', label: 'Domain' },
            { key: 'status', label: 'Status' },
            { key: 'registeredDate', label: 'Registered' },
          ]}
        />
        <DetailTable
          title="Aptitude Students"
          data={aptitudeStudentsData}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'domain', label: 'Domain' },
            ...(showMarks ? [{ key: 'score', label: 'Score' }] : []),
            { key: 'status', label: 'Status' },
          ]}
        />
      </div>
    </div>
  )
}

// All Domains Detail
function AllDomainsDetail() {
  const pieData = [
    { label: 'Web Development', value: 85, color: '#4C763B' },
    { label: 'Data Science', value: 62, color: '#B0CE88' },
    { label: 'Mobile Development', value: 48, color: '#88B0CE' },
    { label: 'Cloud Computing', value: 33, color: '#CE88B0' },
    { label: 'Others', value: 20, color: '#88CEB0' },
  ]

  const domainsData = [
    { id: 1, domain: 'Web Development', totalStudents: 85, active: 72, completed: 65 },
    { id: 2, domain: 'Data Science', totalStudents: 62, active: 58, completed: 52 },
    { id: 3, domain: 'Mobile Development', totalStudents: 48, active: 42, completed: 38 },
    { id: 4, domain: 'Cloud Computing', totalStudents: 33, active: 28, completed: 25 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">All Domains</h2>
        <p className="text-sm text-gray-600 mt-1">Overview of all available domains</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Domain Distribution</h3>
        <PieChart data={pieData} />
      </div>

      <DetailTable
        title="Domain Statistics"
        data={domainsData}
        columns={[
          { key: 'domain', label: 'Domain' },
          { key: 'totalStudents', label: 'Total Students' },
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
        ]}
      />
    </div>
  )
}

// Completed Aptitude Detail
function CompletedAptitudeDetail() {
  const userRole = authService.getUserRole()
  const isSuperAdmin = userRole === 'superadmin'
  const showMarks = isSuperAdmin
  
  const pieData = [
    { label: 'Excellent (90-100)', value: 45, color: '#4C763B' },
    { label: 'Good (75-89)', value: 78, color: '#B0CE88' },
    { label: 'Average (60-74)', value: 52, color: '#88B0CE' },
    { label: 'Below Average (<60)', value: 11, color: '#CE88B0' },
  ]

  const completedData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', score: 85, grade: 'Good', completedDate: '2024-02-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', score: 92, grade: 'Excellent', completedDate: '2024-02-16' },
    { id: 3, name: 'Sarah Williams', email: 'sarah@example.com', score: 78, grade: 'Good', completedDate: '2024-02-17' },
    { id: 4, name: 'Mike Johnson', email: 'mike@example.com', score: 65, grade: 'Average', completedDate: '2024-02-18' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Total Completed Aptitude</h2>
        <p className="text-sm text-gray-600 mt-1">Performance analysis of completed aptitude tests</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
        <PieChart data={pieData} />
      </div>

      <DetailTable
        title="Completed Aptitude Tests"
        data={completedData}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          ...(showMarks ? [{ key: 'score', label: 'Score' }] : []),
          { key: 'grade', label: 'Grade' },
          { key: 'completedDate', label: 'Completed Date' },
        ]}
      />
    </div>
  )
}

// Selected Students Detail
function SelectedStudentsDetail() {
  const pieData = [
    { label: 'Web Development', value: 52, color: '#4C763B' },
    { label: 'Data Science', value: 38, color: '#B0CE88' },
    { label: 'Mobile Development', value: 32, color: '#88B0CE' },
    { label: 'Cloud Computing', value: 20, color: '#CE88B0' },
  ]

  const selectedData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', domain: 'Web Development', selectionDate: '2024-02-20', status: 'Selected' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', domain: 'Data Science', selectionDate: '2024-02-21', status: 'Selected' },
    { id: 3, name: 'Sarah Williams', email: 'sarah@example.com', domain: 'Web Development', selectionDate: '2024-02-22', status: 'Selected' },
    { id: 4, name: 'David Brown', email: 'david@example.com', domain: 'Mobile Development', selectionDate: '2024-02-23', status: 'Selected' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Total Selected Student</h2>
        <p className="text-sm text-gray-600 mt-1">List of all selected students by domain</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Selection by Domain</h3>
        <PieChart data={pieData} />
      </div>

      <DetailTable
        title="Selected Students"
        data={selectedData}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'domain', label: 'Domain' },
          { key: 'selectionDate', label: 'Selection Date' },
          { key: 'status', label: 'Status' },
        ]}
      />
    </div>
  )
}

