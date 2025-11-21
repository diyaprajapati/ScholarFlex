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
  const [filteredAttempts, setFilteredAttempts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [internshipStartDate, setInternshipStartDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [durationFilter, setDurationFilter] = useState('')
  const [marksFilter, setMarksFilter] = useState('')
  const [marksRange, setMarksRange] = useState({ min: '', max: '' })
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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
        setFilteredAttempts(response.data || [])
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

  // Apply filters whenever filters or search change
  useEffect(() => {
    let filtered = [...attempts]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(attempt => 
        attempt.student_name?.toLowerCase().includes(query) ||
        attempt.student_email?.toLowerCase().includes(query) ||
        attempt.paper_name?.toLowerCase().includes(query) ||
        attempt.domain_name?.toLowerCase().includes(query)
      )
    }

    // Internship Start Date filter
    if (internshipStartDate) {
      filtered = filtered.filter(attempt => {
        if (!attempt.internship_start_date) return false
        const attemptDate = new Date(attempt.internship_start_date).toISOString().split('T')[0]
        return attemptDate === internshipStartDate
      })
    }

    // Month filter (based on submitted_at)
    if (selectedMonth) {
      filtered = filtered.filter(attempt => {
        if (!attempt.submitted_at) return false
        const submittedDate = new Date(attempt.submitted_at)
        const month = String(submittedDate.getMonth() + 1).padStart(2, '0')
        const year = submittedDate.getFullYear()
        return `${year}-${month}` === selectedMonth
      })
    }

    // Duration filter
    if (durationFilter) {
      const [min, max] = durationFilter.split('-').map(Number)
      filtered = filtered.filter(attempt => {
        const duration = attempt.duration_minutes || 0
        if (max) {
          return duration >= min && duration <= max
        } else {
          return duration >= min
        }
      })
    }

    // Marks filter
    if (marksFilter) {
      if (marksFilter === 'custom') {
        // Custom range
        if (marksRange.min || marksRange.max) {
          filtered = filtered.filter(attempt => {
            const percentage = Number(attempt.percentage_score) || 0
            const min = marksRange.min ? Number(marksRange.min) : 0
            const max = marksRange.max ? Number(marksRange.max) : 100
            return percentage >= min && percentage <= max
          })
        }
      } else {
        // Predefined ranges
        const ranges = {
          '0-25': [0, 25],
          '26-50': [26, 50],
          '51-75': [51, 75],
          '76-100': [76, 100],
        }
        const [min, max] = ranges[marksFilter] || [0, 100]
        filtered = filtered.filter(attempt => {
          const percentage = Number(attempt.percentage_score) || 0
          return percentage >= min && percentage <= max
        })
      }
    }

    setFilteredAttempts(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [attempts, searchQuery, internshipStartDate, selectedMonth, durationFilter, marksFilter, marksRange])

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString()
  }

  const formatNumber = (value) => Number(value ?? 0).toFixed(2)

  // Get unique months from attempts for month filter
  const getAvailableMonths = () => {
    const months = new Set()
    attempts.forEach(attempt => {
      if (attempt.submitted_at) {
        const date = new Date(attempt.submitted_at)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        months.add(`${year}-${month}`)
      }
    })
    return Array.from(months).sort().reverse()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setInternshipStartDate('')
    setSelectedMonth('')
    setDurationFilter('')
    setMarksFilter('')
    setMarksRange({ min: '', max: '' })
    setCurrentPage(1)
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredAttempts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAttempts = filteredAttempts.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

            {/* Search and Filters Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 lg:p-6 mb-6 shadow-sm">
              <div className="space-y-4">
                {/* Search and Filter Icon Row */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by student name, email, test name, or domain..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
                    />
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                        showFilters || searchQuery || internshipStartDate || selectedMonth || durationFilter || marksFilter
                          ? 'border-[#4C763B] bg-[#4C763B]/10 text-[#4C763B]'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <span className="text-sm font-medium">Filters</span>
                      {(internshipStartDate || selectedMonth || durationFilter || marksFilter) && (
                        <span className="bg-[#4C763B] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {[internshipStartDate, selectedMonth, durationFilter, marksFilter].filter(Boolean).length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Filters Panel - Collapsible */}
                {showFilters && (
                  <div className="border-t border-gray-200 pt-4 space-y-4">
                    {/* Filters Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Internship Start Date Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Internship Start Date
                        </label>
                        <input
                          type="date"
                          value={internshipStartDate}
                          onChange={(e) => setInternshipStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
                        />
                      </div>

                      {/* Month Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Month (Submitted)
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
                        >
                          <option value="">All Months</option>
                          {getAvailableMonths().map(month => {
                            const [year, monthNum] = month.split('-')
                            const date = new Date(year, monthNum - 1)
                            return (
                              <option key={month} value={month}>
                                {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      {/* Duration Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (Minutes)
                        </label>
                        <select
                          value={durationFilter}
                          onChange={(e) => setDurationFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
                        >
                          <option value="">All Durations</option>
                          <option value="0-30">0-30 minutes</option>
                          <option value="31-60">31-60 minutes</option>
                          <option value="61-90">61-90 minutes</option>
                          <option value="91-120">91-120 minutes</option>
                          <option value="121-">121+ minutes</option>
                        </select>
                      </div>

                      {/* Marks Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Marks (%)
                        </label>
                        <select
                          value={marksFilter}
                          onChange={(e) => setMarksFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
                        >
                          <option value="">All Marks</option>
                          <option value="0-25">0-25%</option>
                          <option value="26-50">26-50%</option>
                          <option value="51-75">51-75%</option>
                          <option value="76-100">76-100%</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Marks Range */}
                    {marksFilter === 'custom' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Min Percentage
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={marksRange.min}
                            onChange={(e) => setMarksRange({ ...marksRange, min: e.target.value })}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Percentage
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={marksRange.max}
                            onChange={(e) => setMarksRange({ ...marksRange, max: e.target.value })}
                            placeholder="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    {/* Clear Filters Button */}
                    {(internshipStartDate || selectedMonth || durationFilter || marksFilter) && (
                      <div className="flex justify-end">
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Results Count */}
                <div className="text-sm text-gray-600 border-t border-gray-200 pt-4">
                  Showing {filteredAttempts.length} of {attempts.length} test attempts
                  {filteredAttempts.length > itemsPerPage && (
                    <span className="ml-2">
                      (Page {currentPage} of {totalPages})
                    </span>
                  )}
                </div>
              </div>
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
              ) : filteredAttempts.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-600">
                  {attempts.length === 0 
                    ? 'No test attempts found yet.'
                    : 'No test attempts match your filters. Try adjusting your search criteria.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Student</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Domain</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Test</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Duration</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Score</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Percentage</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedAttempts.map((attempt) => (
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
                          <td className="px-4 py-3 text-gray-700">
                            {attempt.duration_minutes || '—'} min
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

              {/* Pagination */}
              {filteredAttempts.length > itemsPerPage && (
                <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredAttempts.length)}</span> of{' '}
                      <span className="font-medium">{filteredAttempts.length}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  currentPage === page
                                    ? 'bg-[#4C763B] text-white'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="px-2 text-gray-500">...</span>
                          }
                          return null
                        })}
                      </div>

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

