import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { Search, Trash2, AlertTriangle } from 'lucide-react';

const DomainManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    domain: null,
    targetDomainId: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainDescription, setNewDomainDescription] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

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
  }, [navigate]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.domains.getStats();
      if (response.success) {
        setDomains(response.domains || response.data || []);
      } else {
        setError(response.message || 'Failed to load domains');
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
      setError(err.message || 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (addLoading) return;

    setAddError('');
    setSuccess('');

    const name = newDomainName.trim();
    if (!name) {
      setAddError('Domain name is required');
      return;
    }

    try {
      setAddLoading(true);
      const response = await api.domains.create({
        domain_name: name,
        description: newDomainDescription.trim() || undefined,
      });

      if (response.success) {
        setSuccess('Domain created successfully');
        setNewDomainName('');
        setNewDomainDescription('');
        setShowAddForm(false);
        await fetchDomains();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setAddError(response.message || 'Failed to create domain');
      }
    } catch (err) {
      console.error('Error creating domain:', err);
      setAddError(err.message || 'Failed to create domain');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredDomains = useMemo(() => {
    if (!debouncedSearch) return domains;
    return domains.filter((d) => {
      const name = d.domain_name || '';
      const code = d.domain_code || '';
      const desc = d.description || '';
      return (
        name.toLowerCase().includes(debouncedSearch) ||
        code.toLowerCase().includes(debouncedSearch) ||
        desc.toLowerCase().includes(debouncedSearch)
      );
    });
  }, [domains, debouncedSearch]);

  const openDeleteModal = (domain) => {
    setDeleteModal({
      isOpen: true,
      domain,
      targetDomainId: '',
    });
    setError('');
    setSuccess('');
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      domain: null,
      targetDomainId: '',
    });
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.domain) return;
    try {
      setIsDeleting(true);
      setError('');
      setSuccess('');

      const payload = {};
      if (deleteModal.targetDomainId) {
        payload.target_domain_id = parseInt(deleteModal.targetDomainId, 10);
      }

      const response = await api.domains.delete(deleteModal.domain.id, payload);
      if (response.success) {
        setSuccess('Domain deleted successfully');
        closeDeleteModal();
        fetchDomains();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to delete domain');
      }
    } catch (err) {
      console.error('Error deleting domain:', err);
      setError(err.message || 'Failed to delete domain');
    } finally {
      setIsDeleting(false);
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
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Domain Management</h1>
              <p className="mt-1 text-gray-600 text-sm">
                View all domains, how many students are in each, and clean up duplicates.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((prev) => !prev);
                  setAddError('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 cursor-pointer"
              >
                {showAddForm ? 'Close' : 'Add Domain'}
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Add Domain Form */}
          {showAddForm && (
            <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Add New Domain</h2>
              {addError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {addError}
                </div>
              )}
              <form onSubmit={handleAddDomain} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="e.g., Full Stack / MERN"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newDomainDescription}
                    onChange={(e) => setNewDomainDescription(e.target.value)}
                    placeholder="Short description for this domain"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setAddError('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={addLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addLoading ? 'Saving...' : 'Save Domain'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by domain name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
              <p className="text-gray-500 text-sm">No domains found.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Domain Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDomains.map((domain) => (
                      <tr key={domain.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {domain.domain_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {domain.domain_code || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {domain.student_count ?? 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                          <span className="line-clamp-2">{domain.description || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => openDeleteModal(domain)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Delete / Merge Modal */}
        {deleteModal.isOpen && deleteModal.domain && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={closeDeleteModal}
            ></div>
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div
                className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Delete Domain</h2>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    You are about to delete the domain{' '}
                    <span className="font-semibold">{deleteModal.domain.domain_name}</span>.
                  </p>
                  {deleteModal.domain.student_count > 0 ? (
                    <>
                      <p className="text-sm text-red-600">
                        This domain currently has{' '}
                        <span className="font-semibold">
                          {deleteModal.domain.student_count} student
                          {deleteModal.domain.student_count !== 1 ? 's' : ''}
                        </span>{' '}
                        assigned.
                      </p>
                      <p className="text-sm text-gray-700">
                        To avoid losing this information, please select another domain to move these
                        students into.
                      </p>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Merge students into
                        </label>
                        <select
                          value={deleteModal.targetDomainId}
                          onChange={(e) =>
                            setDeleteModal((prev) => ({
                              ...prev,
                              targetDomainId: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select target domain</option>
                          {domains
                            .filter((d) => d.id !== deleteModal.domain.id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.domain_name} ({d.student_count ?? 0} students)
                              </option>
                            ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700">
                      This domain has no students assigned. It is safe to delete.
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This will hide the domain from future selections while keeping historical data
                    intact.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={
                      isDeleting ||
                      (deleteModal.domain.student_count > 0 && !deleteModal.targetDomainId)
                    }
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Domain
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DomainManagementPage;

