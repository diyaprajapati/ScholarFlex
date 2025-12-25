import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import api from '../../services/api';

const NOCTab = () => {
  const [nocData, setNocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchNOC();
  }, []);

  const fetchNOC = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.noc.getStudentNOC();
      if (response.success) {
        setNocData(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch NOC letter status');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file only');
        setSelectedFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setSelectedFile(null);
        return;
      }
      setError('');
      setSuccess('');
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file to upload');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const response = await api.noc.upload(selectedFile);
      
      if (response.success) {
        setSuccess('NOC letter uploaded successfully!');
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('noc-file-input');
        if (fileInput) fileInput.value = '';
        await fetchNOC();
      }
    } catch (err) {
      setError(err.message || 'Failed to upload NOC letter');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!nocData) return;

    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      const response = await api.noc.deleteStudentNOC(nocData.id);
      
      if (response.success) {
        setSuccess('NOC letter deleted successfully!');
        setNocData(null);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete NOC letter');
    } finally {
      setDeleting(false);
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

  const getStatusText = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING':
        return 'Pending Review';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-linear-to-r from-green-50 to-green-100 rounded-lg p-4 sm:p-6 border border-green-200">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          NOC Letter Upload
        </h2>
        <p className="text-sm sm:text-base text-gray-700">
          Upload your No Objection Certificate (NOC) letter in PDF format. The document will be reviewed by the admin.
        </p>
      </div>

      {/* Current Status */}
      {nocData && (
        <div className={`bg-white rounded-lg border-2 p-4 sm:p-6 ${getStatusColor(nocData.status)}`}>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {getStatusIcon(nocData.status)}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold">Current Status</h3>
                {/* Delete button - only show for PENDING or REJECTED status */}
                {(nocData.status === 'PENDING' || nocData.status === 'REJECTED') && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm font-medium mb-1">
                Status: <span className="font-bold">{getStatusText(nocData.status)}</span>
              </p>
              <p className="text-xs opacity-75 mb-1">
                File: {nocData.fileName}
              </p>
              <p className="text-xs opacity-75 mb-1">
                Uploaded: {new Date(nocData.uploadedAt).toLocaleString()}
              </p>
              {nocData.reviewedAt && (
                <p className="text-xs opacity-75">
                  Reviewed: {new Date(nocData.reviewedAt).toLocaleString()}
                </p>
              )}
              {nocData.reviewer && (
                <p className="text-xs opacity-75 mt-1">
                  Reviewed by: {nocData.reviewer.fullName || nocData.reviewer.email}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete NOC Letter?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this NOC letter? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  deleting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {(!nocData || nocData.status === 'REJECTED') && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            {nocData?.status === 'REJECTED' ? 'Upload New NOC Letter' : 'Upload NOC Letter'}
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="noc-file-input" className="block text-sm font-medium text-gray-700 mb-2">
                Select PDF File (Max 5MB)
              </label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="noc-file-input"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span>Choose File</span>
                </label>
                <input
                  id="noc-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span>{selectedFile.name}</span>
                    <span className="text-gray-500">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`w-full sm:w-auto px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  uploading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {uploading ? 'Uploading...' : 'Upload NOC Letter'}
              </button>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Note:</strong> Only PDF files are accepted. Maximum file size is 5MB. 
              Your NOC letter will be reviewed by the admin team.
            </p>
          </div>
        </div>
      )}

      {/* Info for Pending/Approved */}
      {nocData && (nocData.status === 'PENDING' || nocData.status === 'APPROVED') && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Information</h4>
              <p className="text-sm text-gray-700">
                {nocData.status === 'PENDING'
                  ? 'Your NOC letter is currently under review. You will be notified once the review is complete.'
                  : 'Your NOC letter has been approved. If you need to upload a new one, please contact the admin.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NOCTab;

