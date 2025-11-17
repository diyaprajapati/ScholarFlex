import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import api from '../../services/api'

export default function TestAttemptsPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)

    const role = authService.getUserRole()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    const fetchAttempts = async () => {
      setIsLoading(true)
      try {
        const response = await api.testAttempts.getAll()
        setAttempts(response.data || [])
        setError(null)
      } catch (err) {
        console.error('Error fetching test attempts:', err)
        setError(err.message || 'Failed to load test attempts.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAttempts()
  }, [navigate])

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString()
  }

  const formatNumber = (value) => Number(value ?? 0).toFixed(2)

  return (
    <div className="h-screen bg-gray-50 flex">
      <Sidebar user={user} />
      <div className="flex-1 ml-64 overflow-y-auto">
        <TopNavbar user={user} />
        <main className="pt-16">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 lg:p-6 mb-6 shadow-sm">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                Test Results
              </h1>
              <p className="text-sm text-gray-600">
                Monitor student performance across all published tests.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {isLoading ? (
                <div className="p-6 text-center text-sm text-gray-600">
                  Loading test attempts...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-sm text-red-600">
                  {error}
                </div>
              ) : attempts.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-600">
                  No test attempts found yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Student</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Domain</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Test</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Score</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Percentage</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {attempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{attempt.student_name}</p>
                            <p className="text-xs text-gray-500">{attempt.student_email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {attempt.domain_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {attempt.paper_name}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {formatNumber(attempt.total_score)} / {formatNumber(attempt.max_possible_score)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-[#4C763B]">
                              {formatNumber(attempt.percentage_score)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                attempt.status === 'COMPLETED'
                                  ? 'bg-green-50 text-green-700'
                                  : attempt.status === 'AUTO_SUBMITTED'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {attempt.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatDate(attempt.submitted_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

