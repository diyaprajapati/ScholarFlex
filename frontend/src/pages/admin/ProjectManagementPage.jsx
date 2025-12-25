import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { Plus, Edit, Trash2, Calendar, FileText, Search, X, User, Mail, Building2, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

const ProjectManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'NOT_STARTED', 'ONGOING', 'COMPLETED'
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const [quickAddForms, setQuickAddForms] = useState({});
  const [formData, setFormData] = useState({});

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

    fetchStudents();
  }, [navigate, currentPage, sortBy, sortOrder, debouncedSearch, statusFilter]);

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

      const response = await api.projects.getSelectedStudentsWithProjects({}, params.toString());
      if (response.success) {
        setStudents(response.data || []);
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

  const toggleStudentExpansion = (studentId) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const toggleQuickAddForm = (studentId) => {
    setQuickAddForms(prev => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
    if (!quickAddForms[studentId]) {
      setFormData(prev => ({
        ...prev,
        [studentId]: {
          projectTitle: '',
          projectDescription: '',
          deadline: '',
        },
      }));
    }
  };

  const handleQuickAddSubmit = async (studentId, e) => {
    e.preventDefault();
    try {
      setError('');
      const data = formData[studentId];
      if (!data || !data.projectTitle) {
        setError('Project title is required');
        return;
      }

      await api.projects.create({
        studentId,
        projectTitle: data.projectTitle,
        projectDescription: data.projectDescription || null,
        deadline: data.deadline || null,
      });

      // Reset form
      setFormData(prev => ({
        ...prev,
        [studentId]: {
          projectTitle: '',
          projectDescription: '',
          deadline: '',
        },
      }));
      setQuickAddForms(prev => ({
        ...prev,
        [studentId]: false,
      }));

      // Refresh data
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await api.projects.delete(projectId);
      fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to delete project');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Project Management</h1>
            <p className="text-gray-600">Assign and manage projects for selected students</p>
          </div>

          {/* Search Bar and Status Filter */}
          <div className="mb-6 flex gap-4">
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
            <div className="w-48">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
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
                          Projects
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => {
                        const isExpanded = expandedStudents.has(student.id);
                        const showQuickAdd = quickAddForms[student.id];
                        const studentFormData = formData[student.id] || {
                          projectTitle: '',
                          projectDescription: '',
                          deadline: '',
                        };

                        return (
                          <>
                            <tr key={student.id} className="group hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-green-100">
                                    <User className="w-5 h-5 text-green-600" />
                                  </div>
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
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {student.projects?.length || 0} project(s)
                                </div>
                                {student.projects && student.projects.length > 0 && (
                                  <button
                                    onClick={() => toggleStudentExpansion(student.id)}
                                    className="text-xs text-green-600 hover:text-green-800 mt-1 cursor-pointer"
                                  >
                                    {isExpanded ? 'Hide' : 'View'} projects
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50 z-10">
                                <button
                                  onClick={() => toggleQuickAddForm(student.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
                                  {showQuickAdd ? 'Cancel' : 'Add Project'}
                                </button>
                              </td>
                            </tr>
                            
                            {/* Quick Add Form Row */}
                            {showQuickAdd && (
                              <tr>
                                <td colSpan="5" className="px-6 py-4 bg-gray-50 sticky right-0 z-10">
                                  <form onSubmit={(e) => handleQuickAddSubmit(student.id, e)} className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Project Title *
                                        </label>
                                        <input
                                          type="text"
                                          required
                                          value={studentFormData.projectTitle}
                                          onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            [student.id]: {
                                              ...studentFormData,
                                              projectTitle: e.target.value,
                                            },
                                          }))}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          placeholder="Enter project title"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Deadline
                                        </label>
                                        <input
                                          type="date"
                                          value={studentFormData.deadline}
                                          onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            [student.id]: {
                                              ...studentFormData,
                                              deadline: e.target.value,
                                            },
                                          }))}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                      </div>
                                      <div className="flex items-end">
                                        <button
                                          type="submit"
                                          className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                                        >
                                          Assign Project
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Description
                                      </label>
                                      <textarea
                                        value={studentFormData.projectDescription}
                                        onChange={(e) => setFormData(prev => ({
                                          ...prev,
                                          [student.id]: {
                                            ...studentFormData,
                                            projectDescription: e.target.value,
                                          },
                                        }))}
                                        rows={2}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="Enter project description"
                                      />
                                    </div>
                                  </form>
                                </td>
                              </tr>
                            )}

                            {/* Projects List Row */}
                            {isExpanded && student.projects && student.projects.length > 0 && (
                              <tr>
                                <td colSpan="5" className="px-6 py-4 bg-gray-50">
                                  <div className="space-y-2">
                                    {student.projects.map((project) => (
                                      <div key={project.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-start">
                                        <div className="flex-1">
                                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                            {project.projectTitle}
                                          </h4>
                                          {project.projectDescription && (
                                            <p className="text-xs text-gray-600 mb-2">{project.projectDescription}</p>
                                          )}
                                          <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              Deadline: {formatDate(project.deadline)}
                                            </span>
                                            <span>
                                              Assigned: {new Date(project.createdAt).toLocaleDateString()}
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteProject(project.id)}
                                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
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
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, total)} of {total} students
                  </div>
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
                            className={`px-3 py-2 border rounded-lg cursor-pointer ${
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
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
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

export default ProjectManagementPage;
