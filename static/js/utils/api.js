/* ============================================================
   SOP Portal — API Utility
   Fetch wrappers + mock data for frontend dev
   ============================================================ */

const API_BASE = '/api';

// ── Generic fetch wrapper ──
async function apiFetch(path, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
  };
  const merged = { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } };
  const response = await fetch(API_BASE + path, merged);
  if (!response.ok) throw new Error(`API error ${response.status}: ${response.statusText}`);
  return response.json();
}

function getCsrfToken() {
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
  return cookie ? cookie.split('=')[1] : '';
}

// ── Mock Data ──
const MOCK_SOPS = [
  { id: 1, sop_number: 'SOP-MUM-OPS-NHT-2025-001', title: 'Naphtha Hydrotreater Startup Procedure', refinery: 'Mumbai', department: 'Operations', unit: 'NHT', status: 'approved', submitted_by: 'Rajesh Kumar', date: '2025-11-12' },
  { id: 2, sop_number: 'SOP-MUM-HSE-CDU-2025-002', title: 'Crude Distillation Unit Safety Shutdown', refinery: 'Mumbai', department: 'HSE', unit: 'CDU', status: 'review', submitted_by: 'Priya Sharma', date: '2025-11-18' },
  { id: 3, sop_number: 'SOP-VIZ-OPS-FCC-2025-001', title: 'FCC Regenerator Temperature Control', refinery: 'Vishakhapatnam', department: 'Operations', unit: 'FCC', status: 'draft', submitted_by: 'Venkat Rao', date: '2025-11-20' },
  { id: 4, sop_number: 'SOP-MUN-PRO-HCU-2025-001', title: 'Hydrocracker Feed Rate Optimization', refinery: 'Mundra', department: 'Process Engineering', unit: 'HCU', status: 'rejected', submitted_by: 'Arjun Patel', date: '2025-11-08' },
  { id: 5, sop_number: 'SOP-BAT-MNT-VDU-2025-001', title: 'Vacuum Distillation Column Maintenance Protocol', refinery: 'Bathinda', department: 'Maintenance', unit: 'VDU', status: 'approved', submitted_by: 'Gurpreet Singh', date: '2025-11-05' },
  { id: 6, sop_number: 'SOP-MUM-OPS-CCR-2025-001', title: 'CCR Catalyst Regeneration Procedure', refinery: 'Mumbai', department: 'Operations', unit: 'CCR', status: 'review', submitted_by: 'Anita Desai', date: '2025-11-22' },
  { id: 7, sop_number: 'SOP-VIZ-HSE-ARU-2025-002', title: 'Amine Recovery Unit H2S Monitoring', refinery: 'Vishakhapatnam', department: 'HSE', unit: 'ARU', status: 'approved', submitted_by: 'Kiran Babu', date: '2025-10-30' },
  { id: 8, sop_number: 'SOP-MUN-OPS-SRU-2025-001', title: 'Sulphur Recovery Unit Startup Checklist', refinery: 'Mundra', department: 'Operations', unit: 'SRU', status: 'draft', submitted_by: 'Mehul Shah', date: '2025-11-25' },
];

const MOCK_PENDING_APPROVALS = [
  { id: 2, title: 'CDU Safety Shutdown', submitter: 'Priya Sharma', unit: 'CDU — Mumbai', time: '2025-11-18T09:34:00Z' },
  { id: 6, title: 'CCR Catalyst Regeneration', submitter: 'Anita Desai', unit: 'CCR — Mumbai', time: '2025-11-22T14:10:00Z' },
];

const MOCK_USERS = [
  { id: 1, name: 'Rajesh Kumar', email: 'r.kumar@hpcl.in', role: 'Unit Supervisor', initials: 'RK' },
  { id: 2, name: 'Priya Sharma', email: 'p.sharma@hpcl.in', role: 'Department Head', initials: 'PS' },
  { id: 3, name: 'Venkat Rao', email: 'v.rao@hpcl.in', role: 'HSE Officer', initials: 'VR' },
  { id: 4, name: 'Arjun Patel', email: 'a.patel@hpcl.in', role: 'Plant Manager', initials: 'AP' },
  { id: 5, name: 'Gurpreet Singh', email: 'g.singh@hpcl.in', role: 'Operations Director', initials: 'GS' },
];

const MOCK_REVISION_HISTORY = [
  { version: '1.0', changed_by: 'Rajesh Kumar', date: '2025-11-12', summary: 'Initial creation' },
  { version: '0.9', changed_by: 'Priya Sharma', date: '2025-11-10', summary: 'Draft review comments incorporated' },
];

// ── API Methods (mock-backed) ──
export const api = {
  async getDashboardStats() {
    // Mock
    return { total: 147, pending: 12, approved_month: 34, rejected: 5 };
  },

  async getSOPs(filters = {}) {
    let data = [...MOCK_SOPS];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.sop_number.toLowerCase().includes(q) ||
        s.submitted_by.toLowerCase().includes(q)
      );
    }
    if (filters.refinery) data = data.filter(s => s.refinery === filters.refinery);
    if (filters.department) data = data.filter(s => s.department === filters.department);
    if (filters.status) data = data.filter(s => s.status === filters.status);
    return { results: data, count: data.length };
  },

  async getSOPDetail(id) {
    const sop = MOCK_SOPS.find(s => s.id === Number(id));
    if (!sop) throw new Error('SOP not found');
    return {
      ...sop,
      version: '1.0',
      effective_date: '2025-12-01',
      prepared_by: 'Rajesh Kumar',
      tags: ['startup', 'safety', 'commissioning'],
      sections: [
        {
          id: 1, title: 'Introduction', components: [
            { id: 1, type: 'text', content: '<p>This SOP covers the complete startup procedure for the Naphtha Hydrotreater unit, ensuring safe and efficient operations.</p>', weight: 3 },
            { id: 2, type: 'table', rows: [['Parameter', 'Value', 'Limit'], ['Feed Temperature', '320°C', '280–360°C'], ['H2 Partial Pressure', '45 bar', '40–55 bar']], weight: 2 },
          ]
        },
        {
          id: 2, title: 'Procedure', components: [
            { id: 3, type: 'text', content: '<p>Step 1: Verify all isolation valves are in open position.</p><p>Step 2: Initiate feed flow at minimum rate.</p>', weight: 5 },
          ]
        },
        {
          id: 3, title: 'Safety', components: [
            { id: 4, type: 'text', content: '<p>Ensure H2S monitors are active and PPE is worn at all times.</p>', weight: 4 },
          ]
        },
      ],
      approval_chain: [
        { step: 1, role: 'Unit Supervisor', user: 'Gurpreet Singh', status: 'approved', timestamp: '2025-11-14T10:22:00Z', comment: 'Procedure looks correct.' },
        { step: 2, role: 'Department Head', user: 'Priya Sharma', status: 'approved', timestamp: '2025-11-15T14:45:00Z', comment: '' },
        { step: 3, role: 'HSE Officer', user: 'Venkat Rao', status: 'pending', timestamp: null, comment: '' },
      ],
      revision_history: MOCK_REVISION_HISTORY,
    };
  },

  async getPendingApprovals() {
    return MOCK_PENDING_APPROVALS;
  },

  async getUsers(role = null) {
    if (role) return MOCK_USERS.filter(u => u.role === role);
    return MOCK_USERS;
  },

  async createSOP(data) {
    console.log('[API] createSOP', data);
    return { id: 99, sop_number: data.sop_number || 'SOP-NEW-001', ...data };
  },

  async updateSOP(id, data) {
    console.log('[API] updateSOP', id, data);
    return { id, ...data };
  },

  async submitSOP(id, approvalChain) {
    console.log('[API] submitSOP', id, approvalChain);
    return { success: true };
  },

  async approveSOP(id, comment = '') {
    console.log('[API] approveSOP', id, comment);
    return { success: true };
  },

  async rejectSOP(id, comment) {
    console.log('[API] rejectSOP', id, comment);
    return { success: true };
  },
};
