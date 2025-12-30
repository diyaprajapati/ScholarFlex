import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { Clock, CheckCircle, Calendar, Mail, User, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
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

    fetchDomains();
    fetchAllStatuses();
  }, [navigate, sortBy, sortOrder, debouncedSearch]);

  const fetchDomains = async () => {
    try {
      setIsLoadingDomains(true);
      const response = await api.domains.getAll();
      setDomains(response.domains || response.data || []);
    } catch (err) {
      console.error('Error fetching domains:', err);
    } finally {
      setIsLoadingDomains(false);
    }
  };

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
        bg: 'bg-green-100',
        text: 'text-green-800',
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
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-green-600 transition-colors"
    >
      {children}
      <ArrowUpDown className={`w-4 h-4 ${sortBy === field ? 'text-green-600' : 'text-gray-400'}`} />
      {sortBy === field && (
        <span className="text-xs text-green-600">
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
  
  // Apply domain filter
  if (selectedDomain) {
    filteredStudents = filteredStudents.filter(s => {
      const domainId = s.student?.domain?.id;
      return domainId && domainId.toString() === selectedDomain;
    });
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
  
  // Calculate status counts from all students (for accurate tab counts)
  const statusCounts = {
    all: allStudents.length,
    NOT_STARTED: allStudents.filter(s => s.status === 'NOT_STARTED').length,
    ONGOING: allStudents.filter(s => s.status === 'ONGOING').length,
    COMPLETED: allStudents.filter(s => s.status === 'COMPLETED').length,
  };

  // Apply pagination to filtered students
  const totalFiltered = filteredStudents.length;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

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

          {/* Search Bar and Domain Filter */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or domain..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={selectedDomain}
                onChange={(e) => {
                  setSelectedDomain(e.target.value);
                  setCurrentPage(1); // Reset to first page when domain filter changes
                }}
                disabled={isLoadingDomains}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                  isLoadingDomains ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'
                }`}
              >
                <option value="">All Domains</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.domain_name}
                  </option>
                ))}
              </select>
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
                onClick={() => {
                  setFilter(key);
                  setCurrentPage(1); // Reset to first page when filter changes
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  filter === key
                    ? 'border-green-500 text-green-600'
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : paginatedStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No students found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <SortButton field="date">Start Date</SortButton>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedStudents.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-green-100">
                                <User className="w-5 h-5 text-green-600" />
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
              </div>

              {/* Pagination */}
              {totalFiltered > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalFiltered)} of {totalFiltered} students
                    {filter !== 'all' && ` (${allStudents.length} total)`}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 border rounded-lg ${
                                currentPage === pageNum
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default InternshipStatusPage;
