const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('iw_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('iw_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  if (res.headers.get('content-type')?.includes('text/csv')) {
    return res.text();
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

// Auth
export const authApi = {
  requestOtp: (email) => api.post('/auth/otp-request', { email }),
  verifyOtp: (email, otp) => api.post('/auth/otp-verify', { email, otp }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// Violations
export const violationsApi = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/violations?${qs}`);
  },
  get: (id) => api.get(`/violations/${encodeURIComponent(id)}`),
  create: (data) => api.post('/violations', data),
  crisisFeed: () => api.get('/violations/crisis-feed'),
  update: (id, data) => api.patch(`/violations/${encodeURIComponent(id)}`, data),
  addNote: (id, text) => api.post(`/violations/${encodeURIComponent(id)}/notes`, { text }),
  addFeedback: (id, feedback) => api.post(`/violations/${encodeURIComponent(id)}/feedback`, { feedback }),
  generateAIReview: (id) => api.post(`/violations/${encodeURIComponent(id)}/ai-review`, {}),
  decideAIReview: (id, reviewId, payload) => api.post(`/violations/${encodeURIComponent(id)}/ai-review/${reviewId}/decision`, payload),
  analyzeImagery: (id, payload) => api.post(`/violations/${encodeURIComponent(id)}/imagery/analyze`, payload),
  bulkAction: (action, ids) => api.post('/violations/bulk-action', { action, ids }),
  export: (params) => {
    const qs = new URLSearchParams(params).toString();
    const token = localStorage.getItem('iw_token');
    return fetch(`${BASE}/violations/export?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob());
  },
};

// Analytics
export const analyticsApi = {
  summary: (period) => api.get(`/analytics/summary?period=${period || 'year'}`),
  trends: (period) => api.get(`/analytics/trends?period=${period || 'year'}`),
  wards: (period) => api.get(`/analytics/wards?period=${period || 'year'}`),
  types: (period) => api.get(`/analytics/types?period=${period || 'year'}`),
  typeTrends: (period) => api.get(`/analytics/type-trends?period=${period || 'year'}`),
  confidence: (period) => api.get(`/analytics/confidence?period=${period || 'year'}`),
  resolution: (period) => api.get(`/analytics/resolution-time?period=${period || 'year'}`),
  quality: (period) => api.get(`/analytics/quality?period=${period || 'year'}`),
};

// Officers
export const officersApi = {
  list: () => api.get('/officers'),
  invite: (data) => api.post('/officers/invite', data),
  update: (id, data) => api.patch(`/officers/${id}`, data),
};

// Notices
export const noticesApi = {
  generate: (violationId, templateId) => api.post('/notices/generate', { violationId, templateId }),
  generateAI: (violationId) => api.post('/notices/generate-ai', { violationId }),
  compare: (violationId) => api.post('/notices/compare', { violationId }),
  templates: () => api.get('/notices/templates'),
  updateTemplate: (id, data) => api.put(`/notices/templates/${id}`, data),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// Logs
export const logsApi = {
  list: (limit = 20) => api.get(`/logs?limit=${limit}`),
};

// Vision AI - The USP
export const visionApi = {
  status: () => api.get('/vision/status'),
  detectChanges: (data) => api.post('/vision/detect-changes', data),
  analyzeSingle: (data) => api.post('/vision/analyze-single', data),
  fullPipeline: (data) => api.post('/vision/full-pipeline', data),
  quickScan: (data) => api.post('/vision/quick-scan', data),
  cityScanPlan: (count = 4) => api.get(`/vision/city-scan/plan?count=${count}`),
  // New killer features
  chat: (data) => api.post('/vision/chat', data),
  batchAnalyze: (data) => api.post('/vision/batch-analyze', data),
  timeline: (data) => api.post('/vision/timeline', data),
  predictRisk: (data) => api.post('/vision/predict-risk', data),
  complianceReport: (data) => api.post('/vision/compliance-report', data),
  voiceCommand: (data) => api.post('/vision/voice-command', data),
  prioritizeAlerts: (data) => api.post('/vision/prioritize-alerts', data),
};
