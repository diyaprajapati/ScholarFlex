import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { Search, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';

const InstituteManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mergeModal, setMergeModal] = useState({
    isOpen: false,
    sourceName: '',
    targetName: '',
  });
  const [isMerging, setIsMerging] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    sourceName: '',
    targetName: '',
    studentCount: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInstituteName, setNewInstituteName] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

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

    fetchInstitutes();
  }, [navigate]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchInstitutes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.institutes.getStats();
      if (response.success) {
        setInstitutes(response.institutes || response.data || []);
      } else {
        setError(response.message || 'Failed to load institutes');
      }
    } catch (err) {
      console.error('Error fetching institutes:', err);
      setError(err.message || 'Failed to load institutes');
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutes = useMemo(() => {
    if (!debouncedSearch) return institutes;
    return institutes.filter((i) =>
      (i.institute_name || '').toLowerCase().includes(debouncedSearch)
    );
  }, [institutes, debouncedSearch]);

  const openMergeModal = (sourceName) => {
    setMergeModal({
      isOpen: true,
      sourceName,
      targetName: '',
    });
    setError('');
    setSuccess('');
  };

  const closeMergeModal = () => {
    setMergeModal({
      isOpen: false,
      sourceName: '',
      targetName: '',
    });
    setIsMerging(false);
  };

  const openDeleteModal = (institute) => {
    setDeleteModal({
      isOpen: true,
      sourceName: institute.institute_name,
      targetName: '',
      studentCount: institute.student_count ?? 0,
    });
    setError('');
    setSuccess('');
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      sourceName: '',
      targetName: '',
      studentCount: 0,
    });
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    const source = deleteModal.sourceName.trim();
    const target = deleteModal.targetName.trim();

    if (!source) return;

    if (!target) {
      setError('Please select a target institute to move students into');
      return;
    }

    if (source.toLowerCase() === target.toLowerCase()) {
      setError('Source and target institute names must be different');
      return;
    }

    try {
      setIsDeleting(true);
      setError('');
      setSuccess('');

      const response = await api.institutes.merge({
        source_name: source,
        target_name: target,
      });

      if (response.success) {
        setSuccess('Institute deleted successfully');
        closeDeleteModal();
        fetchInstitutes();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to delete institute');
      }
    } catch (err) {
      console.error('Error deleting institute:', err);
      setError(err.message || 'Failed to delete institute');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmMerge = async () => {
    const source = mergeModal.sourceName.trim();
    const target = mergeModal.targetName.trim();

    if (!source || !target) {
      setError('Both source and target institute names are required');
      return;
    }
    if (source.toLowerCase() === target.toLowerCase()) {
      setError('Source and target institute names must be different');
      return;
    }

    try {
      setIsMerging(true);
      setError('');
      setSuccess('');
      const response = await api.institutes.merge({
        source_name: source,
        target_name: target,
      });
      if (response.success) {
        setSuccess('Institute merged successfully');
        closeMergeModal();
        fetchInstitutes();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to merge institutes');
      }
    } catch (err) {
      console.error('Error merging institutes:', err);
      setError(err.message || 'Failed to merge institutes');
    } finally {
      setIsMerging(false);
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Institute Management</h1>
              <p className="mt-1 text-gray-600 text-sm">
                View all institutes, how many students are in each, and merge or standardize names.
              </p>
            </div>
            {/* <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((prev) => !prev);
                  setAddError('');
                  setAddSuccess('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 cursor-pointer"
              >
                {showAddForm ? 'Close' : 'Add Institute'}
              </button>
            </div> */}
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

          {/* Add Institute (client-side helper for merge targets) */}
          {showAddForm && (
            <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Add New Institute</h2>
              {addError && (
                <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {addError}
                </div>
              )}
              {addSuccess && (
                <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  {addSuccess}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newInstituteName.trim();
                  if (!name) {
                    setAddError('Institute name is required');
                    return;
                  }
                  if (
                    institutes.some(
                      (i) => (i.institute_name || '').toLowerCase() === name.toLowerCase()
                    )
                  ) {
                    setAddError('An institute with this name already exists');
                    return;
                  }
                  setInstitutes((prev) => [
                    ...prev,
                    { institute_name: name, student_count: 0, _virtual: true },
                  ]);
                  setNewInstituteName('');
                  setAddError('');
                  setAddSuccess('Institute added locally. You can now merge others into it.');
                  setTimeout(() => setAddSuccess(''), 3000);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Institute Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newInstituteName}
                    onChange={(e) => setNewInstituteName(e.target.value)}
                    placeholder="e.g., XYZ College of Engineering"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setAddError('');
                      setAddSuccess('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer"
                  >
                    Save
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
                placeholder="Search by institute name..."
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
          ) : filteredInstitutes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
              <p className="text-gray-500 text-sm">No institutes found.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Institute Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInstitutes.map((inst) => (
                      <tr key={inst.institute_name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {inst.institute_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {inst.student_count ?? 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openMergeModal(inst.institute_name)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 cursor-pointer"
                            >
                              <ArrowRight className="w-4 h-4" />
                              Merge
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(inst)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Merge / Rename Modal */}
        {mergeModal.isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={closeMergeModal}
            ></div>
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div
                className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Merge / Rename Institute</h2>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    Move all students from this institute name into a new or existing institute name.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current institute name
                    </label>
                    <input
                      type="text"
                      value={mergeModal.sourceName}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Merge into (target name)
                    </label>
                    <select
                      value={mergeModal.targetName}
                      onChange={(e) =>
                        setMergeModal((prev) => ({ ...prev, targetName: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select target institute</option>
                      {institutes
                        .filter((i) => i.institute_name !== mergeModal.sourceName)
                        .map((i) => (
                          <option key={i.institute_name} value={i.institute_name}>
                            {i.institute_name} ({i.student_count ?? 0} students)
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Pick from existing institutes or type a new standardized name.
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeMergeModal}
                    disabled={isMerging}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMerge}
                    disabled={isMerging}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isMerging ? 'Merging...' : 'Merge'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete / Merge Modal */}
        {deleteModal.isOpen && (
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
                  <h2 className="text-lg font-semibold text-gray-900">Delete Institute</h2>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    You are about to delete the institute{' '}
                    <span className="font-semibold">{deleteModal.sourceName}</span>.
                  </p>
                  {deleteModal.studentCount > 0 && (
                    <>
                      <p className="text-sm text-red-600">
                        This institute currently has{' '}
                        <span className="font-semibold">
                          {deleteModal.studentCount} student
                          {deleteModal.studentCount !== 1 ? 's' : ''}
                        </span>{' '}
                        assigned.
                      </p>
                      <p className="text-sm text-gray-700">
                        To avoid losing this information, please select another institute to move
                        these students into.
                      </p>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Move students into
                        </label>
                        <select
                          value={deleteModal.targetName}
                          onChange={(e) =>
                            setDeleteModal((prev) => ({
                              ...prev,
                              targetName: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select target institute</option>
                          {institutes
                            .filter((i) => i.institute_name !== deleteModal.sourceName)
                            .map((i) => (
                              <option key={i.institute_name} value={i.institute_name}>
                                {i.institute_name} ({i.student_count ?? 0} students)
                              </option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This will hide the institute from future selections while keeping historical
                    data intact.
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting || !deleteModal.targetName}
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
                        Delete Institute
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

export default InstituteManagementPage;

