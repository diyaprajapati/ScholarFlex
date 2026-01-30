import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import StudentEvaluationsModal from '../../components/admin/StudentEvaluationsModal';
import api from '../../services/api';
import { Plus, Search, X, User, Mail, Building2, ChevronLeft, ChevronRight, ArrowUpDown, Eye, AlertCircle, Clock, Calendar, CheckCircle, Download, Star, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const EvaluationManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'NOT_STARTED', 'ONGOING', 'COMPLETED'
  const [evaluationFilter, setEvaluationFilter] = useState([]); // Array of week numbers as strings or 'never_done'
  const [domainFilter, setDomainFilter] = useState([]); // Array of Domain IDs for multi-select
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [domains, setDomains] = useState([]); // List of all domains
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [quickAddForms, setQuickAddForms] = useState({});
  const [formData, setFormData] = useState({});
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [showEvaluationsModal, setShowEvaluationsModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [submittingForms, setSubmittingForms] = useState(new Set()); // Track which student's form is submitting
  const [showFilters, setShowFilters] = useState(false); // Toggle filter panel visibility

  // Helper function to get image URL
  const getImageUrl = (url) => {
    if (!url) return null;

    // If it's already a full URL (http/https), use it directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If it's a Google Drive URL
    if (url.includes('thumbnail?id=')) return url;

    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = openMatch ? openMatch[1] : (fileMatch ? fileMatch[1] : null);

    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    }

    // If it's a relative path (uploaded file), construct full URL
    // Handle both /uploads/ prefix and /scholarflex/ or /students/ paths (which need /uploads/ prepended)
    let filePath = url;
    if (url.startsWith('/scholarflex/') || url.startsWith('/students/')) {
      filePath = `/uploads${url}`;
    } else if (!url.startsWith('/uploads/')) {
      filePath = `/uploads${url}`;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    return baseUrl.replace('/api', '') + filePath;
  };

  const handleImageError = (imageKey) => (e) => {
    setFailedImages(prev => new Set([...prev, imageKey]));
    e.target.style.display = 'none';
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
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
    fetchStudents();
  }, [navigate, currentPage, sortBy, sortOrder, debouncedSearch, statusFilter, domainFilter, evaluationFilter]);

  const fetchDomains = async () => {
    try {
      const response = await api.domains.getAll();
      if (response.success) {
        setDomains(response.domains || response.data || []);
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (domainFilter.length > 0) {
        domainFilter.forEach(id => params.append('domainId', id));
      }
      if (evaluationFilter.length > 0) {
        evaluationFilter.forEach(filter => params.append('evaluationFilter', filter));
      }

      const response = await api.internshipStatus.getAllStatuses({}, params.toString());
      if (response.success) {
        const studentsData = response.data || [];
        // console.log('Evaluation API Response - Sample item:', studentsData[0]);
        // console.log('Evaluation API Response - Student imageUrl:', studentsData[0]?.student?.imageUrl);
        setStudents(studentsData);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotal(response.pagination.total || 0);
        }
      } else {
        setError('Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const toggleQuickAddForm = (studentId, status) => {
    if (status !== 'ONGOING') {
      setError('Evaluations can only be created for ONGOING internships');
      return;
    }
    setQuickAddForms(prev => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
    if (!quickAddForms[studentId]) {
      setFormData(prev => ({
        ...prev,
        [studentId]: {
          weekNo: '',
          evaluationData: {
            technicalSkills: '',
            communication: '',
            behavior: '',
            projectProgress: '',
            overallRating: '',
            notes: '',
          },
        },
      }));
    }
  };

  const handleQuickAddSubmit = async (studentId, status, e) => {
    e.preventDefault();
    if (submittingForms.has(studentId)) return; // Prevent double submission

    if (status !== 'ONGOING') {
      setError('Evaluations can only be created for ONGOING internships');
      return;
    }

    try {
      setSubmittingForms(prev => new Set([...prev, studentId]));
      setError('');
      const data = formData[studentId];
      if (!data || !data.weekNo) {
        setError('Week number is required');
        setSubmittingForms(prev => {
          const newSet = new Set(prev);
          newSet.delete(studentId);
          return newSet;
        });
        return;
      }

      await api.evaluations.create({
        studentId,
        weekNo: parseInt(data.weekNo),
        evaluationData: data.evaluationData,
      });

      // Reset form
      setFormData(prev => ({
        ...prev,
        [studentId]: {
          weekNo: '',
          evaluationData: {
            technicalSkills: '',
            communication: '',
            behavior: '',
            projectProgress: '',
            overallRating: '',
            notes: '',
          },
        },
      }));
      setQuickAddForms(prev => ({
        ...prev,
        [studentId]: false,
      }));

      // Refresh data
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to create evaluation');
    } finally {
      setSubmittingForms(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const handleViewEvaluations = (student) => {
    setSelectedStudentForModal(student);
    setShowEvaluationsModal(true);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setError('');
      await api.evaluations.export(
        domainFilter.length > 0 ? domainFilter : null,
        exportStartDate || null,
        exportEndDate || null
      );
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      setError(err.message || 'Failed to export evaluations to Excel');
    } finally {
      setExporting(false);
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

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-green-600 transition-colors cursor-pointer"
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

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Evaluation Management</h1>
              <p className="text-gray-600">Create and manage weekly evaluations for selected students (ONGOING internships only)</p>
            </div>
            <button
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Exporting...' : 'Export to Excel'}
            </button>
          </div>

          {/* Search Bar and Filter Button */}
          <div className="mb-4 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
              {showFilters ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          {/* Collapsible Filters Section */}
          {showFilters && (
            <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex gap-4 flex-wrap">
                <div className="w-48">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[300px]">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Missing Evaluations (Select Multiple)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-gray-50">
                    <label className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={evaluationFilter.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEvaluationFilter([]);
                          }
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">All Evaluations</span>
                    </label>
                    <div className="border-t border-gray-300 my-1"></div>
                    <label className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={evaluationFilter.includes('never_done')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEvaluationFilter([...evaluationFilter, 'never_done']);
                          } else {
                            setEvaluationFilter(evaluationFilter.filter(f => f !== 'never_done'));
                          }
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">Never Done</span>
                    </label>
                    <div className="border-t border-gray-300 my-1"></div>
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((week) => (
                        <label
                          key={week}
                          className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={evaluationFilter.includes(week.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEvaluationFilter([...evaluationFilter, week.toString()]);
                              } else {
                                setEvaluationFilter(evaluationFilter.filter(f => f !== week.toString()));
                              }
                              setCurrentPage(1);
                            }}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Week {week}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {evaluationFilter.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {evaluationFilter.length} filter{evaluationFilter.length === 1 ? '' : 's'} selected
                    </p>
                  )}
                </div>
                <div className="flex-1 min-w-[300px]">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Domains (Select Multiple)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-gray-50">
                    {domains.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">Loading domains...</p>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={domainFilter.length === 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDomainFilter([]);
                              }
                              setCurrentPage(1);
                            }}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">All Domains</span>
                        </label>
                        <div className="border-t border-gray-300 my-1"></div>
                        {domains.map((domain) => (
                          <label
                            key={domain.id}
                            className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={domainFilter.includes(domain.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDomainFilter([...domainFilter, domain.id]);
                                } else {
                                  setDomainFilter(domainFilter.filter(id => id !== domain.id));
                                }
                                setCurrentPage(1);
                              }}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">
                              {domain.domain_name || domain.domainName}
                            </span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                  {domainFilter.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {domainFilter.length} domain{domainFilter.length === 1 ? '' : 's'} selected
                    </p>
                  )}
                </div>
              </div>

              {/* Date Filter for Export */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                  Filter by Evaluation Date
                </p>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="pb-1 text-xs text-info-600 italic flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Downloads evaluations submitted in this range
                  </div>
                  {(exportStartDate || exportEndDate) && (
                    <button
                      onClick={() => {
                        setExportStartDate('');
                        setExportEndDate('');
                      }}
                      className="pb-1.5 text-xs text-red-600 hover:text-red-800 underline cursor-pointer"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : students.length === 0 ? (
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
                          <SortButton field="status">Status</SortButton>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((item) => {
                        const student = item.student;
                        const status = item.status;
                        const showQuickAdd = quickAddForms[student.id];
                        const studentFormData = formData[student.id] || {
                          weekNo: '',
                          evaluationData: {
                            technicalSkills: '',
                            communication: '',
                            behavior: '',
                            projectProgress: '',
                            overallRating: '',
                            notes: '',
                          },
                        };

                        return (
                          <>
                            <tr key={item.id} className="group hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {(() => {
                                    const imageUrl = student.imageUrl;
                                    const imageKey = `eval-${student.id}`;
                                    const hasFailed = failedImages.has(imageKey);

                                    if (imageUrl && !hasFailed) {
                                      const url = getImageUrl(imageUrl);
                                      // console.log('Evaluation page - Student image:', { studentId: student.id, imageUrl, constructedUrl: url });
                                      return (
                                        <img
                                          src={url}
                                          alt={student.fullName}
                                          className="shrink-0 h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                                          onError={handleImageError(imageKey)}
                                          // onLoad={() => console.log('Image loaded successfully:', url)}
                                          loading="lazy"
                                        />
                                      );
                                    }
                                    // console.log('Evaluation page - No image or failed:', { studentId: student.id, imageUrl, hasFailed });
                                    return (
                                      <div className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-green-100">
                                        <User className="w-5 h-5 text-green-600" />
                                      </div>
                                    );
                                  })()}
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.fullName || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {student.domain?.domainName || 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {student.email || 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(status)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50 z-10">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleViewEvaluations(student)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View All
                                  </button>
                                  {status === 'ONGOING' && (
                                    <button
                                      onClick={() => toggleQuickAddForm(student.id, status)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-4 h-4" />
                                      {showQuickAdd ? 'Cancel' : 'New Evaluation'}
                                    </button>
                                  )}
                                  {status !== 'ONGOING' && (
                                    <span className="text-xs text-gray-500 italic">
                                      Only ONGOING students can be evaluated
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Quick Add Form Row */}
                            {showQuickAdd && status === 'ONGOING' && (
                              <tr>
                                <td colSpan="5" className="px-6 py-4 bg-gray-50 sticky right-0 z-10">
                                  <form onSubmit={(e) => handleQuickAddSubmit(student.id, status, e)} className="space-y-3 w-[93%]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Week Number *
                                        </label>
                                        <input
                                          type="number"
                                          required
                                          min="1"
                                          value={studentFormData.weekNo}
                                          onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            [student.id]: {
                                              ...studentFormData,
                                              weekNo: e.target.value,
                                            },
                                          }))}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          placeholder="Enter week number"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Overall Rating (Stars)
                                        </label>
                                        <div className="flex items-center gap-2">
                                          {[1, 2, 3, 4, 5].map((star) => {
                                            const rating = parseInt(studentFormData.evaluationData.overallRating) || 0;
                                            return (
                                              <button
                                                key={star}
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                  ...prev,
                                                  [student.id]: {
                                                    ...studentFormData,
                                                    evaluationData: {
                                                      ...studentFormData.evaluationData,
                                                      overallRating: star.toString(),
                                                    },
                                                  },
                                                }))}
                                                className="focus:outline-none"
                                              >
                                                <Star
                                                  className={`w-6 h-6 transition-colors ${star <= rating
                                                    ? 'text-yellow-400 fill-yellow-400'
                                                    : 'text-gray-300'
                                                    }`}
                                                />
                                              </button>
                                            );
                                          })}
                                          {studentFormData.evaluationData.overallRating && (
                                            <span className="text-sm text-gray-600 ml-2">
                                              ({studentFormData.evaluationData.overallRating} {parseInt(studentFormData.evaluationData.overallRating) === 1 ? 'star' : 'stars'})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Technical Skills
                                        </label>
                                        <textarea
                                          value={studentFormData.evaluationData.technicalSkills}
                                          onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            [student.id]: {
                                              ...studentFormData,
                                              evaluationData: {
                                                ...studentFormData.evaluationData,
                                                technicalSkills: e.target.value,
                                              },
                                            },
                                          }))}
                                          rows={3}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          placeholder="Technical skills evaluation..."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Communication
                                        </label>
                                        <textarea
                                          value={studentFormData.evaluationData.communication}
                                          onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            [student.id]: {
                                              ...studentFormData,
                                              evaluationData: {
                                                ...studentFormData.evaluationData,
                                                communication: e.target.value,
                                              },
                                            },
                                          }))}
                                          rows={3}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          placeholder="Communication evaluation..."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Behavior
                                        </label>
                                        <textarea
                                          value={studentFormData.evaluationData.behavior}
                                          onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            [student.id]: {
                                              ...studentFormData,
                                              evaluationData: {
                                                ...studentFormData.evaluationData,
                                                behavior: e.target.value,
                                              },
                                            },
                                          }))}
                                          rows={3}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          placeholder="Behavior evaluation..."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Project Progress
                                        </label>
                                        <textarea
                                          value={studentFormData.evaluationData.projectProgress}
                                          onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            [student.id]: {
                                              ...studentFormData,
                                              evaluationData: {
                                                ...studentFormData.evaluationData,
                                                projectProgress: e.target.value,
                                              },
                                            },
                                          }))}
                                          rows={3}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          placeholder="Project progress evaluation..."
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Notes
                                      </label>
                                      <textarea
                                        value={studentFormData.evaluationData.notes}
                                        onChange={(e) => setFormData(prev => ({
                                          ...prev,
                                          [student.id]: {
                                            ...studentFormData,
                                            evaluationData: {
                                              ...studentFormData.evaluationData,
                                              notes: e.target.value,
                                            },
                                          },
                                        }))}
                                        rows={2}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="Additional notes..."
                                      />
                                    </div>
                                    <div className="flex justify-end">
                                      <button
                                        type="submit"
                                        disabled={submittingForms.has(student.id)}
                                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                      >
                                        {submittingForms.has(student.id) ? (
                                          <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Creating...
                                          </>
                                        ) : (
                                          'Create Evaluation'
                                        )}
                                      </button>
                                    </div>
                                  </form>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, total)} of {total} students
                  </div>
                  {totalPages > 1 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
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
                              className={`px-3 py-2 border rounded-lg cursor-pointer ${currentPage === pageNum
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
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
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

        {/* Student Evaluations Modal */}
        <StudentEvaluationsModal
          student={selectedStudentForModal}
          isOpen={showEvaluationsModal}
          onClose={() => {
            setShowEvaluationsModal(false);
            setSelectedStudentForModal(null);
          }}
          onRefresh={fetchStudents}
        />
      </main>
    </div>
  );
};

export default EvaluationManagementPage;
