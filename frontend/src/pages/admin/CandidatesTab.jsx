import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState(new Set());
  const itemsPerPage = 10;
  const fileInputRef = useRef(null);

  const fetchStudents = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const fetchStudentDetails = useCallback(async (id) => {
    try {
      const response = await api.candidates.getById(id);
      setSelectedStudent(response.student);
      setShowDetailsModal(true);
    } catch (err) {
      alert(err.message || 'Failed to fetch student details');
      console.error('Error fetching student details:', err);
    }
  }, []);

  const handleFileUpload = useCallback(async (e) => {
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
      // Format error message properly
      let errorMessage = err.message || 'Failed to upload spreadsheet. Please try again.';
      
      // If error has details, format them nicely
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorDetails = err.response.data.errors
          .slice(0, 5) // Show first 5 errors
          .map((e, idx) => {
            if (typeof e === 'object' && e !== null) {
              return `Row ${e.row || idx + 1}: ${e.reason || e.message || 'Unknown error'}`;
            }
            return String(e);
          })
          .join('\n');
        
        if (err.response.data.errors.length > 5) {
          errorMessage = `${errorMessage}\n\nFirst 5 errors:\n${errorDetails}\n... and ${err.response.data.errors.length - 5} more errors.`;
        } else {
          errorMessage = `${errorMessage}\n\nErrors:\n${errorDetails}`;
        }
      }
      
      setError(errorMessage);
      setUploadResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [fetchStudents]);

  const handleGoogleSheetsImport = useCallback(async () => {
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
  }, [googleSheetsUrl, fetchStudents]);

  // Convert Google Drive link to embeddable format
  const getImageUrl = useCallback((url) => {
    if (!url) return null;
    
    if (url.includes('thumbnail?id=')) return url;
    
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = openMatch ? openMatch[1] : (fileMatch ? fileMatch[1] : null);
    
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : url;
  }, []);

  const formatDate = useCallback((dateString) => {
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
  }, []);

  // Filter students by search query (name or email) - memoized
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return students;
    }
    const query = searchQuery.toLowerCase().trim();
    return students.filter(student => 
      student.full_name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  // Pagination calculations - memoized (using filteredStudents)
  const totalPages = useMemo(() => Math.ceil(filteredStudents.length / itemsPerPage), [filteredStudents.length, itemsPerPage]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex, itemsPerPage]);
  const currentStudents = useMemo(() => filteredStudents.slice(startIndex, endIndex), [filteredStudents, startIndex, endIndex]);

  // Reset to page 1 when filtered students list changes or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredStudents.length, searchQuery]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
  }, []);

  const handleCloseImportModal = useCallback(() => {
    setShowImportModal(false);
    setGoogleSheetsUrl('');
  }, []);

  const handleOpenImportModal = useCallback(() => {
    setShowImportModal(true);
  }, []);

  const handleSelectionChange = useCallback(async (studentId, isSelected) => {
    try {
      // Optimistically update the UI
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.id === studentId
            ? { ...student, is_selected: isSelected }
            : student
        )
      );

      // Update in database
      await api.candidates.updateSelection(studentId, isSelected);
    } catch (err) {
      console.error('Error updating selection:', err);
      // Revert on error
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.id === studentId
            ? { ...student, is_selected: !isSelected }
            : student
        )
      );
      setError(err.message || 'Failed to update selection status');
      setTimeout(() => setError(''), 3000);
    }
  }, []);

  const handleImageError = useCallback((imageKey) => (e) => {
    // Prevent infinite loop by hiding the image and marking it as failed
    e.target.style.display = 'none';
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imageKey);
      return newSet;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Search and Upload */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Students</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleOpenImportModal}
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
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600">
            Showing {filteredStudents.length} of {students.length} students
          </p>
        )}
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Mobile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Institute</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Course</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Marks</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                      {searchQuery 
                        ? `No students found matching "${searchQuery}". Try a different search term.`
                        : 'No students found. Upload a spreadsheet or import from Google Sheets to get started.'}
                    </td>
                  </tr>
                ) : (
                  currentStudents.map((student) => {
                    const handleViewClick = () => fetchStudentDetails(student.id);
                    const imageKey = student.image_url || `student-${student.id}`;
                    const imageFailed = failedImages.has(imageKey);
                    
                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          {student.image_url && !imageFailed ? (
                            <img
                              src={getImageUrl(student.image_url)}
                              alt={student.full_name}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={handleImageError(imageKey)}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{student.full_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.mobile_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {student.institute_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {student.course_taken || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {student.marks !== null && student.marks !== undefined ? `${student.marks.toFixed(2)}%` : 'N/A'}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={student.is_selected || false}
                            onChange={(e) => handleSelectionChange(student.id, e.target.checked)}
                            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                          />
                          <span className={`ml-2 text-sm font-medium ${
                            student.is_selected 
                              ? 'text-green-700' 
                              : 'text-gray-500'
                          }`}>
                            {student.is_selected ? 'Selected' : 'Not Selected'}
                          </span>
                        </label>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={handleViewClick}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredStudents.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, filteredStudents.length)}</span> of{' '}
                    <span className="font-medium">{filteredStudents.length}</span> result{filteredStudents.length !== 1 ? 's' : ''}
                    {searchQuery && students.length !== filteredStudents.length && (
                      <span className="text-gray-500"> (filtered from {students.length} total)</span>
                    )}
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
                      const handlePageClick = () => handlePageChange(page);
                      
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={handlePageClick}
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
            onClick={handleCloseDetailsModal}
          ></div>
          
          <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-4xl transform transition-all pointer-events-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-semibold text-gray-900">Student Details</h2>
                <button
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                  onClick={handleCloseDetailsModal}
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
                    {selectedStudent.image_url && !failedImages.has(`modal-${selectedStudent.id}`) ? (
                      <img
                        src={getImageUrl(selectedStudent.image_url)}
                        alt={selectedStudent.full_name}
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={handleImageError(`modal-${selectedStudent.id}`)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
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
                        <p className="text-sm text-gray-900">{selectedStudent.phone || selectedStudent.mobile_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Academic Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Institute Name</span>
                        <p className="text-sm text-gray-900">{selectedStudent.institute_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Course Taken</span>
                        <p className="text-sm text-gray-900">{selectedStudent.course_taken || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Area of Interests</span>
                        <p className="text-sm text-gray-900">{selectedStudent.area_of_interests || selectedStudent.domain || 'N/A'}</p>
                      </div>
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

                  {/* Internship Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Internship Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Start Date</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedStudent.internship_start_date)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">End Date</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedStudent.internship_end_date)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Duration</span>
                        <p className="text-sm text-gray-900">{selectedStudent.internship_duration || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Faculty Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Faculty Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Internal Faculty Name</span>
                        <p className="text-sm text-gray-900">{selectedStudent.internal_faculty_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Faculty Contact</span>
                        <p className="text-sm text-gray-900">{selectedStudent.faculty_contact || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Faculty Email</span>
                        <p className="text-sm text-gray-900">{selectedStudent.faculty_email || 'N/A'}</p>
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
                        <span className="text-xs text-gray-500">Reference Information</span>
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
                  onClick={handleCloseDetailsModal}
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
            onClick={handleCloseImportModal}
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
                  onClick={handleCloseImportModal}
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
                  onClick={handleCloseImportModal}
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
