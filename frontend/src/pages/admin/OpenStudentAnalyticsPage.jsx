import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import {
  Search,
  Users,
  Play,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Mail,
  Phone,
  User,
  Video,
  BookOpen,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const OpenStudentAnalyticsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Aggregate analytics
  const [aggregateData, setAggregateData] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Individual student data
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('lastAccessAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

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
    
    fetchAllData();
  }, [navigate]);

  useEffect(() => {
    // Skip initial mount - fetchAllData handles that
    // Only fetch when filters change after initial load
    if (user && !loading) {
      const timer = setTimeout(() => {
        fetchIndividualAnalytics();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentPage, searchQuery, sortBy, sortOrder]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [aggregateResponse, statsResponse] = await Promise.all([
        api.admin.getOpenStudentAggregateAnalytics(),
        api.admin.getOpenStudentStats(),
      ]);
      
      if (aggregateResponse.success) {
        setAggregateData(aggregateResponse.analytics);
      }
      
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
      
      await fetchIndividualAnalytics();
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndividualAnalytics = async () => {
    try {
      setLoadingStudents(true);
      // console.log('[OpenStudentAnalytics] Fetching individual analytics:', {
      //   page: currentPage,
      //   limit: 20,
      //   search: searchQuery,
      //   sortBy,
      //   sortOrder,
      // });
      
      const response = await api.admin.getOpenStudentIndividualAnalytics({
        page: currentPage,
        limit: 20,
        search: searchQuery,
        sortBy,
        sortOrder,
      });
      
      // console.log('[OpenStudentAnalytics] Full response:', response);
      // console.log('[OpenStudentAnalytics] Response received:', {
      //   success: response.success,
      //   studentsCount: response.students?.length || 0,
      //   pagination: response.pagination,
      //   students: response.students,
      // });
      
      if (response.success) {
        const studentsData = response.students || [];
        // console.log('[OpenStudentAnalytics] Setting students:', studentsData.length);
        setStudents(studentsData);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotal(response.pagination?.total || 0);
        
        if (studentsData.length === 0) {
          // console.log('[OpenStudentAnalytics] No students found in response');
        }
      } else {
        console.error('[OpenStudentAnalytics] API returned success=false:', response.message);
        setError(response.message || 'Failed to fetch student data');
        setStudents([]);
      }
    } catch (err) {
      console.error('[OpenStudentAnalytics] Error fetching individual analytics:', err);
      console.error('[OpenStudentAnalytics] Error details:', err.response?.data || err);
      setError(err.message || 'Failed to fetch student data');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  const exportToCSV = () => {
    if (students.length === 0) return;
    
    const headers = [
      'Email',
      'Name',
      'Phone',
      'Registered Date',
      'Last Access',
      'Videos Watched',
      'Completed Videos',
      'In Progress Videos',
      'Total Watch Time',
      'Avg Progress %',
      'Playlists Accessed',
    ];
    
    const rows = students.map((student) => [
      student.email || '',
      student.name || '',
      student.phone || '',
      formatDate(student.createdAt),
      formatDate(student.lastAccessAt),
      student.stats.totalVideosWatched,
      student.stats.completedVideos,
      student.stats.inProgressVideos,
      formatTime(student.stats.totalWatchTimeSeconds),
      student.stats.averageProgress.toFixed(1),
      student.stats.uniquePlaylistsAccessed,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-students-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Open Student Analytics</h1>
                <p className="text-gray-600 mt-1">Track and analyze open student learning activity</p>
              </div>
              <button
                onClick={exportToCSV}
                disabled={students.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by email, name, or phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Showing {students.length} of {total} open students
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Registered</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRegistered}</p>
                      </div>
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Converted to Interns</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalConverted}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Video Progress Records</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalVideoProgress}</p>
                      </div>
                      <Video className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Playlist Accesses</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPlaylistAccesses}</p>
                      </div>
                      <BookOpen className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Soft Deleted</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSoftDeleted}</p>
                      </div>
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                  </div>
                </div>
              )}

              {/* Aggregate Analytics */}
              {aggregateData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Active Users */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Active Users
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Last 7 Days</span>
                        <span className="text-xl font-bold text-gray-900">{aggregateData.activeUsers.last7Days}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Last 30 Days</span>
                        <span className="text-xl font-bold text-gray-900">{aggregateData.activeUsers.last30Days}</span>
                      </div>
                    </div>
                  </div>

                  {/* Average Watch Time */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Average Watch Time
                    </h3>
                    <p className="text-3xl font-bold text-gray-900">{formatTime(aggregateData.averageWatchTime)}</p>
                    <p className="text-sm text-gray-500 mt-2">Per incomplete video</p>
                  </div>
                </div>
              )}

              {/* Top Playlists & Videos */}
              {aggregateData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Playlists */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                      Top Playlists
                    </h3>
                    <div className="space-y-3">
                      {aggregateData.topPlaylists.length === 0 ? (
                        <p className="text-gray-500 text-sm">No playlist access data</p>
                      ) : (
                        aggregateData.topPlaylists.slice(0, 5).map((playlist, index) => (
                          <div key={playlist.playlistId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                              <span className="text-sm text-gray-900 truncate flex-1">{playlist.playlistTitle}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{playlist.accessCount}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Top Videos */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Video className="w-5 h-5 text-purple-600" />
                      Top Videos (In Progress)
                    </h3>
                    <div className="space-y-3">
                      {aggregateData.topVideos.length === 0 ? (
                        <p className="text-gray-500 text-sm">No video progress data</p>
                      ) : (
                        aggregateData.topVideos.slice(0, 5).map((video, index) => (
                          <div key={video.videoId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                                <span className="text-sm text-gray-900 truncate">{video.videoTitle}</span>
                              </div>
                              <p className="text-xs text-gray-500 ml-9 mt-1">
                                {video.watchCount} watches • {formatTime(video.totalWatchTime)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Students Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Individual Student Analytics</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('email')}>
                          <div className="flex items-center gap-2">
                            Email
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('name')}>
                          <div className="flex items-center gap-2">
                            Name
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('lastAccessAt')}>
                          <div className="flex items-center gap-2">
                            Last Access
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Videos Watched
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Watch Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Playlists
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingStudents ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
                            <p className="text-gray-500 mt-2">Loading students...</p>
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                            <p className="text-lg font-medium mb-2">No open students found</p>
                            <p className="text-sm">Total registered: {total}</p>
                            {searchQuery && (
                              <p className="text-sm mt-2">Try adjusting your search query</p>
                            )}
                          </td>
                        </tr>
                      ) : (
                        students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{student.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{student.name || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{formatDate(student.lastAccessAt)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-gray-900">
                                  {student.stats.totalVideosWatched}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({student.stats.completedVideos}✓ / {student.stats.inProgressVideos}→)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-gray-900">
                                  {formatTime(student.stats.totalWatchTimeSeconds)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {student.stats.averageProgress.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-orange-400" />
                                <span className="text-sm text-gray-900">
                                  {student.stats.uniquePlaylistsAccessed}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleStudentClick(student)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages} ({total} total)
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
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
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Student Details</h2>
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900 mt-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedStudent.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900 mt-1 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedStudent.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900 mt-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {selectedStudent.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Registered</label>
                  <p className="text-gray-900 mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedStudent.createdAt)}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Videos</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedStudent.stats.totalVideosWatched}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{selectedStudent.stats.completedVideos}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{selectedStudent.stats.inProgressVideos}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Avg Progress</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{selectedStudent.stats.averageProgress.toFixed(1)}%</p>
                </div>
              </div>

              {/* Watch Time */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Watch Time
                </h3>
                <p className="text-3xl font-bold text-gray-900">{formatTime(selectedStudent.stats.totalWatchTimeSeconds)}</p>
              </div>

              {/* Playlists */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                  Playlists Accessed
                </h3>
                <p className="text-2xl font-bold text-gray-900">{selectedStudent.stats.uniquePlaylistsAccessed}</p>
                <p className="text-sm text-gray-500 mt-1">Total accesses: {selectedStudent.stats.totalPlaylistAccesses}</p>
              </div>

              {/* Last Video Watched */}
              {selectedStudent.stats.lastVideoWatched && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Play className="w-5 h-5 text-purple-600" />
                    Last Video Watched
                  </h3>
                  <p className="text-gray-900 font-medium">{selectedStudent.stats.lastVideoWatched.videoTitle}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>Progress: {selectedStudent.stats.lastVideoWatched.progressPercent.toFixed(1)}%</span>
                    <span>•</span>
                    <span>Position: {formatTime(selectedStudent.stats.lastVideoWatched.lastPosition)}</span>
                    <span>•</span>
                    <span>{formatDate(selectedStudent.stats.lastVideoWatched.updatedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenStudentAnalyticsPage;

