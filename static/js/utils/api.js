/* ============================================================
   SOP Portal — API Utility
   Real Django backend calls + mock fallback for dev
   ============================================================ */

const API_BASE = '/api';

// ── Generic fetch wrapper ──
async function apiFetch(path, options = {}) {
  const defaults = {
    headers: {
      'X-CSRFToken': getCsrfToken(),
    },
  };
  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    defaults.headers['Content-Type'] = 'application/json';
  }
  const merged = {
    ...defaults,
    ...options,
    headers: { ...defaults.headers, ...(options.headers || {}) },
  };
  const response = await fetch(API_BASE + path, merged);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

function getCsrfToken() {
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
  return cookie ? cookie.trim().split('=')[1] : '';
}

// ── API Methods ──
export const api = {
  // Stats
  async getDashboardStats() {
    return apiFetch('/stats/');
  },

  // SOPs
  async getSOPs(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search)     params.set('search',     filters.search);
    if (filters.refinery)   params.set('refinery',   filters.refinery);
    if (filters.department) params.set('department', filters.department);
    if (filters.status)     params.set('status',     filters.status);
    if (filters.mine)       params.set('mine',       '1');
    const qs = params.toString();
    return apiFetch(`/sops/${qs ? '?' + qs : ''}`);
  },

  async getSOPDetail(id) {
    return apiFetch(`/sops/${id}/`);
  },

  async createSOP(data) {
    return apiFetch('/sops/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSOP(id, data) {
    return apiFetch(`/sops/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async submitSOP(id) {
    return apiFetch(`/sops/${id}/submit/`, { method: 'POST' });
  },

  async approveSOP(id, comment = '') {
    return apiFetch(`/sops/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  async rejectSOP(id, comment) {
    return apiFetch(`/sops/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // PDF download — returns a URL to open
  getSOPPdfUrl(id) {
    return `${API_BASE}/sops/${id}/pdf/`;
  },

  // Parse uploaded PDF/DOCX → sections JSON
  async parseDocument(file) {
    const form = new FormData();
    form.append('file', file);
    return apiFetch('/parse-document/', { method: 'POST', body: form });
  },

  // Notifications
  async getNotifications() {
    return apiFetch('/notifications/');
  },

  async markNotificationRead(id) {
    return apiFetch(`/notifications/${id}/read/`, { method: 'PATCH' });
  },

  async markAllNotificationsRead() {
    return apiFetch('/notifications/', { method: 'PATCH' });
  },

  // Pending approvals (full page)
  async getPendingApprovals() {
    return apiFetch('/pending-approvals/');
  },

  // Reference data
  async getRefineries()  { return apiFetch('/refineries/'); },
  async getDepartments() { return apiFetch('/departments/'); },
  async getUnits()       { return apiFetch('/units/'); },
};
