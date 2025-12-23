import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import api from '../../services/api';
import { CheckCircle, Star, AlertCircle, MessageSquare } from 'lucide-react';

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    overallRating: 0,
    learningExperience: '',
    contentQuality: 0,
    mentorSupport: 0,
    platformUsability: 0,
    suggestions: '',
    wouldRecommend: null,
    additionalComments: '',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const userData = authService.getUser();
    setUser(userData);

    if (userData?.role !== 'STUDENT') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }

    // Check if internship has ended
    if (userData?.internship_end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(userData.internship_end_date);
      endDate.setHours(23, 59, 59, 999);
      
      if (today <= endDate) {
        // Internship hasn't ended yet, redirect to dashboard
        navigate(ROUTES.STUDENT.DASHBOARD, { replace: true });
        return;
      }
    } else {
      // No internship end date, redirect to dashboard
      navigate(ROUTES.STUDENT.DASHBOARD, { replace: true });
      return;
    }

    checkExistingFeedback();
  }, [navigate]);

  // Auto-logout if feedback already submitted
  useEffect(() => {
    if (alreadySubmitted) {
      const timer = setTimeout(() => {
        authService.logout();
        navigate(ROUTES.LOGIN, { replace: true });
      }, 10000); // Logout after 10 seconds of viewing submitted feedback

      return () => clearTimeout(timer);
    }
  }, [alreadySubmitted, navigate]);

  const checkExistingFeedback = async () => {
    try {
      setLoading(true);
      const response = await api.feedback.getStudentFeedback();
      if (response.success && response.data) {
        // Feedback already submitted - show read-only view
        setAlreadySubmitted(true);
        setFormData({
          overallRating: response.data.overallRating,
          learningExperience: response.data.learningExperience || '',
          contentQuality: response.data.contentQuality || 0,
          mentorSupport: response.data.mentorSupport || 0,
          platformUsability: response.data.platformUsability || 0,
          suggestions: response.data.suggestions || '',
          wouldRecommend: response.data.wouldRecommend,
          additionalComments: response.data.additionalComments || '',
        });
      }
    } catch (err) {
      console.error('Error checking feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (formData.overallRating === 0) {
      setError('Please provide an overall rating');
      return;
    }
    
    if (!formData.learningExperience || formData.learningExperience.trim() === '') {
      setError('Please provide your learning experience');
      return;
    }
    
    if (formData.contentQuality === 0) {
      setError('Please rate the content quality');
      return;
    }
    
    if (formData.mentorSupport === 0) {
      setError('Please rate the mentor support');
      return;
    }
    
    if (formData.platformUsability === 0) {
      setError('Please rate the platform usability');
      return;
    }
    
    if (!formData.suggestions || formData.suggestions.trim() === '') {
      setError('Please provide suggestions for improvement');
      return;
    }
    
    if (formData.wouldRecommend === null) {
      setError('Please indicate if you would recommend this program');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await api.feedback.submit(formData);
      
      if (response.success) {
        setSuccess(response.message || 'Thank you for your feedback!');
        setAlreadySubmitted(true);
        // Prevent form resubmission
        setTimeout(() => {
          // Logout after feedback submission since internship has ended
          authService.logout();
          navigate(ROUTES.LOGIN, { replace: true });
        }, 5000);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label, required = false }) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 transition-colors ${
              star <= value
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
            disabled={alreadySubmitted}
          >
            <Star className={`w-8 h-8 ${star <= value ? 'fill-current' : ''}`} />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-gray-600">
            {value} out of 5
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            {/* <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div> */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Internship Feedback
            </h1>
            <p className="text-gray-600">
              {alreadySubmitted
                ? 'Thank you for your feedback! Your response has been recorded. You cannot submit feedback again.'
                : 'Your internship has ended. Please share your feedback to help us improve.'}
            </p>
            {alreadySubmitted && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You have already submitted your feedback. This form is now read-only. 
                  You will be logged out automatically.
                </p>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Feedback Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Overall Rating - Required */}
            <StarRating
              value={formData.overallRating}
              onChange={(value) => handleRatingChange('overallRating', value)}
              label="Overall Rating"
              required
            />

            {/* Learning Experience */}
            <div>
              <label htmlFor="learningExperience" className="block text-sm font-medium text-gray-700 mb-2">
                Learning Experience
              </label>
              <textarea
                id="learningExperience"
                name="learningExperience"
                rows={4}
                value={formData.learningExperience}
                onChange={handleInputChange}
                disabled={alreadySubmitted}
                placeholder="Tell us about your learning experience during the internship..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Content Quality */}
            <StarRating
              value={formData.contentQuality}
              onChange={(value) => handleRatingChange('contentQuality', value)}
              label="Content Quality"
              required
            />

            {/* Mentor Support */}
            <StarRating
              value={formData.mentorSupport}
              onChange={(value) => handleRatingChange('mentorSupport', value)}
              label="Mentor Support"
              required
            />

            {/* Platform Usability */}
            <StarRating
              value={formData.platformUsability}
              onChange={(value) => handleRatingChange('platformUsability', value)}
              label="Platform Usability"
              required
            />

            {/* Suggestions */}
            <div>
              <label htmlFor="suggestions" className="block text-sm font-medium text-gray-700 mb-2">
                Suggestions for Improvement
              </label>
              <textarea
                id="suggestions"
                name="suggestions"
                rows={4}
                value={formData.suggestions}
                onChange={handleInputChange}
                disabled={alreadySubmitted}
                placeholder="Any suggestions to improve the internship program..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Would Recommend */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Would you recommend this internship program to others? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="wouldRecommend"
                    value="true"
                    checked={formData.wouldRecommend === true}
                    onChange={() => setFormData(prev => ({ ...prev, wouldRecommend: true }))}
                    disabled={alreadySubmitted}
                    className="mr-2"
                    required
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="wouldRecommend"
                    value="false"
                    checked={formData.wouldRecommend === false}
                    onChange={() => setFormData(prev => ({ ...prev, wouldRecommend: false }))}
                    disabled={alreadySubmitted}
                    className="mr-2"
                    required
                  />
                  No
                </label>
              </div>
            </div>

            {/* Additional Comments */}
            <div>
              <label htmlFor="additionalComments" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Comments
              </label>
              <textarea
                id="additionalComments"
                name="additionalComments"
                rows={4}
                value={formData.additionalComments}
                onChange={handleInputChange}
                disabled={alreadySubmitted}
                placeholder="Any other comments or feedback..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit Button */}
            {!alreadySubmitted && (
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={
                    submitting || 
                    formData.overallRating === 0 ||
                    !formData.learningExperience?.trim() ||
                    formData.contentQuality === 0 ||
                    formData.mentorSupport === 0 ||
                    formData.platformUsability === 0 ||
                    !formData.suggestions?.trim() ||
                    formData.wouldRecommend === null
                  }
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;

