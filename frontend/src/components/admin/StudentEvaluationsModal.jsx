import { useEffect, useState } from 'react';
import { X, Calendar, FileText, Edit, Trash2, Save, User, Star } from 'lucide-react';
import api from '../../services/api';

const StudentEvaluationsModal = ({ student, isOpen, onClose, onRefresh }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingId, setSavingId] = useState(null); // Track which evaluation is being saved

  useEffect(() => {
    if (isOpen && student) {
      fetchEvaluations();
      setEditingId(null);
      setEditFormData(null);
      setDeletingId(null);
    }
  }, [isOpen, student]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.evaluations.getByStudentId(student.id);
      if (response.success) {
        setEvaluations(response.data || []);
      } else {
        setError('Failed to fetch evaluations');
      }
    } catch (err) {
      console.error('Error fetching evaluations:', err);
      setError(err.message || 'Failed to fetch evaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (evaluation) => {
    setEditingId(evaluation.id);
    setEditFormData({
      weekNo: evaluation.weekNo.toString(),
      evaluationData: {
        technicalSkills: evaluation.evaluationData?.technicalSkills || '',
        communication: evaluation.evaluationData?.communication || '',
        behavior: evaluation.evaluationData?.behavior || '',
        projectProgress: evaluation.evaluationData?.projectProgress || '',
        overallRating: evaluation.evaluationData?.overallRating || '',
        notes: evaluation.evaluationData?.notes || '',
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  const handleSaveEdit = async (evaluationId) => {
    if (savingId === evaluationId) return; // Prevent double submission
    
    try {
      setSavingId(evaluationId);
      setError('');
      if (!editFormData) {
        setSavingId(null);
        return;
      }

      await api.evaluations.update(evaluationId, {
        evaluationData: editFormData.evaluationData,
      });

      setEditingId(null);
      setEditFormData(null);
      await fetchEvaluations();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error updating evaluation:', err);
      setError(err.message || 'Failed to update evaluation');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (evaluationId) => {
    if (!window.confirm('Are you sure you want to delete this evaluation? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(evaluationId);
      setError('');
      await api.evaluations.delete(evaluationId);
      await fetchEvaluations();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error deleting evaluation:', err);
      setError(err.message || 'Failed to delete evaluation');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            {student.imageUrl ? (
              <img
                src={(() => {
                  if (!student.imageUrl) return null;
                  if (student.imageUrl.startsWith('http://') || student.imageUrl.startsWith('https://')) {
                    return student.imageUrl;
                  }
                  if (student.imageUrl.includes('thumbnail?id=')) return student.imageUrl;
                  const openMatch = student.imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                  const fileMatch = student.imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                  const fileId = openMatch ? openMatch[1] : (fileMatch ? fileMatch[1] : null);
                  if (fileId) {
                    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
                  }
                  // Handle both /uploads/ prefix and /scholarflex/ or /students/ paths (which need /uploads/ prepended)
                  let filePath = student.imageUrl;
                  if (student.imageUrl.startsWith('/scholarflex/') || student.imageUrl.startsWith('/students/')) {
                    filePath = `/uploads${student.imageUrl}`;
                  } else if (!student.imageUrl.startsWith('/uploads/')) {
                    filePath = `/uploads${student.imageUrl}`;
                  }
                  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                  return baseUrl.replace('/api', '') + filePath;
                })()}
                alt={student.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-8 h-8 text-green-600" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Evaluations for {student.fullName}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No evaluations found for this student</p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => {
                const isEditing = editingId === evaluation.id;
                const isDeleting = deletingId === evaluation.id;
                const formData = editFormData;

                return (
                  <div
                    key={evaluation.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          Week {evaluation.weekNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(evaluation.createdAt)}
                        </span>
                        {!isEditing && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(evaluation)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(evaluation.id)}
                              disabled={deletingId === evaluation.id}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              {deletingId === evaluation.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Technical Skills
                            </label>
                            <textarea
                              value={formData.evaluationData.technicalSkills}
                              onChange={(e) =>
                                setEditFormData({
                                  ...formData,
                                  evaluationData: {
                                    ...formData.evaluationData,
                                    technicalSkills: e.target.value,
                                  },
                                })
                              }
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Technical skills evaluation..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Communication
                            </label>
                            <textarea
                              value={formData.evaluationData.communication}
                              onChange={(e) =>
                                setEditFormData({
                                  ...formData,
                                  evaluationData: {
                                    ...formData.evaluationData,
                                    communication: e.target.value,
                                  },
                                })
                              }
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Communication evaluation..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Behavior
                            </label>
                            <textarea
                              value={formData.evaluationData.behavior}
                              onChange={(e) =>
                                setEditFormData({
                                  ...formData,
                                  evaluationData: {
                                    ...formData.evaluationData,
                                    behavior: e.target.value,
                                  },
                                })
                              }
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Behavior evaluation..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Project Progress
                            </label>
                            <textarea
                              value={formData.evaluationData.projectProgress}
                              onChange={(e) =>
                                setEditFormData({
                                  ...formData,
                                  evaluationData: {
                                    ...formData.evaluationData,
                                    projectProgress: e.target.value,
                                  },
                                })
                              }
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Project progress evaluation..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Overall Rating (Stars)
                          </label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const rating = parseInt(formData.evaluationData.overallRating) || 0;
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() =>
                                    setEditFormData({
                                      ...formData,
                                      evaluationData: {
                                        ...formData.evaluationData,
                                        overallRating: star.toString(),
                                      },
                                    })
                                  }
                                  className="focus:outline-none"
                                >
                                  <Star
                                    className={`w-6 h-6 transition-colors ${
                                      star <= rating
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                            {formData.evaluationData.overallRating && (
                              <span className="text-sm text-gray-600 ml-2">
                                ({formData.evaluationData.overallRating} {parseInt(formData.evaluationData.overallRating) === 1 ? 'star' : 'stars'})
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={formData.evaluationData.notes}
                            onChange={(e) =>
                              setEditFormData({
                                ...formData,
                                evaluationData: {
                                  ...formData.evaluationData,
                                  notes: e.target.value,
                                },
                              })
                            }
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Additional notes..."
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(evaluation.id)}
                            disabled={savingId === evaluation.id}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {savingId === evaluation.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {evaluation.evaluationData?.technicalSkills && (
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Technical Skills
                              </label>
                              <p className="text-sm text-gray-900 bg-white p-2 rounded border border-gray-200">
                                {evaluation.evaluationData.technicalSkills}
                              </p>
                            </div>
                          )}
                          {evaluation.evaluationData?.communication && (
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Communication
                              </label>
                              <p className="text-sm text-gray-900 bg-white p-2 rounded border border-gray-200">
                                {evaluation.evaluationData.communication}
                              </p>
                            </div>
                          )}
                          {evaluation.evaluationData?.behavior && (
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Behavior
                              </label>
                              <p className="text-sm text-gray-900 bg-white p-2 rounded border border-gray-200">
                                {evaluation.evaluationData.behavior}
                              </p>
                            </div>
                          )}
                          {evaluation.evaluationData?.projectProgress && (
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Project Progress
                              </label>
                              <p className="text-sm text-gray-900 bg-white p-2 rounded border border-gray-200">
                                {evaluation.evaluationData.projectProgress}
                              </p>
                            </div>
                          )}
                        </div>

                        {evaluation.evaluationData?.overallRating && (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                              Overall Rating
                            </label>
                            <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                              {(() => {
                                const rating = parseInt(evaluation.evaluationData.overallRating);
                                const isNumeric = !isNaN(rating) && rating >= 1 && rating <= 5;
                                
                                if (isNumeric) {
                                  return (
                                    <>
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-5 h-5 ${
                                            star <= rating
                                              ? 'text-yellow-400 fill-yellow-400'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                      <span className="text-sm font-semibold text-gray-900 ml-2">
                                        ({rating} {rating === 1 ? 'star' : 'stars'})
                                      </span>
                                    </>
                                  );
                                } else {
                                  // Fallback for non-numeric ratings (backward compatibility)
                                  return (
                                    <span className="text-sm font-semibold text-gray-900">
                                      {evaluation.evaluationData.overallRating}
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        )}

                        {evaluation.evaluationData?.notes && (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-gray-700 mb-1 block items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Notes
                            </label>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border border-gray-200">
                              {evaluation.evaluationData.notes}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentEvaluationsModal;
