import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach auth token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auditpulse_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((issue) => {
        if (typeof issue === 'string') return issue;
        const field = Array.isArray(issue?.loc) ? issue.loc.slice(1).join('.') : '';
        return field ? `${field}: ${issue.msg || 'Invalid value'}` : issue?.msg || 'Invalid value';
      }).join('; ')
      : typeof detail === 'string'
        ? detail
        : error.response?.data?.message
          || error.message
          || 'An unexpected error occurred';
    error.userMessage = message;
    return Promise.reject(error);
  }
);

// ===== Policy API =====
export const policyApi = {
  analyze: (data) => api.post('/policies/analyze', data),
  upload: (formData) => api.post('/policies/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  list: () => api.get('/policies'),
  get: (id) => api.get(`/policies/${id}`),
};

// ===== Code API =====
export const codeApi = {
  analyze: (data) => api.post('/code/analyze', data),
  upload: (formData) => api.post('/code/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  list: () => api.get('/code'),
  get: (id) => api.get(`/code/${id}`),
};

// ===== Compliance API =====
export const complianceApi = {
  compare: (data) => api.post('/compliance/compare', data),
};

// ===== Findings API =====
export const findingsApi = {
  list: (params) => api.get('/findings', { params }),
  get: (id) => api.get(`/findings/${id}`),
  updateStatus: (id, status) => api.patch(`/findings/${id}`, { status }),
};

// ===== Vendors API =====
export const vendorsApi = {
  create: (data) => api.post('/vendors', data),
  list: () => api.get('/vendors'),
  get: (id) => api.get(`/vendors/${id}`),
  check: (id) => api.post(`/vendors/${id}/check`),
  delete: (id) => api.delete(`/vendors/${id}`),
  loadDemo: () => api.post('/vendors/demo/load'),
};

// ===== Dashboard API =====
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
};

// ===== GitHub API =====
export const githubApi = {
  analyze: (data) => api.post('/github/analyze', data),
};

export default api;
