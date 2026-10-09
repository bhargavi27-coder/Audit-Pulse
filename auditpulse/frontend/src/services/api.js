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
    // If 401 and we have a stored token, it's expired/invalid — clear it
    if (error.response?.status === 401) {
      localStorage.removeItem('auditpulse_token');
    }
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
  compareVersions: (data) => api.post('/policies/compare-versions', data),
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
  continuousCheck: () => api.post('/compliance/continuous-check'),
  getHistory: (limit = 25) => api.get('/compliance/history', { params: { limit } }),
};

// ===== Findings API =====
export const findingsApi = {
  list: (params) => api.get('/findings', { params }),
  get: (id) => api.get(`/findings/${id}`),
  updateStatus: (id, status) => api.patch(`/findings/${id}`, { status }),
  review: (id, data) => api.post(`/findings/${id}/review`, data),
  getTimeline: (id) => api.get(`/findings/${id}/timeline`),
};

// ===== AI Feedback API =====
export const feedbackApi = {
  list: () => api.get('/feedback'),
  create: (data) => api.post('/feedback', data),
  delete: (id) => api.delete(`/feedback/${id}`),
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
  simulatePr: () => api.post('/github/simulate-pr'),
  listChecks: () => api.get('/github/checks'),
};

// ===== Reports API =====
export const reportsApi = {
  getAuditReport: () => api.get('/reports/audit-report'),
  getExportHtmlUrl: () => '/api/reports/export/html',
};

// ===== Auth API =====
export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  signin: (data) => api.post('/auth/signin', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export default api;

