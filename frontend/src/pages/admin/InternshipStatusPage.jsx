import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { Clock, CheckCircle, Calendar, Mail, User, Search, ArrowUpDown } from 'lucide-react';

const InternshipStatusPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, NOT_STARTED, ONGOING, COMPLETED
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, date, status
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [allStudents, setAllStudents] = useState([]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const userData = authService.getUser();
    setUser(userData);

    const role = authService.getUserRole();
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }

    fetchAllStatuses();
  }, [navigate, sortBy, sortOrder, debouncedSearch]);

  const fetchAllStatuses = async () => {
    try {
      setLoading(true);
      // Fetch all students with a very high limit
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Very high limit to get all students
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await api.internshipStatus.getAllStatuses({}, params.toString());
      if (response.success) {
        const data = response.data || [];
        setAllStudents(data);
      } else {
        setError('Failed to fetch internship statuses');
      }
    } catch (err) {
      console.error('Error fetching internship statuses:', err);
      setError(err.message || 'Failed to fetch internship statuses');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      NOT_STARTED: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: Clock,
        label: 'Not Started',
      },
      ONGOING: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: Calendar,
        label: 'Ongoing',
      },
      COMPLETED: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Completed',
      },
    };

    const badge = badges[status] || badges.NOT_STARTED;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
    >
      {children}
      <ArrowUpDown className={`w-4 h-4 ${sortBy === field ? 'text-blue-600' : 'text-gray-400'}`} />
      {sortBy === field && (
        <span className="text-xs text-blue-600">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  // Filter and sort students
  let filteredStudents = allStudents;
  
  // Apply status filter
  if (filter !== 'all') {
    filteredStudents = allStudents.filter(s => s.status === filter);
  }
  
  // Apply search filter
  if (debouncedSearch) {
    const searchLower = debouncedSearch.toLowerCase();
    filteredStudents = filteredStudents.filter(s => {
      const student = s.student || {};
      return (
        student.fullName?.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.phone?.toLowerCase().includes(searchLower) ||
        student.domain?.domainName?.toLowerCase().includes(searchLower)
      );
    });
  }
  
  // Apply sorting
  if (sortBy === 'name') {
    filteredStudents.sort((a, b) => {
      const nameA = a.student?.fullName || '';
      const nameB = b.student?.fullName || '';
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
  } else if (sortBy === 'date') {
    filteredStudents.sort((a, b) => {
      const dateA = a.student?.internshipStartDate ? new Date(a.student.internshipStartDate) : new Date(0);
      const dateB = b.student?.internshipStartDate ? new Date(b.student.internshipStartDate) : new Date(0);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  } else if (sortBy === 'status') {
    const statusOrder = { NOT_STARTED: 1, ONGOING: 2, COMPLETED: 3 };
    filteredStudents.sort((a, b) => {
      const orderA = statusOrder[a.status] || 0;
      const orderB = statusOrder[b.status] || 0;
      if (orderA !== orderB) {
        return sortOrder === 'desc' ? orderB - orderA : orderA - orderB;
      }
      return (a.student?.fullName || '').localeCompare(b.student?.fullName || '');
    });
  }
  
  // Calculate status counts from all students
  const statusCounts = {
    all: allStudents.length,
    NOT_STARTED: allStudents.filter(s => s.status === 'NOT_STARTED').length,
    ONGOING: allStudents.filter(s => s.status === 'ONGOING').length,
    COMPLETED: allStudents.filter(s => s.status === 'COMPLETED').length,
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
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Internship Status</h1>
            <p className="text-gray-600">View and monitor all selected students' internship statuses</p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            {[
              { key: 'all', label: 'All', count: statusCounts.all },
              { key: 'NOT_STARTED', label: 'Not Started', count: statusCounts.NOT_STARTED },
              { key: 'ONGOING', label: 'Ongoing', count: statusCounts.ONGOING },
              { key: 'COMPLETED', label: 'Completed', count: statusCounts.COMPLETED },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No students found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SortButton field="name">Name</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Domain
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SortButton field="status">Status</SortButton>
                      </th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SortButton field="date">Start Date</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.student?.fullName || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {item.student?.domain?.domainName || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {item.student?.email || 'N/A'}
                          </div>
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.student?.internshipStartDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.student?.internshipEndDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {filteredStudents.length} of {allStudents.length} students
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InternshipStatusPage;
