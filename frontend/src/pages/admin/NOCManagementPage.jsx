import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { FileText, Download, CheckCircle, XCircle, Clock, Eye, AlertCircle, Archive } from 'lucide-react';

const NOCManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [nocLetters, setNocLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedNOC, setSelectedNOC] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingId, setUpdatingId] = useState(null); // Track which NOC is being updated
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
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
    
    fetchNOCLetters();
  }, [navigate, statusFilter, pagination.page]);

  const fetchNOCLetters = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.noc.getAll({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      if (response.success) {
        setNocLetters(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0,
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch NOC letters');
      console.error('Error fetching NOC letters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (noc) => {
    try {
      const url = await api.noc.download(noc.id);
      setSelectedNOC({ ...noc, url });
      setViewerOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to load NOC letter');
    }
  };

  const handleStatusUpdate = async (nocId, newStatus) => {
    if (updatingId === nocId) return; // Prevent double update
    
    try {
      setUpdating(true);
      setUpdatingId(nocId);
      setError('');
      setSuccess('');
      
      const response = await api.noc.updateStatus(nocId, newStatus);
      
      if (response.success) {
        setSuccess(response.message || `NOC letter ${newStatus.toLowerCase()} successfully`);
        await fetchNOCLetters();
        if (viewerOpen) {
          setViewerOpen(false);
          setSelectedNOC(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update NOC status');
    } finally {
      setUpdating(false);
      setUpdatingId(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloadingAll(true);
      setError('');
      setSuccess('');
      
      const status = statusFilter !== 'ALL' ? statusFilter : null;
      await api.noc.downloadAll(status);
      
      setSuccess('All NOC letters downloaded successfully as ZIP file');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to download NOC letters');
    } finally {
      setDownloadingAll(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">NOC Letter Management</h1>
            <p className="text-gray-600">Review and manage student NOC letters</p>
          </div>

          {/* Filters and Actions */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 cursor-pointer"
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll || pagination.total === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Archive className="w-5 h-5" />
              {downloadingAll ? 'Downloading...' : `Download All NOC (${pagination.total})`}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* NOC Letters Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
            </div>
          ) : nocLetters.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No NOC letters found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reviewed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nocLetters.map((noc) => (
                        <tr key={noc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {noc.student?.fullName || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">{noc.student?.email}</div>
                              {noc.student?.domain && (
                                <div className="text-xs text-gray-400">
                                  {noc.student.domain.domainName}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              {noc.fileName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                                noc.status
                              )}`}
                            >
                              {getStatusIcon(noc.status)}
                              {noc.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(noc.uploadedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {noc.reviewedAt
                              ? new Date(noc.reviewedAt).toLocaleDateString()
                              : '-'}
                            {noc.reviewer && (
                              <div className="text-xs text-gray-400">
                                by {noc.reviewer.fullName || noc.reviewer.email}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleView(noc)}
                                className="text-green-600 hover:text-green-900 flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              {noc.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleStatusUpdate(noc.id, 'APPROVED')}
                                    disabled={updatingId === noc.id || updating}
                                    className="text-green-600 hover:text-green-900 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    {updatingId === noc.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                                        Updating...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(noc.id, 'REJECTED')}
                                    disabled={updatingId === noc.id || updating}
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    {updatingId === noc.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                                        Updating...
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                      </>
                                    )}
                                  </button>
                                </>
                              )}
                              {noc.status === 'APPROVED' && (
                                <button
                                  onClick={() => handleStatusUpdate(noc.id, 'REJECTED')}
                                  disabled={updatingId === noc.id || updating}
                                  className="text-red-600 hover:text-red-900 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  title="Rejecting an approved NOC will delete it from the database"
                                >
                                  {updatingId === noc.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4" />
                                      Reject & Delete
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* PDF Viewer Modal */}
      {viewerOpen && selectedNOC && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-opacity-75 z-[70] flex items-center justify-center p-4"
          onClick={() => {
            setViewerOpen(false);
            setSelectedNOC(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedNOC.fileName} - {selectedNOC.student?.fullName}
              </h3>
              <div className="flex items-center gap-2">
                {selectedNOC.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(selectedNOC.id, 'APPROVED')}
                      disabled={updatingId === selectedNOC.id || updating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {updatingId === selectedNOC.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedNOC.id, 'REJECTED')}
                      disabled={updatingId === selectedNOC.id || updating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {updatingId === selectedNOC.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </>
                )}
                {selectedNOC.status === 'APPROVED' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedNOC.id, 'REJECTED')}
                    disabled={updatingId === selectedNOC.id || updating}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    title="Rejecting an approved NOC will delete it from the database"
                  >
                    {updatingId === selectedNOC.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Reject & Delete
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    setViewerOpen(false);
                    setSelectedNOC(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <iframe
                src={selectedNOC.url}
                className="w-full h-full min-h-[600px] border border-gray-200 rounded"
                title="NOC Letter Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NOCManagementPage;

