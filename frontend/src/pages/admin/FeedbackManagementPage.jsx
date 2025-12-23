import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';
import { MessageSquare, Star, AlertCircle, CheckCircle, Eye, X } from 'lucide-react';

const FeedbackManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
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
    
    fetchFeedbacks();
  }, [navigate, pagination.page]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.feedback.getAll({
        page: pagination.page,
        limit: pagination.limit,
      });
      
      if (response.success) {
        setFeedbacks(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
      console.error('Error details:', err);
      // Try to get more details from the error
      const errorMessage = err.message || 'Failed to fetch feedback';
      const errorDetails = err.error || err.response?.data?.error || '';
      setError(errorMessage + (errorDetails ? ` - ${JSON.stringify(errorDetails)}` : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setDetailModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating) => {
    if (!rating || rating === 0) return 'N/A';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
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
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Internship Feedback</h1>
            <p className="text-gray-600">View and manage student internship feedback</p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Feedback Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No feedback submitted yet</p>
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
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Overall Rating
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Content Quality
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mentor Support
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Platform Usability
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Would Recommend
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 border-l border-gray-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {feedbacks.map((feedback) => (
                        <tr key={feedback.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {feedback.student?.fullName || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">{feedback.student?.email}</div>
                              {feedback.student?.domain && (
                                <div className="text-xs text-gray-400">
                                  {feedback.student.domain.domainName}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {renderStars(feedback.overallRating)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {renderStars(feedback.contentQuality)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {renderStars(feedback.mentorSupport)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {renderStars(feedback.platformUsability)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {feedback.wouldRecommend === true ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Yes
                              </span>
                            ) : feedback.wouldRecommend === false ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <X className="w-3 h-3 mr-1" />
                                No
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(feedback.submittedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-200">
                            <button
                              onClick={() => handleViewDetails(feedback)}
                              className="text-green-600 hover:text-green-900 flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                    <div className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-semibold">
                        {feedbacks.length === 0
                          ? 0
                          : (pagination.page - 1) * pagination.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-semibold">{pagination.total}</span> feedback
                      {pagination.total !== 1 ? 's' : ''}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Feedback Detail Modal */}
      {detailModalOpen && selectedFeedback && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setDetailModalOpen(false);
            setSelectedFeedback(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Feedback Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedFeedback.student?.fullName} - {selectedFeedback.student?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedFeedback(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Ratings Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-sm text-blue-600 mb-1">Overall Rating</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {selectedFeedback.overallRating}/5
                    </div>
                    {renderStars(selectedFeedback.overallRating)}
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-purple-600 mb-1">Content Quality</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {selectedFeedback.contentQuality || 'N/A'}
                      {selectedFeedback.contentQuality && '/5'}
                    </div>
                    {renderStars(selectedFeedback.contentQuality)}
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-sm text-green-600 mb-1">Mentor Support</div>
                    <div className="text-2xl font-bold text-green-900">
                      {selectedFeedback.mentorSupport || 'N/A'}
                      {selectedFeedback.mentorSupport && '/5'}
                    </div>
                    {renderStars(selectedFeedback.mentorSupport)}
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-sm text-orange-600 mb-1">Platform Usability</div>
                    <div className="text-2xl font-bold text-orange-900">
                      {selectedFeedback.platformUsability || 'N/A'}
                      {selectedFeedback.platformUsability && '/5'}
                    </div>
                    {renderStars(selectedFeedback.platformUsability)}
                  </div>
                </div>

                {/* Learning Experience */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Learning Experience</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {selectedFeedback.learningExperience || 'Not provided'}
                  </p>
                </div>

                {/* Suggestions */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggestions for Improvement</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {selectedFeedback.suggestions || 'Not provided'}
                  </p>
                </div>

                {/* Additional Comments */}
                {selectedFeedback.additionalComments && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Additional Comments</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {selectedFeedback.additionalComments}
                    </p>
                  </div>
                )}

                {/* Would Recommend */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Would Recommend</h4>
                  <div className="text-sm">
                    {selectedFeedback.wouldRecommend === true ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Yes
                      </span>
                    ) : selectedFeedback.wouldRecommend === false ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <X className="w-4 h-4 mr-1" />
                        No
                      </span>
                    ) : (
                      <span className="text-gray-400">Not specified</span>
                    )}
                  </div>
                </div>

                {/* Submission Info */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Submitted on: {formatDate(selectedFeedback.submittedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagementPage;

