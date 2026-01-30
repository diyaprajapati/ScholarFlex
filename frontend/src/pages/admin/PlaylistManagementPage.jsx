import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';

const PlaylistManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    domain: '',
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, playlist: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await Promise.all([fetchPlaylists(), fetchDomains()]);
    } catch (err) {
      setError(err.message || 'Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    try {
      // console.log('🔄 Fetching playlists...');
      const response = await api.playlists.getAll();
      // console.log('📦 Playlists API response:', response);
      // console.log('📦 Response keys:', Object.keys(response));
      // console.log('📦 Response.success:', response.success);
      // console.log('📦 Response.playlists:', response.playlists);
      
      if (response.success) {
        const playlistsArray = response.playlists || [];
        // console.log(`✅ Received ${playlistsArray.length} playlists:`, playlistsArray);
        setPlaylists(playlistsArray);
        if (playlistsArray.length === 0) {
          console.warn('⚠️ Playlists array is empty even though API succeeded');
        }
      } else {
        console.error('❌ API returned success: false', response);
        setError(response.message || 'Failed to fetch playlists');
      }
    } catch (err) {
      console.error('❌ Error fetching playlists:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      setError(err.message || 'Failed to fetch playlists');
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await api.domains.getAll();
      if (response.success) {
        setDomains(response.domains || []);
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
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
      if (editingPlaylist) {
        // Update playlist
        const response = await api.playlists.update(editingPlaylist.id, formData);
        if (response.success) {
          setSuccess('Playlist updated successfully!');
          setShowModal(false);
          resetForm();
          fetchPlaylists();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(response.message || 'Failed to update playlist');
        }
      } else {
        // Create playlist
        const response = await api.playlists.create(formData);
        if (response.success) {
          setSuccess('Playlist created successfully!');
          setShowModal(false);
          resetForm();
          fetchPlaylists();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(response.message || 'Failed to create playlist');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save playlist');
      console.error('Error saving playlist:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (playlist) => {
    setEditingPlaylist(playlist);
    setFormData({
      title: playlist.title,
      description: playlist.description || '',
      domain: playlist.domain?.id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.playlist) return;

    try {
      setIsDeleting(true);
      setError('');
      const response = await api.playlists.delete(deleteModal.playlist.id);
      if (response.success) {
        setSuccess('Playlist deleted successfully!');
        setDeleteModal({ isOpen: false, playlist: null });
        fetchPlaylists();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to delete playlist');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete playlist');
      console.error('Error deleting playlist:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      domain: '',
    });
    setEditingPlaylist(null);
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
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-semibold text-gray-900">Playlist Management</h1>
              <div className="flex gap-3">
                <button
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                  onClick={() => navigate(ROUTES.PLAYLISTS.ADD_VIDEOS)}
                >
                  Add Videos
                </button>
                <button
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 cursor-pointer"
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                >
                  + Create Playlist
                </button>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Playlists List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-4 text-gray-600">Loading playlists...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No playlists</h3>
              <p className="mt-2 text-sm text-gray-500">Get started by creating a new playlist.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Domain
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Videos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {playlists.map((playlist) => (
                      <tr key={playlist.id} className="group hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{playlist.title}</div>
                          {playlist.description && (
                            <div className="text-sm text-gray-500 mt-1">{playlist.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{playlist.domain?.name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{playlist.videoCount || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(playlist.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white group-hover:bg-gray-50 z-10">
                          <button
                            onClick={() => handleEdit(playlist)}
                            className="text-green-600 hover:text-green-900 mr-4 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, playlist })}
                            className="text-red-600 hover:text-red-900 cursor-pointer"
                          >
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

          {/* Create/Edit Modal */}
          {showModal && (
            <>
              <div 
                className="fixed inset-0 z-100 bg-gray-900/20 backdrop-blur-md"
                onClick={handleCloseModal}
              ></div>
              
              <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
                <div
                  className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md transform transition-all pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {editingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
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

                  <form onSubmit={handleSubmit} className="px-6 py-5">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          required
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter playlist title"
                        />
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows="3"
                          value={formData.description}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter playlist description (optional)"
                        />
                      </div>

                      <div>
                        <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                          Domain *
                        </label>
                        <select
                          id="domain"
                          name="domain"
                          required
                          value={formData.domain}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer"
                        >
                          <option value="">Select a domain</option>
                          {domains.map((domain) => (
                            <option key={domain.id} value={domain.id}>
                              {domain.domain_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            {editingPlaylist ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingPlaylist ? 'Update' : 'Create'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModal.isOpen && (
            <>
              <div 
                className="fixed inset-0 z-100 bg-gray-900/20 backdrop-blur-md"
                onClick={() => setDeleteModal({ isOpen: false, playlist: null })}
              ></div>
              
              <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
                <div
                  className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md transform transition-all pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Delete Playlist</h3>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-sm text-gray-600">
                      Are you sure you want to delete "{deleteModal.playlist?.title}"? This action cannot be undone.
                    </p>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                      onClick={() => setDeleteModal({ isOpen: false, playlist: null })}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
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

export default PlaylistManagementPage;

