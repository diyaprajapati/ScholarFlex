// API service for making HTTP requests to the backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
      throw new Error(data.message || 'An error occurred');
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
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
};

export default api;

