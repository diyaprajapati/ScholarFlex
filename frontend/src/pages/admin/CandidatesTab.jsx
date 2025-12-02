import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

const CandidatesTab = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.candidates.getAll();
      setStudents(response.candidates || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch students');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (id) => {
    try {
      const response = await api.candidates.getById(id);
      setSelectedStudent(response.student);
      setShowDetailsModal(true);
    } catch (err) {
      alert(err.message || 'Failed to fetch student details');
      console.error('Error fetching student details:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setUploadResult(null);
      
      const response = await api.candidates.uploadSpreadsheet(file);
      
      if (response.success) {
        setUploadResult({
          success: true,
          message: response.message,
          data: response.data,
        });
        setSuccess(response.message);
        fetchStudents();
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload spreadsheet. Please try again.');
      setUploadResult({
        success: false,
        message: err.message || 'Failed to upload spreadsheet',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGoogleSheetsImport = async () => {
    if (!googleSheetsUrl.trim()) {
      setError('Please enter a Google Sheets URL');
      return;
    }

    try {
      setImporting(true);
      setError('');
      setSuccess('');
      
      const response = await api.candidates.importFromGoogleSheets(googleSheetsUrl);
      
      if (response.success) {
        setSuccess(response.message);
        setGoogleSheetsUrl('');
        setShowImportModal(false);
        fetchStudents();
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import from Google Sheets');
    } finally {
      setImporting(false);
    }
  };

  // Convert Google Drive link to embeddable format
  const getImageUrl = (url) => {
    if (!url) return null;
    
    if (url.includes('thumbnail?id=')) return url;
    
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = openMatch ? openMatch[1] : (fileMatch ? fileMatch[1] : null);
    
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : url;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = students.slice(startIndex, endIndex);

  // Reset to page 1 when students list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [students.length]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Header with Upload */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">Students</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            disabled={importing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import from Google Sheets'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Spreadsheet'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {success}
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className={`p-4 rounded-lg border ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`font-semibold ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
            {uploadResult.message}
          </p>
          {uploadResult.data && uploadResult.data.details && (
            <div className="mt-3 space-y-2">
              {uploadResult.data.details.created && uploadResult.data.details.created.length > 0 && (
                <div className="text-sm text-green-700">
                  <p className="font-medium">Created ({uploadResult.data.details.created.length}):</p>
                  <ul className="list-disc list-inside mt-1">
                    {uploadResult.data.details.created.slice(0, 5).map((item, idx) => (
                      <li key={idx}>{item.name} ({item.email})</li>
                    ))}
                    {uploadResult.data.details.created.length > 5 && (
                      <li>... and {uploadResult.data.details.created.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
              {uploadResult.data.details.failed && uploadResult.data.details.failed.length > 0 && (
                <div className="text-sm text-red-700">
                  <p className="font-medium">Failed ({uploadResult.data.details.failed.length}):</p>
                  <ul className="list-disc list-inside mt-1 max-h-40 overflow-y-auto">
                    {uploadResult.data.details.failed.map((item, idx) => (
                      <li key={idx}>Row {item.row}: {item.email} - {item.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-lg">Loading students...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Image</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Mobile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Marks</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Reference</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No students found. Upload a spreadsheet or import from Google Sheets to get started.
                    </td>
                  </tr>
                ) : (
                  currentStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        {student.image_url ? (
                          <img
                            src={getImageUrl(student.image_url)}
                            alt={student.full_name}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/64?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.mobile_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {student.marks !== null && student.marks !== undefined ? `${student.marks.toFixed(2)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {student.reference_information || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            student.status === 'Active' || student.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {student.status || (student.is_active ? 'Active' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => fetchStudentDetails(student.id)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {students.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, students.length)}</span> of{' '}
                    <span className="font-medium">{students.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <>
          <div 
            className="fixed inset-0 z-100 bg-gray-900/20 backdrop-blur-md"
            onClick={() => setShowDetailsModal(false)}
          ></div>
          
          <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-2xl transform transition-all pointer-events-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-semibold text-gray-900">Student Details</h2>
                <button
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                  onClick={() => setShowDetailsModal(false)}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image */}
                  <div className="md:col-span-2 flex justify-center">
                    {selectedStudent.image_url ? (
                      <img
                        src={getImageUrl(selectedStudent.image_url)}
                        alt={selectedStudent.full_name}
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/128?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Personal Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Full Name</span>
                        <p className="text-sm font-medium text-gray-900">{selectedStudent.full_name}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Email</span>
                        <p className="text-sm text-gray-900">{selectedStudent.email}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Mobile Number</span>
                        <p className="text-sm text-gray-900">{selectedStudent.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Academic Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Domain</span>
                        <p className="text-sm text-gray-900">{selectedStudent.domain || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Status</span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            selectedStudent.status === 'Active' || selectedStudent.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {selectedStudent.status || (selectedStudent.is_active ? 'Active' : 'Inactive')}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Registration Date</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedStudent.registration_date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Test Performance */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Test Performance</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Marks</span>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedStudent.marks !== null && selectedStudent.marks !== undefined 
                            ? `${selectedStudent.marks.toFixed(2)}%` 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Total Attempts</span>
                        <p className="text-sm text-gray-900">{selectedStudent.total_attempts || 0}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Last Test Date</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedStudent.last_test_date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Reference</span>
                        <p className="text-sm text-gray-900">{selectedStudent.reference_information || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Created At</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedStudent.created_at)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Updated At</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedStudent.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  type="button"
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Import from Google Sheets Modal */}
      {showImportModal && (
        <>
          <div 
            className="fixed inset-0 z-100 bg-gray-900/20 backdrop-blur-md"
            onClick={() => setShowImportModal(false)}
          ></div>
          
          <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md transform transition-all pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Import from Google Sheets</h2>
                <button
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                  onClick={() => setShowImportModal(false)}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Form */}
              <div className="px-6 py-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="google-sheets-url" className="block text-sm font-medium text-gray-700 mb-2">
                      Google Sheets URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="google-sheets-url"
                      value={googleSheetsUrl}
                      onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                      placeholder="https://drive.google.com/open?id=..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Paste your Google Sheets shareable link here. The CSV will be downloaded and students will be updated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGoogleSheetsImport}
                  disabled={importing || !googleSheetsUrl.trim()}
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CandidatesTab;
