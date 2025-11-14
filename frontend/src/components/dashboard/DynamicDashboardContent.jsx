import React from 'react'
import PieChart from './charts/PieChart'
import DetailTable from './tables/DetailTable'
import { authService } from '../../utils/auth'

export default function DynamicDashboardContent({ selectedCard }) {
  // Check user role to determine if marks should be shown
  const userRole = authService.getUserRole()
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const showMarks = isSuperAdmin // Only Super Admin can see marks
  // Get data based on selected card
  const getCardData = () => {
    switch (selectedCard) {
      case 'total-interns':
        return {
          pieData: [
            { label: 'Active', value: 180, color: '#4C763B' },
            { label: 'Inactive', value: 45, color: '#B0CE88' },
            { label: 'Pending', value: 23, color: '#88B0CE' },
          ],
          tables: [
            {
              title: 'Total Register Students',
              data: [
                { id: 1, name: 'John Doe', email: 'john@example.com', domain: 'Web Development', status: 'Active', registeredDate: '2024-01-15' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com', domain: 'Data Science', status: 'Active', registeredDate: '2024-01-20' },
                { id: 3, name: 'Mike Johnson', email: 'mike@example.com', domain: 'Mobile Development', status: 'Inactive', registeredDate: '2024-02-01' },
                { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', domain: 'Web Development', status: 'Active', registeredDate: '2024-02-05' },
                { id: 5, name: 'David Brown', email: 'david@example.com', domain: 'Data Science', status: 'Pending', registeredDate: '2024-02-10' },
              ],
              columns: [
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'domain', label: 'Domain' },
                { key: 'status', label: 'Status' },
                { key: 'registeredDate', label: 'Registered' },
              ],
            },
            {
              title: 'Aptitude Students',
              data: [
                { id: 1, name: 'John Doe', email: 'john@example.com', domain: 'Web Development', score: 85, status: 'Completed' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com', domain: 'Data Science', score: 92, status: 'Completed' },
                { id: 3, name: 'Sarah Williams', email: 'sarah@example.com', domain: 'Web Development', score: 78, status: 'Completed' },
              ],
              columns: [
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'domain', label: 'Domain' },
                ...(showMarks ? [{ key: 'score', label: 'Score' }] : []),
                { key: 'status', label: 'Status' },
              ],
            },
          ],
        }
      case 'all-domains':
        return {
          pieData: [
            { label: 'Web Development', value: 85, color: '#4C763B' },
            { label: 'Data Science', value: 62, color: '#B0CE88' },
            { label: 'Mobile Development', value: 48, color: '#88B0CE' },
            { label: 'Cloud Computing', value: 33, color: '#CE88B0' },
            { label: 'Others', value: 20, color: '#88CEB0' },
          ],
          tables: [
            {
              title: 'Domain Statistics',
              data: [
                { id: 1, domain: 'Web Development', totalStudents: 85, active: 72, completed: 65 },
                { id: 2, domain: 'Data Science', totalStudents: 62, active: 58, completed: 52 },
                { id: 3, domain: 'Mobile Development', totalStudents: 48, active: 42, completed: 38 },
                { id: 4, domain: 'Cloud Computing', totalStudents: 33, active: 28, completed: 25 },
              ],
              columns: [
                { key: 'domain', label: 'Domain' },
                { key: 'totalStudents', label: 'Total Students' },
                { key: 'active', label: 'Active' },
                { key: 'completed', label: 'Completed' },
              ],
            },
          ],
        }
      case 'completed-aptitude':
        return {
          pieData: [
            { label: 'Excellent (90-100)', value: 45, color: '#4C763B' },
            { label: 'Good (75-89)', value: 78, color: '#B0CE88' },
            { label: 'Average (60-74)', value: 52, color: '#88B0CE' },
            { label: 'Below Average (<60)', value: 11, color: '#CE88B0' },
          ],
          tables: [
            {
              title: 'Completed Aptitude Tests',
              data: [
                { id: 1, name: 'John Doe', email: 'john@example.com', score: 85, grade: 'Good', completedDate: '2024-02-15' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com', score: 92, grade: 'Excellent', completedDate: '2024-02-16' },
                { id: 3, name: 'Sarah Williams', email: 'sarah@example.com', score: 78, grade: 'Good', completedDate: '2024-02-17' },
                { id: 4, name: 'Mike Johnson', email: 'mike@example.com', score: 65, grade: 'Average', completedDate: '2024-02-18' },
              ],
              columns: [
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                ...(showMarks ? [{ key: 'score', label: 'Score' }] : []),
                { key: 'grade', label: 'Grade' },
                { key: 'completedDate', label: 'Completed Date' },
              ],
            },
          ],
        }
      case 'selected-students':
        return {
          pieData: [
            { label: 'Web Development', value: 52, color: '#4C763B' },
            { label: 'Data Science', value: 38, color: '#B0CE88' },
            { label: 'Mobile Development', value: 32, color: '#88B0CE' },
            { label: 'Cloud Computing', value: 20, color: '#CE88B0' },
          ],
          tables: [
            {
              title: 'Selected Students',
              data: [
                { id: 1, name: 'John Doe', email: 'john@example.com', domain: 'Web Development', selectionDate: '2024-02-20', status: 'Selected' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com', domain: 'Data Science', selectionDate: '2024-02-21', status: 'Selected' },
                { id: 3, name: 'Sarah Williams', email: 'sarah@example.com', domain: 'Web Development', selectionDate: '2024-02-22', status: 'Selected' },
                { id: 4, name: 'David Brown', email: 'david@example.com', domain: 'Mobile Development', selectionDate: '2024-02-23', status: 'Selected' },
              ],
              columns: [
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'domain', label: 'Domain' },
                { key: 'selectionDate', label: 'Selection Date' },
                { key: 'status', label: 'Status' },
              ],
            },
          ],
        }
      default:
        return {
          pieData: [],
          tables: [],
        }
    }
  }

  const { pieData, tables } = getCardData()

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Pie Chart */}
      {pieData && pieData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 lg:p-6">
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 lg:mb-5">Distribution Overview</h3>
          <PieChart data={pieData} />
        </div>
      )}

      {/* Tables */}
      {tables && tables.length > 0 && (
        <div className={`grid grid-cols-1 ${tables.length > 1 ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-5 lg:gap-6`}>
          {tables.map((table, index) => (
            <DetailTable
              key={index}
              title={table.title}
              data={table.data}
              columns={table.columns}
            />
          ))}
        </div>
      )}
    </div>
  )
}

