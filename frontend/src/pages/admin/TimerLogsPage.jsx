import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const TimerLogsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [filters, setFilters] = useState({
    studentId: '',
    startDate: '',
    endDate: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    const userData = authService.getUser();
    setUser(userData);
    
    const userRole = authService.getUserRole();
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
  }, [navigate]);

  // Fetch logs when pagination or filters change
  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError('');
        const params = {
          ...filters,
          page: pagination.page,
          limit: pagination.limit
        };
        
        // console.log('Fetch useEffect triggered, fetching page:', pagination.page, 'limit:', pagination.limit);
        
        // Remove empty filters
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === null) {
            delete params[key];
          }
        });
        
        const response = await api.adminTimeTracking.getTimerLogs(params);
        if (response.success) {
          setLogs(response.logs || []);
          if (response.pagination) {
            setPagination(prev => ({
              ...prev,
              total: response.pagination.total || 0,
              totalPages: response.pagination.totalPages || 0
            }));
          }
        } else {
          setError(response.message || 'Failed to fetch timer logs');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch timer logs');
        console.error('Error fetching timer logs:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchLogs();
  }, [user, pagination.page, pagination.limit, filters.studentId, filters.startDate, filters.endDate, filters.status]);

  // Note: Filter reset is handled in handleFilterSubmit, not here
  // This prevents interference with pagination navigation

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setError('');
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });
      
      const response = await api.adminTimeTracking.getTimerLogs(params);
      if (response.success) {
        setLogs(response.logs || []);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total || 0,
            totalPages: response.pagination.totalPages || 0
          }));
        }
      } else {
        setError(response.message || 'Failed to fetch timer logs');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch timer logs');
      console.error('Error fetching timer logs:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Reset to page 1 - fetch will be triggered by useEffect
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleSession = (sessionId) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'START':
        return <Play className="w-4 h-4 text-green-600" />;
      case 'PAUSE':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      case 'RESUME':
        return <Play className="w-4 h-4 text-blue-600" />;
      case 'STOP':
        return <Square className="w-4 h-4 text-red-600" />;
      case 'ACTIVE':
        return <Clock className="w-4 h-4 text-green-600" />;
      case 'PAUSED':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'START':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'PAUSE':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'RESUME':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'STOP':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'ACTIVE':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Timer Logs</h1>
              <p className="text-gray-600">Track when interns start, pause, resume, and stop their timers</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Student ID
                </label>
                <input
                  type="number"
                  name="studentId"
                  value={filters.studentId}
                  onChange={handleFilterChange}
                  placeholder="Filter by student ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Status
                </label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ studentId: '', startDate: '', endDate: '', status: '' });
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear Filters
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4C763B] text-white rounded-lg hover:bg-[#3d5f2e]"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {/* Logs Table */}
          {loading && !logs.length ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#4C763B] border-t-transparent"></div>
              <p className="mt-3 text-sm text-gray-600">Loading timer logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No timer logs found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Session
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Student
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Duration
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Start Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          End Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <React.Fragment key={log.sessionId}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{log.sessionId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <div className="font-medium">{log.studentName}</div>
                                <div className="text-xs text-gray-500">{log.studentEmail}</div>
                                {log.domainName && (
                                  <div className="text-xs text-gray-400">{log.domainName}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                log.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                log.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                                log.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.totalMinutes ? formatDuration(log.totalMinutes) : '-'}
                              {log.pausedMinutes > 0 && (
                                <div className="text-xs text-gray-500">
                                  (Paused: {formatDuration(log.pausedMinutes)})
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(log.startTime)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.finishTime ? formatDateTime(log.finishTime) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => toggleSession(log.sessionId)}
                                className="text-[#4C763B] hover:text-[#3d5f2e] flex items-center gap-1"
                              >
                                {expandedSessions.has(log.sessionId) ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    Hide Events
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    Show Events ({log.events?.length || 0})
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                          {expandedSessions.has(log.sessionId) && log.events && log.events.length > 0 && (
                            <tr>
                              <td colSpan="7" className="px-6 py-4 bg-gray-50">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-gray-900 mb-3">Timer Events</h4>
                                  {log.events.map((event, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-center gap-3 p-3 rounded-lg border ${getEventColor(event.type)}`}
                                    >
                                      <div className="flex-shrink-0">
                                        {getEventIcon(event.type)}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-sm">{event.type}</span>
                                          <span className="text-xs opacity-75">
                                            {formatDateTime(event.timestamp)}
                                          </span>
                                        </div>
                                        {event.totalMinutes && (
                                          <div className="text-xs mt-1">
                                            Total: {formatDuration(event.totalMinutes)}
                                            {event.pausedMinutes > 0 && ` | Paused: ${formatDuration(event.pausedMinutes)}`}
                                          </div>
                                        )}
                                        {event.pauseCount && (
                                          <div className="text-xs mt-1">
                                            Pause Count: {event.pauseCount}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span> logs
                    </div>
                    <div className="flex items-center gap-2">
                      {/* First Page */}
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                        disabled={pagination.page === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium"
                        title="First page"
                      >
                        ««
                      </button>
                      
                      {/* Previous */}
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium"
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                              className={`px-3 py-2 min-w-[40px] border rounded-lg text-sm font-medium transition-colors ${
                                pagination.page === pageNum
                                  ? 'bg-[#4C763B] text-white border-[#4C763B]'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Next */}
                      <button
                        onClick={() => {
                          // console.log('Next clicked, current page:', pagination.page, 'totalPages:', pagination.totalPages);
                          setPagination(prev => {
                            const newPage = prev.page + 1;
                            // console.log('Setting page to:', newPage);
                            return { ...prev, page: newPage };
                          });
                        }}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium"
                      >
                        Next
                      </button>
                      
                      {/* Last Page */}
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium"
                        title="Last page"
                      >
                        »»
                      </button>
                    </div>
                    
                    {/* Page Info */}
                    <div className="text-sm text-gray-600">
                      Page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.totalPages}</span>
                    </div>
                  </div>
                  
                  {/* Items per page selector */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <label className="text-sm text-gray-700 flex items-center gap-2">
                      Items per page:
                      <select
                        value={pagination.limit}
                        onChange={(e) => {
                          setPagination(prev => ({
                            ...prev,
                            limit: parseInt(e.target.value),
                            page: 1 // Reset to first page when changing limit
                          }));
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-transparent text-sm"
                      >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TimerLogsPage;
