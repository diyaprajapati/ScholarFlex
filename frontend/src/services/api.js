// API service for making HTTP requests to the backend
// Uses Axios with 401 interceptor: expired access token → refresh (HttpOnly cookie) → retry; on refresh failure → logout & redirect.

import axios from 'axios';
import { authService, SESSION_EXPIRED_KEY } from '../utils/auth';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://172.20.10.5:5000/api';
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://10.241.25.164:5000/api';
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sfapi.techelecon.in/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const REFRESH_ENDPOINT = '/auth/refresh';

/** Guard to prevent multiple redirects when refresh fails (e.g. several in-flight 401s) */
let _authRedirectInProgress = false;

/**
 * Get access token from storage (used for Authorization header).
 */
const getToken = () => {
  return authService.getToken();
};

/**
 * Get open student session token from localStorage
 */
const getOpenSessionToken = () => {
  return localStorage.getItem('open_student_token');
};

/**
 * Force logout and redirect to login (used when refresh fails or request was already retried).
 */
function forceLogoutAndRedirect(isOpenEndpoint = false) {
  if (_authRedirectInProgress) return;
  _authRedirectInProgress = true;
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');
    sessionStorage.setItem('scholarflex_login_message', 'Please login again.');
  } catch (_) {}
  authService.logout();
  if (isOpenEndpoint) {
    localStorage.removeItem('open_student_token');
    localStorage.removeItem('open_student_data');
    window.location.href = '/';
  } else {
    window.location.href = '/login';
  }
}

/**
 * Call POST /auth/refresh with credentials (sends HttpOnly cookie).
 * Returns a promise that resolves with the new access token, or rejects on failure.
 */
async function refreshAccessToken() {
  const res = await apiClient.request({
    method: 'POST',
    url: REFRESH_ENDPOINT,
  });
  const data = res?.data;
  if (data?.token) return data.token;
  throw new Error('Refresh response missing token');
}

// Axios instance: withCredentials: true so browser sends HttpOnly refresh cookie on every request (required for cross-domain refresh).
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true, // we handle status in interceptor to support refresh flow
});

// Request interceptor: attach access token or open-session token
apiClient.interceptors.request.use((config) => {
  const endpoint = typeof config.url === 'string' ? config.url : config.baseURL + (config.url || '');
  const isOpenEndpoint = endpoint.startsWith('/open/');
  const isPublicEndpoint = endpoint.startsWith('/public/');

  if (isOpenEndpoint) {
    const openToken = getOpenSessionToken();
    if (openToken) config.headers['X-Open-Session-Token'] = openToken;
  } else if (!isPublicEndpoint) {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData: let browser set Content-Type with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor: on 401, try refresh then retry once; on refresh failure or already retried, force logout.
// 401 must be handled in the success handler so we can return the refresh/retry promise; the error handler
// only runs for request failures (e.g. network), not when success handler returns a rejected promise.
function handle401(config, response) {
  const endpoint = (typeof config?.url === 'string' ? config.url : '') || '';
  const isOpenEndpoint = endpoint.startsWith('/open/');
  const isPublicEndpoint = endpoint.startsWith('/public/');

  if (isPublicEndpoint) return null;

  if (isOpenEndpoint) {
    forceLogoutAndRedirect(true);
    return Promise.reject(new Error('Session expired. Please log in again.'));
  }
  if (endpoint.includes(REFRESH_ENDPOINT) || config._retried) {
    forceLogoutAndRedirect(false);
    const err = new Error('Session expired. Please log in again.');
    err.status = 401;
    return Promise.reject(err);
  }
  return refreshAccessToken()
    .then((newToken) => {
      authService.setToken(newToken);
      config._retried = true;
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${newToken}`;
      return apiClient.request(config);
    })
    .catch(() => {
      forceLogoutAndRedirect(false);
      const err = new Error('Session expired. Please log in again.');
      err.status = 401;
      return Promise.reject(err);
    });
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.status >= 200 && response.status < 300) return response;
    if (response.status === 401) {
      const result = handle401(response.config, response);
      if (result !== null) return result;
    }
    return Promise.reject(Object.assign(new Error(response?.data?.message || 'Non-2xx response'), { response }));
  },
  (error) => {
    const response = error.response;
    const status = response?.status;
    const config = response?.config ?? error.config;
    if (status === 401) {
      const result = handle401(config, response);
      if (result !== null) return result;
    }
    return Promise.reject(error);
  }
);

/** Timeout for time-tracking API calls (stop/pause/resume) to prevent stuck loading state */
const TIMER_API_TIMEOUT_MS = 15000;

/**
 * Run an API request with a timeout.
 */
const apiRequestWithTimeout = async (ms, endpoint, options = {}) => {
  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), ms);
  try {
    return await apiRequest(endpoint, { ...options, signal: ac.signal });
  } catch (e) {
    if (e.name === 'AbortError' || e.code === 'ERR_CANCELED') {
      const err = new Error('Request timed out. Please try again.');
      err.isTimeout = true;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Build and throw a structured error from API error response (non-401).
 */
function throwApiError(endpoint, status, data) {
  const isAccessDeniedForNonSelected = status === 403 &&
    endpoint === '/auth/me' &&
    data?.message &&
    data.message.includes('Access denied') &&
    (data.message.includes('not selected') || data.message.includes('evaluated'));

  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const errorDetails = data.errors
      .map((err, idx) => {
        if (typeof err === 'string') return err;
        if (typeof err === 'object' && err !== null) {
          if (err.reason) {
            return `Row ${err.row || idx + 1}: ${err.reason}${err.email ? ` (${err.email})` : ''}`;
          }
          return JSON.stringify(err);
        }
        return String(err);
      })
      .slice(0, 10)
      .join('\n');
    const errorMessage = data.message || 'Validation errors';
    const moreErrors = data.errors.length > 10 ? `\n... and ${data.errors.length - 10} more errors.` : '';
    const error = new Error(`${errorMessage}\n\n${errorDetails}${moreErrors}`);
    error.status = status;
    if (!isAccessDeniedForNonSelected) console.error('API request error:', error);
    throw error;
  }
  const error = new Error(data?.message || 'An error occurred');
  error.status = status;
  if (!isAccessDeniedForNonSelected) console.error('API request error:', error);
  throw error;
}

/**
 * Make an API request with authentication.
 * Uses Axios; 401 is handled by interceptor (refresh then retry, or logout on refresh failure).
 */
const apiRequest = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const config = {
    url: endpoint,
    method: (options.method || 'GET').toUpperCase(),
    data: options.body,
    signal: options.signal,
    headers: { ...options.headers },
  };
  if (isFormData) delete config.headers['Content-Type'];
  else if (config.data && typeof config.data === 'string') {
    try {
      config.data = JSON.parse(config.data);
    } catch (_) {
      // leave as string if not JSON
    }
  }

  try {
    const response = await apiClient.request(config);
    const status = response.status;
    const data = response.data;

    if (status >= 200 && status < 300) return data;

    // Non-2xx: throw so caller sees same error shape (interceptor already handled 401 retry/logout)
    if (status === 401) {
      const err = new Error(data?.message || 'Session expired. Please log in again.');
      err.status = 401;
      throw err;
    }
    throwApiError(endpoint, status, data);
  } catch (error) {
    const errorMessage = error.message || error.toString() || '';
    const isAccessDeniedForNonSelected = endpoint === '/auth/me' &&
      errorMessage.includes('Access denied') &&
      (errorMessage.includes('not selected') || errorMessage.includes('evaluated'));

    if (error.response?.data && !error.status) error.status = error.response.status;
    if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
      error.isNetworkError = true;
    }
    if (!isAccessDeniedForNonSelected) console.error('API request error:', error);
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
    create: async (data) => {
      return apiRequest('/admin/domains', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    getStats: async () => {
      return apiRequest('/admin/domains/stats', {
        method: 'GET',
      });
    },
    delete: async (id, data = {}) => {
      const options = {
        method: 'DELETE',
      };
      if (data && Object.keys(data).length > 0) {
        options.body = JSON.stringify(data);
      }
      return apiRequest(`/admin/domains/${id}`, options);
    },
  },

  institutes: {
    getStats: async () => {
      return apiRequest('/admin/institutes/stats', {
        method: 'GET',
      });
    },
    merge: async (data) => {
      return apiRequest('/admin/institutes/merge', {
        method: 'POST',
        body: JSON.stringify(data),
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
    
    // Open Student Analytics
    getOpenStudentAggregateAnalytics: async () => {
      return apiRequest('/admin/analytics/open-students/aggregate', {
        method: 'GET',
      });
    },
    
    getOpenStudentStats: async () => {
      return apiRequest('/admin/analytics/open-students/stats', {
        method: 'GET',
      });
    },
    
    getOpenStudentIndividualAnalytics: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/admin/analytics/open-students/individual?${queryString}`
        : '/admin/analytics/open-students/individual';
      
      return apiRequest(endpoint, {
        method: 'GET',
      });
    },
    
    // Firebase Analytics (range: 'week' | 'month' | 'year' for daily activity chart)
    getFirebaseAnalytics: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/admin/analytics/firebase${query ? `?${query}` : ''}`, {
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

    getSettings: async () => {
      return apiRequest('/admin/settings', { method: 'GET' });
    },

    updateSettings: async (settings) => {
      return apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
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

    getAll: async (params = {}) => {
      const query = new URLSearchParams();
      if (params.academic_year) query.set('academic_year', params.academic_year);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return apiRequest(`/candidates${qs}`, {
        method: 'GET',
      });
    },

    getAcademicYears: async () => {
      return apiRequest('/candidates/academic-years', { method: 'GET' });
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

    delete: async (id) => {
      return apiRequest(`/candidates/${id}`, {
        method: 'DELETE',
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

    markAsCompleted: async (videoId, skipNextVideo = false) => {
      const url = `/video-tracking/complete/${videoId}${skipNextVideo ? '?skipNextVideo=true' : ''}`;
      return apiRequest(url, {
        method: 'POST',
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

  // Internship Status endpoints
  internshipStatus: {
    getStudentStatus: async () => {
      return apiRequest('/student/internship/status', {
        method: 'GET',
      });
    },

    getAllStatuses: async (filters = {}, queryString = '') => {
      let endpoint = '/admin/internship/status';
      if (queryString) {
        endpoint += `?${queryString}`;
      } else {
        const queryParams = new URLSearchParams();
        if (filters.studentId) queryParams.append('studentId', filters.studentId);
        if (filters.page) queryParams.append('page', filters.page);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
        if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
        if (filters.search) queryParams.append('search', filters.search);

        const params = queryParams.toString();
        if (params) endpoint += `?${params}`;
      }

      return apiRequest(endpoint, {
        method: 'GET',
      });
    },
  },

  // Student Projects endpoints
  projects: {
    // Admin endpoints
    create: async (data) => {
      return apiRequest('/admin/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      if (filters.studentId) queryParams.append('studentId', filters.studentId);

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/admin/projects?${queryString}` : '/admin/projects';

      return apiRequest(endpoint, {
        method: 'GET',
      });
    },

    getSelectedStudentsWithProjects: async (filters = {}, queryString = '') => {
      let endpoint = '/admin/projects/students';
      if (queryString) {
        endpoint += `?${queryString}`;
      } else {
        const queryParams = new URLSearchParams();
        if (filters.page) queryParams.append('page', filters.page);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
        if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
        if (filters.search) queryParams.append('search', filters.search);

        const params = queryParams.toString();
        if (params) endpoint += `?${params}`;
      }

      return apiRequest(endpoint, {
        method: 'GET',
      });
    },

    getByStudentId: async (studentId) => {
      return apiRequest(`/admin/projects/student/${studentId}`, {
        method: 'GET',
      });
    },

    getById: async (id) => {
      return apiRequest(`/admin/projects/${id}`, {
        method: 'GET',
      });
    },

    update: async (id, data) => {
      return apiRequest(`/admin/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id) => {
      return apiRequest(`/admin/projects/${id}`, {
        method: 'DELETE',
      });
    },

    // Student endpoints
    getStudentProjects: async () => {
      return apiRequest('/student/projects', {
        method: 'GET',
      });
    },

    getStudentProjectById: async (id) => {
      return apiRequest(`/student/projects/${id}`, {
        method: 'GET',
      });
    },
  },

  // Student Evaluations endpoints (Admin only)
  evaluations: {
    create: async (data) => {
      return apiRequest('/admin/evaluations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      if (filters.studentId) queryParams.append('studentId', filters.studentId);
      if (filters.weekNo) queryParams.append('weekNo', filters.weekNo);

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/admin/evaluations?${queryString}` : '/admin/evaluations';

      return apiRequest(endpoint, {
        method: 'GET',
      });
    },

    getByStudentId: async (studentId) => {
      return apiRequest(`/admin/evaluations/student/${studentId}`, {
        method: 'GET',
      });
    },

    getById: async (id) => {
      return apiRequest(`/admin/evaluations/${id}`, {
        method: 'GET',
      });
    },

    update: async (id, data) => {
      return apiRequest(`/admin/evaluations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id) => {
      return apiRequest(`/admin/evaluations/${id}`, {
        method: 'DELETE',
      });
    },

    export: async (domainIds = null, startDate = null, endDate = null) => {
      const token = getToken();
      const queryParams = new URLSearchParams();
      if (domainIds && Array.isArray(domainIds) && domainIds.length > 0) {
        domainIds.forEach(id => queryParams.append('domainId', id));
      }
      if (startDate) {
        queryParams.append('startDate', startDate);
      }
      if (endDate) {
        queryParams.append('endDate', endDate);
      }
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/admin/evaluations/export?${queryString}` : '/admin/evaluations/export';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        // Try to get error message if it's JSON
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to export evaluations');
        } catch (e) {
          throw new Error('Failed to export evaluations');
        }
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'evaluated_students.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    },
  },

  // Student Profile endpoints
  studentProfile: {
    get: async () => {
      return apiRequest('/student/profile', {
        method: 'GET',
      });
    },

    checkCompletion: async () => {
      return apiRequest('/student/profile/check-completion', {
        method: 'GET',
      });
    },

    update: async (data) => {
      return apiRequest('/student/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    uploadProfileImage: async (file) => {
      const formData = new FormData();
      formData.append('profileImage', file);

      return apiRequest('/student/profile/image', {
        method: 'POST',
        body: formData,
      });
    },

    uploadResume: async (file) => {
      const formData = new FormData();
      formData.append('resume', file);

      return apiRequest('/student/profile/resume', {
        method: 'POST',
        body: formData,
      });
    },
  },

  // Time Tracking endpoints (start/finish/pause/resume use timeout to avoid stuck loading)
  timeTracking: {
    start: async () => {
      return apiRequestWithTimeout(TIMER_API_TIMEOUT_MS, '/student/time-tracking/start', {
        method: 'POST',
      });
    },

    finish: async () => {
      return apiRequestWithTimeout(TIMER_API_TIMEOUT_MS, '/student/time-tracking/finish', {
        method: 'POST',
      });
    },

    getActive: async () => {
      return apiRequest('/student/time-tracking/active', {
        method: 'GET',
      });
    },

    heartbeat: async () => {
      return apiRequest('/student/time-tracking/heartbeat', {
        method: 'POST',
      });
    },

    askQuestion: async () => {
      return apiRequest('/student/time-tracking/ask-question', {
        method: 'POST',
      });
    },

    answerQuestion: async (questionId, answer) => {
      return apiRequest('/student/time-tracking/answer-question', {
        method: 'POST',
        body: JSON.stringify({ questionId, answer }),
      });
    },

    pause: async () => {
      return apiRequestWithTimeout(TIMER_API_TIMEOUT_MS, '/student/time-tracking/pause', {
        method: 'POST',
      });
    },

    resume: async () => {
      return apiRequestWithTimeout(TIMER_API_TIMEOUT_MS, '/student/time-tracking/resume', {
        method: 'POST',
      });
    },

    getToday: async () => {
      return apiRequest('/student/time-tracking/today', {
        method: 'GET',
      });
    },
  },

  // Admin Time Tracking endpoints
  adminTimeTracking: {
    getStudentsHours: async (date, studentId) => {
      const queryParams = new URLSearchParams();
      if (date) queryParams.append('date', date);
      if (studentId) queryParams.append('studentId', studentId);

      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `/admin/time-tracking/students?${queryString}`
        : '/admin/time-tracking/students';

      return apiRequest(endpoint, {
        method: 'GET',
      });
    },
    getDayWiseStudentsHours: async (studentId, startDate, endDate) => {
      const queryParams = new URLSearchParams();
      if (studentId) queryParams.append('studentId', studentId);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `/admin/time-tracking/students/day-wise?${queryString}`
        : '/admin/time-tracking/students/day-wise';

      return apiRequest(endpoint, {
        method: 'GET',
      });
    },
    
    getTimerLogs: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.studentId) queryParams.append('studentId', params.studentId);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      
      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `/admin/time-tracking/logs?${queryString}`
        : '/admin/time-tracking/logs';
      
      return apiRequest(endpoint, {
        method: 'GET',
      });
    },
  },

  // Open student endpoints
  openStudent: {
    register: async (data) => {
      return apiRequest('/open/register', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          phone: data.phone,
        }),
      });
    },

    getCurrent: async () => {
      return apiRequest('/open/me', {
        method: 'GET',
      });
    },

    getDashboard: async () => {
      return apiRequest('/open/dashboard', {
        method: 'GET',
      });
    },

    getPlaylists: async () => {
      return apiRequest('/open/playlists', {
        method: 'GET',
      });
    },

    getPlaylistById: async (playlistId) => {
      return apiRequest(`/open/playlists/${playlistId}`, {
        method: 'GET',
      });
    },

    trackVideoProgress: async (data) => {
      return apiRequest('/open/video-progress', {
        method: 'POST',
        body: JSON.stringify({
          videoId: data.videoId,
          playlistId: data.playlistId,
          watchTimeSeconds: data.watchTimeSeconds,
          progressPercent: data.progressPercent,
          lastPosition: data.lastPosition,
        }),
      });
    },

    getVideoProgress: async (videoId) => {
      return apiRequest(`/open/video-progress/${videoId}`, {
        method: 'GET',
      });
    },

    logout: async () => {
      return apiRequest('/open/logout', {
        method: 'POST',
      });
    },
  },

  // Public endpoints (no auth required)
  public: {
    getCandidateRegistrationEnabled: async () => {
      return apiRequest('/public/candidate-registration-enabled', { method: 'GET' });
    },

    registerCandidate: async (data) => {
      return apiRequest('/public/candidates/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getDomains: async () => {
      return apiRequest('/public/domains', { method: 'GET' });
    },

    getInstitutesStats: async () => {
      return apiRequest('/public/institutes/stats', { method: 'GET' });
    },
  },
};

export default api;

