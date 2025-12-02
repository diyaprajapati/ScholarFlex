import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';

const AdminManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('admins'); // 'admins' | 'candidates'
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role_code: 'ADMIN',
  });

  // Candidate import tab state
  const [candidateFile, setCandidateFile] = useState(null);
  const [candidateUploading, setCandidateUploading] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [candidateResult, setCandidateResult] = useState(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    const userData = authService.getUser();
    setUser(userData);
    
    // Check if user is SUPER_ADMIN
    if (userData?.role !== 'SUPER_ADMIN') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
    
    fetchAdmins();
  }, [navigate]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getAll();
      setAdmins(response.admins || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch admins');
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingAdmin) {
        // Update admin
        const updateData = {
          full_name: formData.full_name,
          is_active: formData.is_active,
        };
        
        // Include role_code if it's different from current role
        if (formData.role_code && formData.role_code !== editingAdmin.role) {
          updateData.role_code = formData.role_code;
        }
        
        await api.admin.update(editingAdmin.id, updateData);
        setSuccess('Admin updated successfully!');
      } else {
        // Create admin
        await api.admin.create({
          email: formData.email,
          full_name: formData.full_name,
          role_code: formData.role_code,
        });
        setSuccess('Admin created successfully!');
      }

      setShowModal(false);
      resetForm();
      fetchAdmins();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Operation failed');
      console.error('Error saving admin:', err);
    }
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email,
      full_name: admin.full_name,
      role_code: admin.role,
      is_active: admin.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Are you sure you want to delete admin: ${email}?`)) {
      return;
    }

    try {
      await api.admin.delete(id);
      setSuccess('Admin deleted successfully!');
      fetchAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete admin');
      console.error('Error deleting admin:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role_code: 'ADMIN',
      is_active: true,
    });
    setEditingAdmin(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    setError('');
  };

  const handleCandidateFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCandidateFile(file);
    setCandidateError('');
  };

  const handleCandidateUpload = async (event) => {
    event.preventDefault();
    if (!candidateFile) {
      setCandidateError('Please select an Excel or CSV file to upload.');
      return;
    }

    setCandidateUploading(true);
    setCandidateError('');
    setCandidateResult(null);

    try {
      const response = await api.admin.uploadCandidatesSpreadsheet(candidateFile);
      // API wrapper may return data directly or nested under .data
      setCandidateResult(response.data || response);
    } catch (err) {
      console.error('Error uploading candidate spreadsheet:', err);
      setCandidateError(err.message || 'Failed to upload candidate spreadsheet. Please try again.');
    } finally {
      setCandidateUploading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                Admin & Candidate Tools
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Manage admin users and import candidate data from Excel.
              </p>
            </div>

            {activeTab === 'admins' && (
              <button
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-indigo-700 transition-colors duration-200"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                + Create Admin
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab('admins')}
                className={`whitespace-nowrap pb-2 px-1 border-b-2 text-xs sm:text-sm font-medium ${
                  activeTab === 'admins'
                    ? 'border-[#4C763B] text-[#043915]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Admin Management
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('candidates')}
                className={`whitespace-nowrap pb-2 px-1 border-b-2 text-xs sm:text-sm font-medium ${
                  activeTab === 'candidates'
                    ? 'border-[#4C763B] text-[#043915]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Candidate Excel Import
              </button>
            </nav>
          </div>

          {/* Alerts for admin tab */}
          {activeTab === 'admins' && error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          {activeTab === 'admins' && success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs sm:text-sm">
              {success}
            </div>
          )}

          {/* Admins tab content */}
          {activeTab === 'admins' && (
            <>
              {loading ? (
                <div className="text-center py-12 text-gray-500 text-sm sm:text-base">
                  Loading admins...
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            ID
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            Email
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            Full Name
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            Last Login
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
                        {admins.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                              No admins found
                            </td>
                          </tr>
                        ) : (
                          admins.map((admin) => (
                            <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {admin.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {admin.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {admin.full_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                    admin.role === 'SUPER_ADMIN'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {admin.role_name || admin.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                    admin.is_active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {admin.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(admin.last_login_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(admin.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  <button
                                    className="px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                                    onClick={() => handleEdit(admin)}
                                  >
                                    Edit
                                  </button>
                                  {admin.id !== user?.id && (
                                    <button
                                      className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                                      onClick={() => handleDelete(admin.id, admin.email)}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Candidate import tab content */}
          {activeTab === 'candidates' && (
            <div className="space-y-4 sm:space-y-5">
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
                <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                  Candidate Excel Import
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">
                  Upload an Excel (.xlsx / .xls) or CSV file. The system will extract{' '}
                  <span className="font-medium">
                    image URL, name, checkbox selected, mobile number, marks, reference name
                  </span>
                  .
                </p>
                <p className="text-[11px] sm:text-xs text-gray-500">
                  For images stored in Google Drive (links like{' '}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px] sm:text-[11px]">
                    https://drive.google.com/open?id=FILE_ID
                  </code>
                  ), we automatically generate a viewable image URL.
                </p>
              </div>

              <form
                onSubmit={handleCandidateUpload}
                className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleCandidateFileChange}
                    className="block w-full text-xs sm:text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-[#4C763B] file:text-white hover:file:bg-[#043915] cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={candidateUploading}
                    className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-[#4C763B] hover:bg-[#043915] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {candidateUploading ? 'Uploading...' : 'Upload & Extract'}
                  </button>
                </div>

                {candidateError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-800">
                    {candidateError}
                  </div>
                )}
              </form>

              {candidateResult && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                        Parsed Candidates
                      </h3>
                      <p className="text-[11px] sm:text-xs text-gray-500">
                        Total rows: {candidateResult.totalRows || candidateResult.candidates?.length || 0}. Parsed candidates:{' '}
                        {candidateResult.candidates?.length || 0}.
                      </p>
                    </div>
                  </div>

                  {candidateResult.candidates && candidateResult.candidates.length > 0 ? (
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="max-h-80 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                                Row
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                                Image
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                                Name
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                                Checkbox
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                                Mobile
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                                Marks
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                                Reference
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {candidateResult.candidates.map((c, index) => (
                              <tr key={`${c.rowIndex || index}-${c.name || 'candidate'}`}>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                  {c.rowIndex ?? index + 1}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                  {c.imageViewUrl || c.imageUrl ? (
                                    <a
                                      href={c.imageViewUrl || c.imageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800 underline"
                                    >
                                      View Image
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                                  {c.name || <span className="text-gray-400">N/A</span>}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                      c.checkboxSelected
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {c.checkboxSelected ? 'Selected' : 'Not selected'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                  {c.mobile || <span className="text-gray-400">N/A</span>}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                  {c.marks || <span className="text-gray-400">N/A</span>}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                                  {c.referenceName || <span className="text-gray-400">N/A</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500">
                      No candidates were parsed from the uploaded file.
                    </p>
                  )}

                  {candidateResult.failed && candidateResult.failed.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-[11px] sm:text-xs font-semibold text-yellow-900 mb-1">
                        Some rows could not be parsed ({candidateResult.failed.length}):
                      </p>
                      <p className="text-[11px] sm:text-xs text-yellow-800">
                        Check the console logs for detailed reasons and row data.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Create/Edit Modal */}
          {showModal && (
            <>
              {/* Blurred Backdrop - This will blur everything including header (TopNavbar is z-50) */}
              <div 
                className="fixed inset-0 z-100 bg-gray-900/20 backdrop-blur-md"
                onClick={handleCloseModal}
              ></div>
              
              {/* Modal Container */}
              <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
                <div
                  className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md transform transition-all pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {editingAdmin ? 'Edit Admin' : 'Create New Admin'}
                    </h2>
                    <button
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                      onClick={handleCloseModal}
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Form */}
                  <form onSubmit={handleSubmit} className="px-6 py-5">
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      {!editingAdmin && (
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="admin@example.com"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-gray-400"
                          />
                        </div>
                      )}

                      <div>
                        <label htmlFor="role_code" className="block text-sm font-medium text-gray-700 mb-2">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="role_code"
                          name="role_code"
                          value={formData.role_code}
                          onChange={handleInputChange}
                          required
                          disabled={editingAdmin && editingAdmin.id === user?.id}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-gray-400 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                        {editingAdmin && editingAdmin.id === user?.id && (
                          <p className="mt-1 text-xs text-gray-500">You cannot change your own role</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          required
                          minLength={2}
                          maxLength={255}
                          placeholder="John Doe"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-gray-400"
                        />
                      </div>

                      {editingAdmin && (
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              name="is_active"
                              checked={formData.is_active}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  is_active: e.target.checked,
                                }))
                              }
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                              Active Status
                            </span>
                          </label>
                        </div>
                      )}

                      {error && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-md text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modal Actions */}
                    <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                      <button
                        type="button"
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm"
                      >
                        {editingAdmin ? 'Update Admin' : 'Create Admin'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminManagementPage;
