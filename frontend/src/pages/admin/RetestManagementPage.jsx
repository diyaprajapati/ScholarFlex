import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import api from '../../services/api'

const RetestManagementPage = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all') // 'all' | 'selected' | 'not_selected' | 'in_progress'
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    const userData = authService.getUser()
    setUser(userData)

    // Only Admin / Super Admin can access
    if (userData?.role !== 'ADMIN' && userData?.role !== 'SUPER_ADMIN') {
      navigate(ROUTES.DASHBOARD, { replace: true })
      return
    }

    fetchStudents()
  }, [navigate])

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.candidates.getAll()
      const list = response.candidates || []

      // Focus on students who have given at least one test, have retest access, OR have IN_PROGRESS tests
      const filtered = list.filter(
        (s) =>
          (typeof s.marks === 'number' && s.marks > 0) ||
          s.can_retest === true ||
          s.has_in_progress_test === true
      )

      setStudents(filtered)
      setError('')
    } catch (err) {
      console.error('Error fetching students for retest management:', err)
      setError(err.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggleRetest = useCallback(async (studentId, newValue) => {
    try {
      // Optimistic update
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, can_retest: newValue } : s
        )
      )

      const target = students.find((s) => s.id === studentId)
      if (!target) return

      // Keep current selection status, only change can_retest
      await api.candidates.updateSelection(studentId, target.is_selected || false, {
        canRetest: newValue,
      })
    } catch (err) {
      console.error('Error updating retest access:', err)
      setError(err.message || 'Failed to update retest access')
      // Revert
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, can_retest: !newValue } : s
        )
      )
      setTimeout(() => setError(''), 3000)
    }
  }, [students])

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students]

    // Search by name or email
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((s) => {
        const name = (s.full_name || '').toLowerCase()
        const email = (s.email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    }

    // Filter by selection status or test status
    if (selectedFilter === 'selected') {
      result = result.filter((s) => s.is_selected)
    } else if (selectedFilter === 'not_selected') {
      result = result.filter((s) => !s.is_selected)
    } else if (selectedFilter === 'in_progress') {
      result = result.filter((s) => s.has_in_progress_test === true)
    }

    // Sort alphabetically by name/email for stable order
    result.sort((a, b) => {
      const aKey = (a.full_name || a.email || '').toLowerCase()
      const bKey = (b.full_name || b.email || '').toLowerCase()
      return aKey.localeCompare(bKey)
    })

    return result
  }, [students, searchQuery, selectedFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedStudents.length / pageSize))

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSortedStudents.slice(start, start + pageSize)
  }, [filteredAndSortedStudents, currentPage])

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedFilter])

  if (!user) {
    return null
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />

      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                Retest Management
              </h1>
              <p className="mt-1 text-sm text-gray-600 max-w-2xl">
                Control which students are allowed to log in again and reattempt their test.
              </p>
            </div>
            <button
              onClick={fetchStudents}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {/* Filters & Alerts */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-1 gap-3">
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
              <div>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All students</option>
                  <option value="in_progress">Tests In Progress</option>
                  <option value="selected">Selected only</option>
                  <option value="not_selected">Not selected only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500 text-base sm:text-lg">
              Loading students...
            </div>
          ) : filteredAndSortedStudents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-6 sm:p-8 text-center">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                No students available for retest management
              </h2>
              <p className="text-sm text-gray-600">
                Retest management shows students who have completed a test, have retest access, or have a test in progress.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Test Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Last Test %
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Selected
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Retest Access
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.full_name || 'N/A'}
                          </div>
                          {student.domain && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {student.domain}
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                          {student.email}
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-center text-sm">
                          {student.has_in_progress_test ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              In Progress
                            </span>
                          ) : typeof student.marks === 'number' && student.marks > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                              Not Started
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                          {typeof student.marks === 'number' && student.marks > 0
                            ? `${student.marks.toFixed(2)}%`
                            : student.has_in_progress_test
                            ? '—'
                            : 'N/A'}
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-center text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              student.is_selected
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-50 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {student.is_selected ? 'Selected' : 'Not Selected'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-center text-sm">
                          <label className="inline-flex items-center cursor-pointer">
                            <span className="mr-2 text-xs text-gray-600">
                              {student.can_retest ? 'Allowed' : 'Not Allowed'}
                            </span>
                            <input
                              type="checkbox"
                              checked={student.can_retest || false}
                              onChange={(e) =>
                                handleToggleRetest(student.id, e.target.checked)
                              }
                              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                            />
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredAndSortedStudents.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                  <div className="text-xs sm:text-sm text-gray-600">
                    Showing{' '}
                    <span className="font-semibold">
                      {filteredAndSortedStudents.length === 0
                        ? 0
                        : (currentPage - 1) * pageSize + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold">
                      {Math.min(currentPage * pageSize, filteredAndSortedStudents.length)}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold">
                      {filteredAndSortedStudents.length}
                    </span>{' '}
                    students
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs sm:text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs sm:text-sm text-gray-700">
                      Page <span className="font-semibold">{currentPage}</span> of{' '}
                      <span className="font-semibold">{totalPages}</span>
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs sm:text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default RetestManagementPage


