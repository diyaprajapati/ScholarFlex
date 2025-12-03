import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';

const RetakePermissionsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [domains, setDomains] = useState([]);
  const [questionPapers, setQuestionPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [granting, setGranting] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    domain_id: '',
  });
  const [filters, setFilters] = useState({
    student_id: '',
    question_paper_id: '',
    is_active: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    const userData = authService.getUser();
    setUser(userData);
    
    // Check if user is ADMIN or SUPER_ADMIN
    if (userData?.role !== 'ADMIN' && userData?.role !== 'SUPER_ADMIN') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
    
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPermissions(),
        fetchStudents(),
        fetchDomains(),
        fetchQuestionPapers(),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const params = {};
      if (filters.student_id && filters.student_id !== '') {
        params.student_id = filters.student_id;
      }
      if (filters.question_paper_id && filters.question_paper_id !== '') {
        params.question_paper_id = filters.question_paper_id;
      }
      if (filters.is_active !== undefined && filters.is_active !== '') {
        params.is_active = filters.is_active;
      }
      
      const response = await api.admin.retakePermissions.getAll(params);
      setPermissions(response.permissions || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch permissions');
      console.error('Error fetching permissions:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.candidates.getAll();
      setStudents(response.candidates || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await api.domains.getAll();
      setDomains(response.data || []);
    } catch (err) {
      console.error('Error fetching domains:', err);
    }
  };

  const fetchQuestionPapers = async () => {
    try {
      const response = await api.questionPapers.getAll();
      setQuestionPapers(response.data || []);
    } catch (err) {
      console.error('Error fetching question papers:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPermissions();
    }
  }, [filters, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGranting(true);

    try {
      const response = await api.admin.retakePermissions.grantByDomain({
        student_id: parseInt(formData.student_id),
        domain_id: parseInt(formData.domain_id),
      });
      
      const message = response.granted?.length > 0 
        ? `Retake permissions granted successfully for ${response.granted.length} test(s)!`
        : 'No new permissions granted (all tests already have active permissions)';
      
      setSuccess(message);
      resetForm();
      fetchPermissions();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to grant permission');
      console.error('Error granting permission:', err);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (permission) => {
    if (!window.confirm(`Are you sure you want to revoke retake permission for ${permission.student_name} on test "${permission.paper_name}"?`)) {
      return;
    }

    try {
      await api.admin.retakePermissions.revoke({
        student_id: permission.student_id,
        question_paper_id: permission.question_paper_id,
      });
      
      setSuccess('Retake permission revoked successfully!');
      fetchPermissions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to revoke permission');
      console.error('Error revoking permission:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      domain_id: '',
    });
    setError('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.full_name : `Student #${studentId}`;
  };

  const getPaperName = (paperId) => {
    const paper = questionPapers.find(p => p.id === paperId);
    return paper ? paper.paper_name : `Paper #${paperId}`;
  };

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
            <h1 className="text-3xl font-semibold text-gray-900 mb-6">Test Retake Permissions</h1>
            
            {/* Grant Permission Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Grant Retake Permission</h2>
              <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label htmlFor="student_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Student <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="student_id"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label htmlFor="domain_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Domain <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="domain_id"
                    name="domain_id"
                    value={formData.domain_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select a domain</option>
                    {domains.map((domain) => (
                      <option key={domain.id} value={domain.id}>
                        {domain.domain_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={granting}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {granting ? 'Granting...' : 'Grant Permission'}
                </button>
              </form>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <select
                name="student_id"
                value={filters.student_id}
                onChange={handleFilterChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">All Students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} ({student.email})
                  </option>
                ))}
              </select>

              <select
                name="question_paper_id"
                value={filters.question_paper_id}
                onChange={handleFilterChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">All Tests</option>
                {questionPapers.map((paper) => (
                  <option key={paper.id} value={paper.id}>
                    {paper.paper_name}
                  </option>
                ))}
              </select>

              <select
                name="is_active"
                value={filters.is_active}
                onChange={handleFilterChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Revoked</option>
              </select>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              {success}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500 text-lg">Loading permissions...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        Student
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        Test
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        Reason
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        Granted By
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        Created At
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          No retake permissions found
                        </td>
                      </tr>
                    ) : (
                      permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{permission.student_name || getStudentName(permission.student_id)}</div>
                              <div className="text-gray-500 text-xs">{permission.student_email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {permission.paper_name || getPaperName(permission.question_paper_id)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {permission.reason || 'No reason provided'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                permission.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {permission.is_active ? 'Active' : 'Revoked'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div>{permission.granted_by_name || 'N/A'}</div>
                              <div className="text-xs text-gray-400">{permission.granted_by_email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(permission.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {permission.is_active && (
                              <button
                                className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                                onClick={() => handleRevoke(permission)}
                              >
                                Revoke
                              </button>
                            )}
                            {!permission.is_active && (
                              <span className="text-gray-400 text-sm">Already revoked</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RetakePermissionsPage;

