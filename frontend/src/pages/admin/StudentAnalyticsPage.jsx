import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { Search, Clock, Play, Calendar, TrendingUp, List, Calendar as CalendarIcon, BarChart3, Eye, X } from 'lucide-react';

const StudentAnalyticsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailViewMode, setDetailViewMode] = useState('day'); // 'week' or 'day' for detail modal
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    const userData = authService.getUser();
    setUser(userData);
    
    // Check if user is ADMIN or SUPER_ADMIN
    const userRole = authService.getUserRole();
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
    
    fetchAnalytics();
  }, [navigate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.admin.getStudentAnalytics();
      if (response.success) {
        setAnalytics(response.analytics || []);
      } else {
        setError(response.message || 'Failed to fetch student analytics');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch student analytics');
      console.error('Error fetching student analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getWeekNumber = (dateString) => {
    const date = new Date(dateString);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const getWeekRange = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    const diff = date.getDate() - day; // Sunday
    const sunday = new Date(date.setDate(diff));
    const saturday = new Date(date.setDate(diff + 6));
    return {
      start: sunday.toISOString().split('T')[0],
      end: saturday.toISOString().split('T')[0],
    };
  };

  // Group daily data by week
  const groupByWeek = (dailyWatchTime) => {
    const weekMap = new Map();
    dailyWatchTime.forEach((day) => {
      const weekRange = getWeekRange(day.date);
      const weekKey = `${weekRange.start}_${weekRange.end}`;
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekRange,
          days: [],
          totalSeconds: 0,
        });
      }
      const weekData = weekMap.get(weekKey);
      weekData.days.push(day);
      weekData.totalSeconds += day.seconds;
    });
    return Array.from(weekMap.values())
      .map((week) => ({
        ...week,
        totalMinutes: Math.round((week.totalSeconds / 60) * 100) / 100,
        totalHours: Math.round((week.totalSeconds / 3600) * 100) / 100,
      }))
      .sort((a, b) => new Date(b.weekRange.start) - new Date(a.weekRange.start));
  };

  // Filter analytics based on search query
  const filteredAnalytics = analytics.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.fullName?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.domainName?.toLowerCase().includes(query) ||
      student.phone?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredAnalytics.length / pageSize));

  const paginatedAnalytics = filteredAnalytics.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-6">Student Analytics</h1>
            
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, domain, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Showing {filteredAnalytics.length} of {analytics.length} selected students
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : filteredAnalytics.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No students found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Students Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Domain
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Videos Watched
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Videos Started
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Total Watch Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedAnalytics.map((student) => (
                        <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-gray-900">{student.fullName}</div>
                              <button
                                onClick={() => setSelectedStudent(student)}
                                className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="View detailed analytics"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                            {student.phone && (
                              <div className="text-xs text-gray-500 mt-1">{student.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.domainName || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-base font-semibold text-blue-600">{student.videosWatched}</div>
                            <div className="text-xs text-gray-500">completed</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-base font-semibold text-gray-700">{student.videosStarted}</div>
                            <div className="text-xs text-gray-500">started</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-base font-semibold text-green-600">
                              {formatTime(student.totalWatchTimeSeconds)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({student.totalWatchTimeHours.toFixed(2)} hrs)
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredAnalytics.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                    <div className="text-xs sm:text-sm text-gray-600">
                      Showing{' '}
                      <span className="font-semibold">
                        {filteredAnalytics.length === 0
                          ? 0
                          : (currentPage - 1) * pageSize + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold">
                        {Math.min(currentPage * pageSize, filteredAnalytics.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold">
                        {filteredAnalytics.length}
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
            </div>
          )}
        </div>
      </main>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{selectedStudent.fullName}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedStudent.email}</p>
                {selectedStudent.domainName && (
                  <p className="text-xs text-gray-400 mt-1">Domain: {selectedStudent.domainName}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-600 mb-1">Videos Watched</div>
                  <div className="text-2xl font-bold text-blue-900">{selectedStudent.videosWatched}</div>
                  <div className="text-xs text-blue-600 mt-1">completed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Videos Started</div>
                  <div className="text-2xl font-bold text-gray-900">{selectedStudent.videosStarted}</div>
                  <div className="text-xs text-gray-600 mt-1">started</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-green-600 mb-1">Total Watch Time</div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatTime(selectedStudent.totalWatchTimeSeconds)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {selectedStudent.totalWatchTimeHours.toFixed(2)} hours
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 mb-1">Active Days</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {selectedStudent.dailyWatchTime.length}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">days with activity</div>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-4">
                <button
                  onClick={() => setDetailViewMode('week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    detailViewMode === 'week'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Week View
                </button>
                <button
                  onClick={() => setDetailViewMode('day')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    detailViewMode === 'day'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Day View
                </button>
              </div>

              {/* Week View */}
              {detailViewMode === 'week' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Activity Breakdown</h3>
                  {selectedStudent.dailyWatchTime.length > 0 ? (
                    (() => {
                      const weekData = groupByWeek(selectedStudent.dailyWatchTime);
                      return (
                        <div className="space-y-4">
                          {weekData.map((week, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-gray-700">
                                  Week {formatDate(week.weekRange.start)} - {formatDate(week.weekRange.end)}
                                </span>
                                <span className="text-lg font-bold text-green-600">
                                  {formatTime(week.totalSeconds)} ({week.totalHours.toFixed(2)} hrs)
                                </span>
                              </div>
                              <div className="grid grid-cols-7 gap-2 mt-3">
                                {week.days.map((day, dayIdx) => (
                                  <div key={dayIdx} className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                                    <div className="text-xs text-gray-500 font-medium mb-1">
                                      {formatDateShort(day.date)}
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {Math.round(day.seconds / 60)}m
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {formatTime(day.seconds)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">No activity recorded</p>
                    </div>
                  )}
                </div>
              )}

              {/* Day View */}
              {detailViewMode === 'day' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity Breakdown</h3>
                  {selectedStudent.dailyWatchTime.length > 0 ? (
                    <div className="space-y-2">
                      {selectedStudent.dailyWatchTime.map((day, idx) => (
                        <div key={idx} className="flex items-center justify-between border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-gray-900">{formatDate(day.date)}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({day.hours.toFixed(2)} hours)
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-48 bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-green-600 h-3 rounded-full transition-all"
                                style={{
                                  width: `${Math.min((day.seconds / 3600) * 5, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-900 min-w-[80px] text-right">
                              {formatTime(day.seconds)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">No activity recorded</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAnalyticsPage;

