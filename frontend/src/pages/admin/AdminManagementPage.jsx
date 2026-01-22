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
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [showInactive, setShowInactive] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role_code: 'ADMIN',
  });

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
    if (isSubmitting) return; // Prevent double submission
    
    setError('');
    setSuccess('');

    try {
      setIsSubmitting(true);
      if (editingAdmin) {
        // Update admin
        const updateData = {
          full_name: formData.full_name,
          is_active: formData.is_active,
        };
        
        // Include email if it's different from current email (and not self)
        if (formData.email && formData.email !== editingAdmin.email && editingAdmin.id !== user?.id) {
          updateData.email = formData.email;
        }
        
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
    } finally {
      setIsSubmitting(false);
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

  const handleDeleteClick = (admin) => {
    setAdminToDelete(admin);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete || deletingId === adminToDelete.id) return;

    try {
      setDeletingId(adminToDelete.id);
      setError('');
      const response = await api.admin.delete(adminToDelete.id);
      
      // Check if the response indicates success
      if (!response || !response.success) {
        throw new Error(response?.message || 'Delete operation failed');
      }
      
      setSuccess('Admin deleted successfully!');
      setShowDeleteModal(false);
      setAdminToDelete(null);
      
      // Refresh the admin list
      await fetchAdmins();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete admin';
      setError(errorMessage);
      console.error('Error deleting admin:', err);
      // Keep the modal open so user can see the error
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setAdminToDelete(null);
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
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-6">Admin Management</h1>
          </div>

          {/* Admin Management Content */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold text-gray-900">Admin Management</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700">Show inactive admins</span>
              </label>
            </div>
            <button
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 cursor-pointer"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              + Create Admin
            </button>
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
            <div className="text-center py-12 text-gray-500 text-lg">Loading admins...</div>
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
                    {admins.filter(admin => {
                      // Handle both boolean and number (0/1) from MySQL
                      const isActive = admin.is_active === true || admin.is_active === 1 || admin.is_active === '1';
                      return showInactive || isActive;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                          {showInactive ? 'No admins found' : 'No active admins found'}
                        </td>
                      </tr>
                    ) : (
                      admins
                        .filter(admin => {
                          // Handle both boolean and number (0/1) from MySQL
                          const isActive = admin.is_active === true || admin.is_active === 1 || admin.is_active === '1';
                          return showInactive || isActive;
                        })
                        .map((admin) => {
                          // Normalize is_active for display
                          const normalizedAdmin = {
                            ...admin,
                            is_active: admin.is_active === true || admin.is_active === 1 || admin.is_active === '1'
                          };
                          return normalizedAdmin;
                        })
                        .map((admin) => (
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
                                className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer"
                                onClick={() => handleEdit(admin)}
                              >
                                Edit
                              </button>
                              {admin.id !== user?.id && (
                                <button
                                  className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                  onClick={() => handleDeleteClick(admin)}
                                  disabled={deletingId === admin.id}
                                >
                                  {deletingId === admin.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete'
                                  )}
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
                          disabled={editingAdmin && editingAdmin.id === user?.id}
                          placeholder="admin@example.com"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-gray-400 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        {editingAdmin && editingAdmin.id === user?.id && (
                          <p className="mt-1 text-xs text-gray-500">You cannot change your own email</p>
                        )}
                      </div>

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
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            {editingAdmin ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingAdmin ? 'Update Admin' : 'Create Admin'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && adminToDelete && (
            <>
              {/* Blurred Backdrop */}
              <div 
                className="fixed inset-0 z-100 bg-gray-900/20 backdrop-blur-md"
                onClick={handleDeleteCancel}
              ></div>
              
              {/* Modal Container */}
              <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
                <div
                  className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md transform transition-all pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Delete Admin
                      </h2>
                    </div>
                    <button
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                      onClick={handleDeleteCancel}
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="px-6 py-5">
                    <p className="text-gray-700 mb-4">
                      Are you sure you want to delete the admin account for <span className="font-semibold text-gray-900">{adminToDelete.email}</span>?
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-yellow-800">
                          This action will deactivate the admin account. The admin will no longer be able to access the system.
                        </p>
                      </div>
                    </div>
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                    <button
                      type="button"
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
                      onClick={handleDeleteCancel}
                      disabled={deletingId === adminToDelete.id}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === adminToDelete.id}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      onClick={handleDeleteConfirm}
                    >
                      {deletingId === adminToDelete.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Admin
                        </>
                      )}
                    </button>
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

export default AdminManagementPage;
