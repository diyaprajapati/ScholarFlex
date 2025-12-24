// API service for making HTTP requests to the backend

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.20.10.5:5000/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://10.154.201.164:5000/api';
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Get JWT token from localStorage
 */
const getToken = () => {
  return localStorage.getItem('scholarflex_token');
};

/**
 * Make an API request with authentication
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  // Don't set Content-Type for FormData (let browser set it with boundary)
  const isFormData = options.body instanceof FormData;
  
  const config = {
    ...options,
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(text || 'An error occurred');
    }

    const data = await response.json();

    if (!response.ok) {
      // Check if this is a 403 error for /auth/me endpoint (non-selected student access denied)
      // This is expected behavior, so we'll suppress logging for it
      const isAccessDeniedForNonSelected = response.status === 403 && 
                                           endpoint === '/auth/me' &&
                                           data.message &&
                                           data.message.includes('Access denied') &&
                                           (data.message.includes('not selected') || data.message.includes('evaluated'));
      
      // If there are detailed validation errors, include them in the error message
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const errorDetails = data.errors
          .map((err, idx) => {
            if (typeof err === 'string') return err;
            if (typeof err === 'object' && err !== null) {
              // Format error object
              if (err.reason) {
                return `Row ${err.row || idx + 1}: ${err.reason}${err.email ? ` (${err.email})` : ''}`;
              }
              return JSON.stringify(err);
            }
            return String(err);
          })
          .slice(0, 10) // Limit to first 10 errors
          .join('\n');
        
        const errorMessage = data.message || 'Validation errors';
        const moreErrors = data.errors.length > 10 ? `\n... and ${data.errors.length - 10} more errors.` : '';
        const error = new Error(`${errorMessage}\n\n${errorDetails}${moreErrors}`);
        // Suppress logging for access denied errors
        if (!isAccessDeniedForNonSelected) {
          console.error('API request error:', error);
        }
        throw error;
      }
      const error = new Error(data.message || 'An error occurred');
      // Suppress logging for access denied errors
      if (!isAccessDeniedForNonSelected) {
        console.error('API request error:', error);
      }
      throw error;
    }

    return data;
  } catch (error) {
    // Check if this is an access denied error that we should suppress
    const errorMessage = error.message || error.toString() || '';
    const isAccessDeniedForNonSelected = endpoint === '/auth/me' && 
                                         errorMessage.includes('Access denied') &&
                                         (errorMessage.includes('not selected') || errorMessage.includes('evaluated'));
    
    // Only log if it's not an access denied error for non-selected students
    if (!isAccessDeniedForNonSelected) {
      console.error('API request error:', error);
    }
    throw error;
  }
};

/**
 * API methods
 */
export const api = {
  // Authentication endpoints
  auth: {
    sendOTP: async (email) => {
      return apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    verifyOTP: async (email, otp) => {
      return apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
    },

    getCurrentUser: async () => {
      return apiRequest('/auth/me', {
        method: 'GET',
      });
    },

    logout: async () => {
      return apiRequest('/auth/logout', {
        method: 'POST',
      });
    },
  },

  // Intern endpoints
  interns: {
    uploadSpreadsheet: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return apiRequest('/interns/upload', {
        method: 'POST',
        body: formData,
      });
    },

    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      if (filters.domain_id) queryParams.append('domain_id', filters.domain_id);
      if (filters.status_id) queryParams.append('status_id', filters.status_id);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/interns?${queryString}` : '/interns';
      
      return apiRequest(endpoint, {
        method: 'GET',
      });
    },

    getById: async (id) => {
      return apiRequest(`/interns/${id}`, {
        method: 'GET',
      });
    },

    update: async (id, data) => {
      return apiRequest(`/interns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id) => {
      return apiRequest(`/interns/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Question Paper endpoints
  questionPapers: {
    create: async (data) => {
      // Transform frontend format to backend format
      const payload = {
        paper_name: data.name,
        description: data.description || '',
        subject: data.subject,
        year: data.year,
        semester: data.semester,
        duration_minutes: data.duration,
        status: data.status || 'draft',
        domain_ids: data.domainIds || [],
        questions: data.questions.map(q => {
          const question = {
            text: q.text,
            type: q.type,
            weightage: q.weightage || 1,
          };

          // Add options and correctOptions for choice-based questions
          if (['multiple-choice', 'single-choice', 'true-false'].includes(q.type)) {
            // Filter out empty options and adjust correctOptions indices
            const validOptions = (q.options || []).filter(opt => opt && opt.trim() !== '');
            const validOptionsMap = new Map();
            let newIndex = 0;
            
            // Create mapping from old indices to new indices
            (q.options || []).forEach((opt, oldIndex) => {
              if (opt && opt.trim() !== '') {
                validOptionsMap.set(oldIndex, newIndex);
                newIndex++;
              }
            });
            
            // Map correctOptions to new indices
            const validCorrectOptions = (q.correctOptions || [])
              .map(oldIndex => validOptionsMap.get(oldIndex))
              .filter(newIndex => newIndex !== undefined);
            
            question.options = validOptions;
            question.correctOptions = validCorrectOptions;
          }

          // Add section if provided
          if (q.section) {
            question.section = q.section;
          }

          return question;
        }),
      };

      // If sections are provided, use new format
      if (data.sections && Array.isArray(data.sections)) {
        payload.sections = data.sections.map(section => ({
          name: section.name,
          questions: section.questions.map(q => {
            const question = {
              text: q.text,
              type: q.type,
              weightage: q.weightage || 1,
            };

            // Preserve question ID if it exists (for updates)
            if (q.id) {
              question.id = q.id;
            }

            // Add options and correctOptions for choice-based questions
            if (['multiple-choice', 'single-choice', 'true-false'].includes(q.type)) {
              const validOptions = (q.options || []).filter(opt => opt && opt.trim() !== '');
              const validOptionsMap = new Map();
              let newIndex = 0;
              
              (q.options || []).forEach((opt, oldIndex) => {
                if (opt && opt.trim() !== '') {
                  validOptionsMap.set(oldIndex, newIndex);
                  newIndex++;
                }
              });
              
              const validCorrectOptions = (q.correctOptions || [])
                .map(oldIndex => validOptionsMap.get(oldIndex))
                .filter(newIndex => newIndex !== undefined);
              
              question.options = validOptions;
              question.correctOptions = validCorrectOptions;
            }

            return question;
          }),
        }));
        delete payload.questions; // Remove old format
      }

      return apiRequest('/question-papers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.subject) queryParams.append('subject', filters.subject);
      if (filters.year) queryParams.append('year', filters.year);
      if (filters.semester) queryParams.append('semester', filters.semester);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/question-papers?${queryString}` : '/question-papers';
      
      return apiRequest(endpoint, {
        method: 'GET',
      });
    },

    getById: async (id) => {
      return apiRequest(`/question-papers/${id}`, {
        method: 'GET',
      });
    },

    update: async (id, data) => {
      // Transform frontend format to backend format
      const payload = {
        paper_name: data.name,
        description: data.description || '',
        subject: data.subject,
        year: data.year,
        semester: data.semester,
        duration_minutes: data.duration,
        status: data.status || 'draft',
        domain_ids: data.domainIds || [],
        questions: data.questions.map(q => {
          const question = {
            text: q.text,
            type: q.type,
            weightage: q.weightage || 1,
          };

          // Preserve question ID if it exists (for updates)
          if (q.id) {
            question.id = q.id;
          }

          // Add options and correctOptions for choice-based questions
          if (['multiple-choice', 'single-choice', 'true-false'].includes(q.type)) {
            // Filter out empty options and adjust correctOptions indices
            const validOptions = (q.options || []).filter(opt => opt && opt.trim() !== '');
            const validOptionsMap = new Map();
            let newIndex = 0;
            
            // Create mapping from old indices to new indices
            (q.options || []).forEach((opt, oldIndex) => {
              if (opt && opt.trim() !== '') {
                validOptionsMap.set(oldIndex, newIndex);
                newIndex++;
              }
            });
            
            // Map correctOptions to new indices
            const validCorrectOptions = (q.correctOptions || [])
              .map(oldIndex => validOptionsMap.get(oldIndex))
              .filter(newIndex => newIndex !== undefined);
            
            question.options = validOptions;
            question.correctOptions = validCorrectOptions;
          }

          // Add section if provided
          if (q.section) {
            question.section = q.section;
          }

          return question;
        }),
      };

      // If sections are provided, use new format
      if (data.sections && Array.isArray(data.sections)) {
        payload.sections = data.sections.map(section => ({
          name: section.name,
          questions: section.questions.map(q => {
            const question = {
              text: q.text,
              type: q.type,
              weightage: q.weightage || 1,
            };

            // Preserve question ID if it exists (for updates)
            if (q.id) {
              question.id = q.id;
            }

            // Add options and correctOptions for choice-based questions
            if (['multiple-choice', 'single-choice', 'true-false'].includes(q.type)) {
              const validOptions = (q.options || []).filter(opt => opt && opt.trim() !== '');
              const validOptionsMap = new Map();
              let newIndex = 0;
              
              (q.options || []).forEach((opt, oldIndex) => {
                if (opt && opt.trim() !== '') {
                  validOptionsMap.set(oldIndex, newIndex);
                  newIndex++;
                }
              });
              
              const validCorrectOptions = (q.correctOptions || [])
                .map(oldIndex => validOptionsMap.get(oldIndex))
                .filter(newIndex => newIndex !== undefined);
              
              question.options = validOptions;
              question.correctOptions = validCorrectOptions;
            }

            return question;
          }),
        }));
        delete payload.questions; // Remove old format
      }

      return apiRequest(`/question-papers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    delete: async (id) => {
      return apiRequest(`/question-papers/${id}`, {
        method: 'DELETE',
      });
    },
  },

  domains: {
    getAll: async () => {
      return apiRequest('/domains', {
        method: 'GET',
      });
    },
  },

  studentTests: {
    getAvailable: async () => {
      return apiRequest('/student/tests', {
        method: 'GET',
      });
    },

    getDetails: async (testId, attemptId) => {
      const query = attemptId ? `?attempt_id=${attemptId}` : ''
      return apiRequest(`/student/tests/${testId}/details${query}`, {
        method: 'GET',
      });
    },

    start: async (testId) => {
      return apiRequest(`/student/tests/${testId}/start`, {
        method: 'POST',
      });
    },

    submit: async (attemptId, data) => {
      return apiRequest(`/student/test-attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    saveAnswer: async (attemptId, data) => {
      return apiRequest(`/student/test-attempts/${attemptId}/save-answer`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  testAttempts: {
    getAll: async () => {
      return apiRequest('/test-attempts', {
        method: 'GET',
      });
    },
  },

  admin: {
    getStudentAnalytics: async () => {
      return apiRequest('/admin/students/analytics', {
        method: 'GET',
      });
    },
    create: async (data) => {
      return apiRequest('/admin/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getAll: async () => {
      return apiRequest('/admin/all', {
        method: 'GET',
      });
    },

    getById: async (id) => {
      return apiRequest(`/admin/${id}`, {
        method: 'GET',
      });
    },

    update: async (id, data) => {
      return apiRequest(`/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id) => {
      return apiRequest(`/admin/${id}`, {
        method: 'DELETE',
      });
    },
  },

  dashboard: {
    getStats: async () => {
      return apiRequest('/dashboard/stats', {
        method: 'GET',
      });
    },

    getCardDetails: async (cardId) => {
      return apiRequest(`/dashboard/cards/${cardId}`, {
        method: 'GET',
      });
    },
  },

  candidates: {
    uploadSpreadsheet: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return apiRequest('/candidates/upload', {
        method: 'POST',
        body: formData,
      });
    },

    getAll: async () => {
      return apiRequest('/candidates', {
        method: 'GET',
      });
    },

    getById: async (id) => {
      return apiRequest(`/candidates/${id}`, {
        method: 'GET',
      });
    },

    create: async (data) => {
      return apiRequest('/candidates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id, data) => {
      return apiRequest(`/candidates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    updateSelection: async (id, isSelected, options = {}) => {
      const payload = { is_selected: isSelected };
      if (typeof options.canRetest === 'boolean') {
        payload.can_retest = options.canRetest;
      }
      return apiRequest(`/candidates/${id}/selection`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    updateNOCStatus: async (id, nocReceived) => {
      return apiRequest(`/candidates/${id}/noc-status`, {
        method: 'PUT',
        body: JSON.stringify({ noc_received: nocReceived }),
      });
    },

    bulkUpdateSelection: async (candidateIds, isSelected) => {
      return apiRequest('/candidates/bulk-selection', {
        method: 'PUT',
        body: JSON.stringify({ 
          candidate_ids: candidateIds,
          is_selected: isSelected 
        }),
      });
    },

    importFromGoogleSheets: async (googleSheetsUrl, uniqueField = 'email') => {
      return apiRequest('/candidates/import-google-sheets', {
        method: 'POST',
        body: JSON.stringify({
          google_sheets_url: googleSheetsUrl,
          unique_field: uniqueField,
        }),
      });
    },
  },

  // Playlist endpoints
  playlists: {
    create: async (data) => {
      return apiRequest('/admin/playlists', {
        method: 'POST',
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          domain: data.domain,
        }),
      });
    },

    getAll: async () => {
      return apiRequest('/admin/playlists', {
        method: 'GET',
      });
    },

    update: async (playlistId, data) => {
      return apiRequest(`/admin/playlists/${playlistId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          domain: data.domain,
        }),
      });
    },

    delete: async (playlistId) => {
      return apiRequest(`/admin/playlists/${playlistId}`, {
        method: 'DELETE',
      });
    },

    addVideo: async (playlistId, data) => {
      return apiRequest(`/admin/playlists/${playlistId}/videos`, {
        method: 'POST',
        body: JSON.stringify({
          video_title: data.video_title,
          youtube_url: data.youtube_url,
        }),
      });
    },

    addVideosFromPlaylist: async (playlistId, youtubePlaylistUrl) => {
      return apiRequest(`/admin/playlists/${playlistId}/videos/bulk`, {
        method: 'POST',
        body: JSON.stringify({
          youtube_playlist_url: youtubePlaylistUrl,
        }),
      });
    },

    deleteVideo: async (playlistId, videoId) => {
      return apiRequest(`/admin/playlists/${playlistId}/videos/${videoId}`, {
        method: 'DELETE',
      });
    },

    // Student playlist endpoints
    getStudentPlaylists: async () => {
      return apiRequest('/student/playlists', {
        method: 'GET',
      });
    },

    getRecommendedPlaylists: async () => {
      return apiRequest('/student/playlists/recommended', {
        method: 'GET',
      });
    },
  },

  // Activity endpoints
  activity: {
    log: async (activityType, metadata) => {
      return apiRequest('/activity/log', {
        method: 'POST',
        body: JSON.stringify({
          activity_type: activityType,
          metadata: metadata || null,
        }),
      });
    },

    getRecentVideos: async () => {
      return apiRequest('/activity/videos/recent', {
        method: 'GET',
      });
    },

    getSummary: async () => {
      return apiRequest('/activity/summary', {
        method: 'GET',
      });
    },

    getVideoProgress: async (videoId, youtubeUrl) => {
      const params = new URLSearchParams();
      if (videoId) params.append('videoId', videoId);
      if (youtubeUrl) params.append('youtubeUrl', youtubeUrl);
      return apiRequest(`/activity/video/progress?${params.toString()}`, {
        method: 'GET',
      });
    },
  },

  // NOC Letter endpoints
  noc: {
    upload: async (file) => {
      const formData = new FormData();
      formData.append('nocFile', file);
      
      return apiRequest('/student/noc/upload', {
        method: 'POST',
        body: formData,
      });
    },

    getStudentNOC: async () => {
      return apiRequest('/student/noc', {
        method: 'GET',
      });
    },

    deleteStudentNOC: async (id) => {
      return apiRequest(`/student/noc/${id}`, {
        method: 'DELETE',
      });
    },

    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/admin/noc?${queryString}` : '/admin/noc';
      
      return apiRequest(endpoint, {
        method: 'GET',
      });
    },

    download: async (id) => {
      const response = await fetch(`${API_BASE_URL}/admin/noc/${id}/download`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download NOC letter');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      return url;
    },

    downloadAll: async (status = null) => {
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/admin/noc/download-all?${queryString}` : '/admin/noc/download-all';
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to download NOC letters' }));
        throw new Error(error.message || 'Failed to download NOC letters');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'all_noc_letters.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    },

    updateStatus: async (id, status) => {
      return apiRequest(`/admin/noc/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  // Feedback endpoints
  feedback: {
    submit: async (feedbackData) => {
      return apiRequest('/student/feedback', {
        method: 'POST',
        body: JSON.stringify(feedbackData),
      });
    },

    getStudentFeedback: async () => {
      return apiRequest('/student/feedback', {
        method: 'GET',
      });
    },

    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/admin/feedback?${queryString}` : '/admin/feedback';
      
      return apiRequest(endpoint, {
        method: 'GET',
      });
    },
  },

  // Video tracking endpoints
  videoTracking: {
    trackOpened: async (videoId, playlistId) => {
      return apiRequest('/video-tracking/open', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          playlistId,
        }),
      });
    },

    trackStarted: async (videoId, playlistId) => {
      return apiRequest('/video-tracking/start', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          playlistId,
        }),
      });
    },

    trackProgress: async (videoId, playlistId, watchTimeSeconds, progressPercent, lastPosition) => {
      return apiRequest('/video-tracking/progress', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          playlistId,
          watchTimeSeconds,
          progressPercent,
          lastPosition,
        }),
      });
    },

    trackCompleted: async (videoId, playlistId, watchTimeSeconds) => {
      return apiRequest('/video-tracking/complete', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          playlistId,
          watchTimeSeconds,
        }),
      });
    },

    getProgress: async (videoId) => {
      return apiRequest(`/video-tracking/progress/${videoId}`, {
        method: 'GET',
      });
    },
  },

  // Video analytics endpoints
  videoAnalytics: {
    getStudentAnalytics: async () => {
      return apiRequest('/video-analytics/student', {
        method: 'GET',
      });
    },

    getAdminAnalytics: async (selectedOnly = true) => {
      const params = new URLSearchParams();
      if (selectedOnly !== undefined) {
        params.append('selectedOnly', selectedOnly.toString());
      }
      const queryString = params.toString();
      const endpoint = queryString ? `/video-analytics/admin?${queryString}` : '/video-analytics/admin';
      return apiRequest(endpoint, {
        method: 'GET',
      });
    },

    getStudentDetailedAnalytics: async (studentId) => {
      return apiRequest(`/video-analytics/admin/student/${studentId}`, {
        method: 'GET',
      });
    },
  },

  // Enhanced video tracking endpoints
  enhancedVideoTracking: {
    trackPlaylistOpened: async (playlistId) => {
      return apiRequest('/video-tracking/playlist-opened', {
        method: 'POST',
        body: JSON.stringify({ playlistId }),
      });
    },

    startSession: async (videoId, playlistId) => {
      return apiRequest('/video-tracking/session/start', {
        method: 'POST',
        body: JSON.stringify({ videoId, playlistId }),
      });
    },

    trackEvent: async (sessionId, eventData) => {
      return apiRequest('/video-tracking/session/event', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          ...eventData,
        }),
      });
    },

    endSession: async (sessionId, exitReason = 'exited') => {
      return apiRequest('/video-tracking/session/end', {
        method: 'POST',
        body: JSON.stringify({ sessionId, exitReason }),
      });
    },
  },

  // Enhanced video analytics endpoints
  enhancedVideoAnalytics: {
    getStudentDetailed: async () => {
      return apiRequest('/video-analytics/student/detailed', {
        method: 'GET',
      });
    },

    getAdminDetailed: async (selectedOnly = true) => {
      const params = new URLSearchParams();
      if (selectedOnly !== undefined) {
        params.append('selectedOnly', selectedOnly.toString());
      }
      const queryString = params.toString();
      const endpoint = queryString 
        ? `/video-analytics/admin/detailed?${queryString}` 
        : '/video-analytics/admin/detailed';
      return apiRequest(endpoint, { method: 'GET' });
    },

    getVideoAnalytics: async (videoId) => {
      return apiRequest(`/video-analytics/admin/video/${videoId}`, {
        method: 'GET',
      });
    },
  },
};

export default api;

