import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

const CandidatesTab = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await api.candidates.getAll();
      setCandidates(response.candidates || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch candidates');
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
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
        fetchCandidates(); // Refresh the list
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

  const handleCheckboxChange = async (candidateId, isSelected) => {
    try {
      await api.candidates.updateSelection(candidateId, isSelected);
      
      // Update local state
      setCandidates(prev => 
        prev.map(c => 
          c.id === candidateId ? { ...c, is_selected: isSelected } : c
        )
      );

      // Update selected set for tracking
      setSelectedCandidates(prev => {
        const newSet = new Set(prev);
        if (isSelected) {
          newSet.add(candidateId);
        } else {
          newSet.delete(candidateId);
        }
        return newSet;
      });
    } catch (err) {
      console.error('Error updating selection:', err);
      alert(err.message || 'Failed to update selection');
    }
  };

  const handleBulkSelection = async (isSelected) => {
    if (selectedCandidates.size === 0 && !isSelected) {
      alert('Please select candidates first');
      return;
    }

    const idsToUpdate = isSelected 
      ? candidates.filter(c => !c.is_selected).map(c => c.id)
      : Array.from(selectedCandidates);

    if (idsToUpdate.length === 0) {
      alert('No candidates to update');
      return;
    }

    try {
      await api.candidates.bulkUpdateSelection(idsToUpdate, isSelected);
      
      // Update local state
      setCandidates(prev => 
        prev.map(c => 
          idsToUpdate.includes(c.id) ? { ...c, is_selected: isSelected } : c
        )
      );

      // Clear selection
      setSelectedCandidates(new Set());
      setSuccess(`Successfully ${isSelected ? 'selected' : 'deselected'} ${idsToUpdate.length} candidates`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error bulk updating:', err);
      alert(err.message || 'Failed to update selections');
    }
  };

  // Convert Google Drive link to embeddable format
  const getImageUrl = (url) => {
    if (!url) return null;
    
    // If already converted, return as is
    if (url.includes('thumbnail?id=')) return url;
    
    // Extract file ID and convert
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = openMatch ? openMatch[1] : (fileMatch ? fileMatch[1] : null);
    
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : url;
  };

  return (
    <div className="space-y-6">
      {/* Header with Upload */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Candidates</h2>
        <div className="flex gap-3">
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
          <button
            onClick={() => handleBulkSelection(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={() => handleBulkSelection(false)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Deselect Selected
          </button>
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
          {uploadResult.data && (
            <div className="mt-3 space-y-2">
              {uploadResult.data.details?.created && uploadResult.data.details.created.length > 0 && (
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
              {uploadResult.data.details?.failed && uploadResult.data.details.failed.length > 0 && (
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
        <div className="text-center py-12 text-gray-500 text-lg">Loading candidates...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <input
                      type="checkbox"
                      checked={candidates.length > 0 && candidates.every(c => c.is_selected)}
                      onChange={(e) => {
                        const allSelected = e.target.checked;
                        handleBulkSelection(allSelected);
                      }}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Image</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Mobile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Marks</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Reference</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No candidates found. Upload a spreadsheet to get started.
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={candidate.is_selected || false}
                          onChange={(e) => handleCheckboxChange(candidate.id, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {candidate.photograph_url ? (
                          <img
                            src={getImageUrl(candidate.photograph_url)}
                            alt={candidate.full_name}
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
                        {candidate.full_name}
                        <br />
                        <span className="text-xs text-gray-500">{candidate.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.mobile_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {candidate.marks !== null && candidate.marks !== undefined ? `${candidate.marks.toFixed(2)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {candidate.reference_information || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            candidate.is_selected
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {candidate.is_selected ? 'Selected' : 'Not Selected'}
                        </span>
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
  );
};

export default CandidatesTab;

