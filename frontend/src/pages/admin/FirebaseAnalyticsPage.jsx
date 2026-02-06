import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  PieChart,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#4C763B', '#6B8E23', '#9ACD32', '#90EE90', '#98FB98'];

const FirebaseAnalyticsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activityRange, setActivityRange] = useState('month'); // 'week' | 'month' | 'year'

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
    
    fetchAnalytics(activityRange);
  }, [navigate, activityRange]);

  const fetchAnalytics = async (range = activityRange) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.admin.getFirebaseAnalytics({ range });
      if (response.success) {
        setAnalytics(response.data);
      } else {
        setError(response.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(activityRange);
  };

  const activityRangeLabel = { week: 'Week', month: 'Month', year: 'Year' };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const getPercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (!user) {
    return null;
  }

  if (loading && !analytics) {
    return (
      <div className="h-screen flex bg-gray-50">
        <Sidebar user={user} />
        <TopNavbar user={user} />
        <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#4C763B] border-t-transparent"></div>
              <p className="mt-3 text-sm text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </main>
      </div>
    );
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
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">User Analytics</h1>
              <p className="text-gray-600">Firebase Analytics & User Statistics</p>
            </div>
            <div className="flex gap-3">
              {/* <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Firebase Console
              </a> */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {analytics && (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalUsers)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {analytics.totalStudents} students + {analytics.totalAdmins} admins
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Active Users (7 Days) */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Active Users (7 Days)</p>
                      <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.activeUsers.last7Days)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {analytics.activeUsers.students7Days} students, {analytics.activeUsers.admins7Days} admins
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <UserCheck className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Active Users (30 Days) */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Active Users (30 Days)</p>
                      <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.activeUsers.last30Days)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {analytics.activeUsers.students30Days} students, {analytics.activeUsers.admins30Days} admins
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Selected Students */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Selected Students</p>
                      <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.selectedStudents)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getPercentageChange(analytics.selectedStudents, analytics.totalStudents)}% of total
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Daily Activity Chart - shadcn-style Area with Week/Month/Year tabs */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#4C763B]" />
                        Daily User Activity
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Active users by day — week, month, or year
                      </p>
                    </div>
                    {/* Week / Month / Year tabs (shadcn-style) */}
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50/50 p-0.5">
                      {(['week', 'month', 'year']).map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setActivityRange(range)}
                          className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C763B] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                            activityRange === range
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {activityRangeLabel[range]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="min-h-[300px] w-full">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={analytics.dailyActivity}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="fillActiveUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4C763B" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4C763B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          tickFormatter={(value) => {
                            const d = new Date(value);
                            if (activityRange === 'year') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                            if (activityRange === 'month') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return d.toLocaleDateString('en-US', { weekday: 'short' });
                          }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          tickFormatter={(value) => formatNumber(value)}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {new Date(label).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                                </p>
                                <p className="text-sm text-[#4C763B] font-medium">
                                  Active Users: {formatNumber(payload[0]?.value ?? 0)}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Active Users"
                          stroke="#4C763B"
                          strokeWidth={2}
                          fill="url(#fillActiveUsers)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Users by Role - Pie Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-[#4C763B]" />
                    Users by Role
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Selected Students', value: analytics.usersByRole.students.selected },
                          { name: 'Not Selected Students', value: analytics.usersByRole.students.notSelected },
                          ...analytics.usersByRole.admins.map(admin => ({
                            name: admin.roleName,
                            value: admin.count
                          }))
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Selected Students', value: analytics.usersByRole.students.selected },
                          { name: 'Not Selected Students', value: analytics.usersByRole.students.notSelected },
                          ...analytics.usersByRole.admins.map(admin => ({
                            name: admin.roleName,
                            value: admin.count
                          }))
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatNumber(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Active Users Comparison */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#4C763B]" />
                    Active Users Comparison
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { period: 'Last 7 Days', students: analytics.activeUsers.students7Days, admins: analytics.activeUsers.admins7Days },
                      { period: 'Last 30 Days', students: analytics.activeUsers.students30Days, admins: analytics.activeUsers.admins30Days }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Legend />
                      <Bar dataKey="students" fill="#4C763B" name="Students" />
                      <Bar dataKey="admins" fill="#6B8E23" name="Admins" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* New Users Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#4C763B]" />
                    New User Registrations
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Shows when new students registered in the system
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { period: 'Last 7 Days', count: analytics.newUsers.last7Days },
                      { period: 'Last 30 Days', count: analytics.newUsers.last30Days }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Bar dataKey="count" fill="#4C763B" name="New Registrations" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Firebase Analytics Integration</h3>
                    <p className="text-blue-800 mb-3">
                      <strong>Note:</strong> This page shows user statistics from your database. For detailed Firebase Analytics data 
                      (page views, timer events, login events, etc.), visit the Firebase Console. Firebase Analytics data may take 
                      24-48 hours to appear in the console.
                    </p>
                    <p className="text-blue-800 mb-3">
                      <strong>What's tracked:</strong> All events are being logged to Firebase Analytics in real-time, including:
                    </p>
                    <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm mb-3">
                      <li>Page views and navigation patterns</li>
                      <li>Timer start/stop/pause/resume events</li>
                      <li>Login events and user engagement</li>
                      <li>Custom event tracking</li>
                      <li>Real-time DebugView for testing (add ?firebase-debug=true to URL)</li>
                    </ul>
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Firebase Console for Detailed Analytics
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default FirebaseAnalyticsPage;
