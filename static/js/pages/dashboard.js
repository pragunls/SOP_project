/* ============================================================
   SOP Portal — Dashboard Page
   ============================================================ */

import { AppState } from '../state.js';
import { api } from '../utils/api.js';
import { icons } from '../components/icons.js';
import { toast } from '../utils/toast.js';

let allSOPs = [];
let sortField = 'date';
let sortDir = 'desc';

export async function renderDashboard(container) {
  container.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <span class="breadcrumb-item active">Dashboard</span>
    </nav>
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Overview of all SOPs across refineries</p>
      </div>
      <button class="btn btn-danger" id="new-sop-btn" aria-label="Create new SOP">
        ${icons.plus.replace('width="20"','width="16"').replace('height="20"','height="16"')}
        New SOP
      </button>
    </div>

    <!-- Stats Row -->
    <div class="stats-row" id="stats-row">
      ${renderStatsSkeleton()}
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-wrap input-group">
        <span class="input-icon" aria-hidden="true">${icons.search.replace('width="20"','width="16"').replace('height="20"','height="16"')}</span>
        <input type="search" class="input-field" id="filter-search"
          placeholder="Search SOP ID, title, author..."
          value="${AppState.dashboardFilters.search}"
          aria-label="Search SOPs" />
      </div>
      <div class="filter-group">
        <select class="select-field" id="filter-refinery" aria-label="Filter by refinery">
          <option value="">All Refineries</option>
          ${AppState.refineries.map(r => `<option value="${r.name}" ${AppState.dashboardFilters.refinery===r.name?'selected':''}>${r.name}</option>`).join('')}
        </select>
        <select class="select-field" id="filter-dept" aria-label="Filter by department">
          <option value="">All Departments</option>
          ${AppState.departments.map(d => `<option value="${d.name}" ${AppState.dashboardFilters.department===d.name?'selected':''}>${d.name}</option>`).join('')}
        </select>
        <select class="select-field" id="filter-status" aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="draft"    ${AppState.dashboardFilters.status==='draft'?'selected':''}>Draft</option>
          <option value="review"   ${AppState.dashboardFilters.status==='review'?'selected':''}>Under Review</option>
          <option value="approved" ${AppState.dashboardFilters.status==='approved'?'selected':''}>Approved</option>
          <option value="rejected" ${AppState.dashboardFilters.status==='rejected'?'selected':''}>Rejected</option>
        </select>
        <input type="date" class="date-range-input" id="filter-date"
          value="${AppState.dashboardFilters.date}"
          title="Filter by submission date"
          aria-label="Filter by date" />
      </div>
    </div>

    <!-- Main grid: table + approval queue -->
    <div class="dashboard-grid">
      <div>
        <div class="table-card">
          <div class="table-card-header">
            <span style="font-size:15px;font-weight:600;">Recent SOPs</span>
            <div style="display:flex;align-items:center;gap:10px;">
              <select class="row-count-select" id="page-size-select" aria-label="Rows per page">
                <option value="10" ${AppState.dashboardPageSize===10?'selected':''}>10 / page</option>
                <option value="25" ${AppState.dashboardPageSize===25?'selected':''}>25 / page</option>
                <option value="50" ${AppState.dashboardPageSize===50?'selected':''}>50 / page</option>
              </select>
            </div>
          </div>
          <div style="overflow-x:auto;" role="region" aria-label="SOPs table" tabindex="0">
            <table class="sop-table" id="sop-table">
              <thead>
                <tr>
                  ${renderTableHeaders()}
                </tr>
              </thead>
              <tbody id="sop-tbody">
                ${renderTableSkeleton()}
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span id="table-info" style="font-size:13px;color:var(--color-text-secondary);">Loading…</span>
            <div class="pagination" id="pagination" role="navigation" aria-label="Table pagination"></div>
          </div>
        </div>
      </div>

      <!-- Approval Queue -->
      <div class="approval-queue" id="approval-queue">
        <div class="approval-queue-header">
          <span style="font-size:15px;font-weight:600;">Pending Your Approval</span>
          <span class="badge" id="approval-badge">…</span>
        </div>
        <div id="approval-list">
          ${renderApprovalSkeleton()}
        </div>
      </div>
    </div>
  `;

  // Attach filter events
  const search = container.querySelector('#filter-search');
  const refinery = container.querySelector('#filter-refinery');
  const dept = container.querySelector('#filter-dept');
  const status = container.querySelector('#filter-status');
  const date = container.querySelector('#filter-date');

  [search, refinery, dept, status, date].forEach(el => {
    el?.addEventListener('input', handleFilterChange);
    el?.addEventListener('change', handleFilterChange);
  });

  container.querySelector('#page-size-select')?.addEventListener('change', (e) => {
    AppState.dashboardPageSize = Number(e.target.value);
    AppState.dashboardPage = 1;
    renderTable();
  });

  container.querySelector('#new-sop-btn')?.addEventListener('click', () => {
    navigate('#new-sop');
  });

  // Sortable headers
  container.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.field;
      if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortField = field; sortDir = 'asc'; }
      container.querySelectorAll('th.sortable').forEach(t => {
        t.classList.remove('sort-asc', 'sort-desc');
        t.querySelector('.sort-icon').textContent = '⇅';
      });
      th.classList.add(`sort-${sortDir}`);
      th.querySelector('.sort-icon').textContent = sortDir === 'asc' ? '▲' : '▼';
      renderTable();
    });
    th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') th.click(); });
  });

  // Load data
  await Promise.all([loadStats(), loadSOPs(), loadApprovals()]);
}

function handleFilterChange() {
  const search = document.getElementById('filter-search');
  const refinery = document.getElementById('filter-refinery');
  const dept = document.getElementById('filter-dept');
  const status = document.getElementById('filter-status');
  const date = document.getElementById('filter-date');

  AppState.dashboardFilters.search = search?.value || '';
  AppState.dashboardFilters.refinery = refinery?.value || '';
  AppState.dashboardFilters.department = dept?.value || '';
  AppState.dashboardFilters.status = status?.value || '';
  AppState.dashboardFilters.date = date?.value || '';
  AppState.dashboardPage = 1;
  renderTable();
}

async function loadStats() {
  try {
    const stats = await api.getDashboardStats();
    const row = document.getElementById('stats-row');
    if (!row) return;
    row.innerHTML = `
      ${renderStatCard('Total SOPs', stats.total, 'file-text', '', '')}
      ${renderStatCard('Pending Approval', stats.pending, 'clock', 'warning', '')}
      ${renderStatCard('Approved This Month', stats.approved_month, 'check-circle', 'success', '')}
      ${renderStatCard('Rejected', stats.rejected, 'x-circle', 'danger', 'danger')}
    `;
  } catch(e) {
    console.error('Stats load failed', e);
  }
}

function renderStatCard(label, value, iconKey, iconVariant, numVariant) {
  return `
    <div class="stat-card card-hoverable" role="figure" aria-label="${label}: ${value}">
      <div class="stat-card-top">
        <div class="stat-icon ${iconVariant}" aria-hidden="true">${icons[iconKey] || icons.circle}</div>
      </div>
      <div class="stat-number ${numVariant}">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

async function loadSOPs() {
  try {
    const result = await api.getSOPs();
    allSOPs = result.results;
    renderTable();
  } catch(e) {
    toast.error('Failed to load SOPs', e.message);
  }
}

async function loadApprovals() {
  try {
    const pending = await api.getPendingApprovals();
    const listEl = document.getElementById('approval-list');
    const badgeEl = document.getElementById('approval-badge');
    if (!listEl) return;

    if (badgeEl) badgeEl.textContent = pending.length;

    if (pending.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:32px;">
          <div class="empty-state-icon" aria-hidden="true">
            ${icons['file-doc'].replace('width="24"','width="48"').replace('height="24"','height="48"')}
          </div>
          <div class="empty-state-title">No pending approvals</div>
          <div class="empty-state-text">You're all caught up!</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = pending.map(item => `
      <div class="approval-item">
        <div class="approval-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="approval-item-meta">${escapeHtml(item.submitter)} · ${escapeHtml(item.unit)}</div>
        <div class="approval-item-time">${formatTime(item.time)}</div>
        <button class="btn btn-outline btn-sm" style="width:100%;"
          onclick="navigate('#sop/${item.id}')" aria-label="Review ${escapeHtml(item.title)}">
          Review
        </button>
      </div>
    `).join('');
  } catch(e) {
    console.error('Approvals load failed', e);
  }
}

function renderTable() {
  const tbody = document.getElementById('sop-tbody');
  const infoEl = document.getElementById('table-info');
  const paginationEl = document.getElementById('pagination');
  if (!tbody) return;

  // Filter
  const f = AppState.dashboardFilters;
  let data = allSOPs.filter(sop => {
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!sop.sop_number.toLowerCase().includes(q) &&
          !sop.title.toLowerCase().includes(q) &&
          !sop.submitted_by.toLowerCase().includes(q)) return false;
    }
    if (f.refinery && sop.refinery !== f.refinery) return false;
    if (f.department && sop.department !== f.department) return false;
    if (f.status && sop.status !== f.status) return false;
    return true;
  });

  // Sort
  data.sort((a, b) => {
    let va = a[sortField] || '', vb = b[sortField] || '';
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate
  const total = data.length;
  const pageSize = AppState.dashboardPageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(AppState.dashboardPage, totalPages);
  AppState.dashboardPage = page;
  const start = (page - 1) * pageSize;
  const pageData = data.slice(start, start + pageSize);

  if (infoEl) infoEl.textContent = `Showing ${start + 1}–${Math.min(start + pageSize, total)} of ${total}`;

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--color-text-secondary);">No SOPs match your filters.</td></tr>`;
  } else {
    tbody.innerHTML = pageData.map(sop => renderTableRow(sop)).join('');
  }

  // Action menus
  document.querySelectorAll('.more-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
      menu.classList.toggle('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  }, { once: true });

  if (paginationEl) renderPagination(paginationEl, page, totalPages);
}

function renderTableRow(sop) {
  return `
    <tr>
      <td>
        <a class="sop-id-link" href="#sop/${sop.id}" onclick="navigate('#sop/${sop.id}');return false;"
          aria-label="View SOP ${escapeHtml(sop.sop_number)}">${escapeHtml(sop.sop_number)}</a>
      </td>
      <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(sop.title)}">${escapeHtml(sop.title)}</td>
      <td>${escapeHtml(sop.refinery)}</td>
      <td>${escapeHtml(sop.department)}</td>
      <td><span style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(sop.unit)}</span></td>
      <td>${renderStatusPill(sop.status)}</td>
      <td>${escapeHtml(sop.submitted_by)}</td>
      <td style="font-family:var(--font-mono);font-size:12px;white-space:nowrap;">${escapeHtml(sop.date)}</td>
      <td>
        <div class="actions-cell" style="position:relative;">
          <button class="action-btn" onclick="navigate('#sop/${sop.id}')" aria-label="View SOP"
            title="View">
            ${icons.eye.replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
          <button class="action-btn" onclick="navigate('#new-sop')" aria-label="Edit SOP"
            title="Edit">
            ${icons.pencil.replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
          <button class="action-btn more-menu-btn" aria-label="More actions" aria-haspopup="true">
            ${icons['more-horiz'].replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
          <div class="dropdown-menu" role="menu">
            <div class="dropdown-item" role="menuitem">
              ${icons.withdraw.replace('width="20"','width="14"').replace('height="20"','height="14"')} Withdraw
            </div>
            <div class="dropdown-item" role="menuitem">
              ${icons.duplicate.replace('width="20"','width="14"').replace('height="20"','height="14"')} Duplicate
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderTableHeaders() {
  const cols = [
    { label: 'SOP ID',       field: 'sop_number',   sortable: true },
    { label: 'Title',        field: 'title',        sortable: true },
    { label: 'Refinery',     field: 'refinery',     sortable: true },
    { label: 'Department',   field: 'department',   sortable: false },
    { label: 'Unit',         field: 'unit',         sortable: false },
    { label: 'Status',       field: 'status',       sortable: true },
    { label: 'Submitted By', field: 'submitted_by', sortable: false },
    { label: 'Date',         field: 'date',         sortable: true },
    { label: 'Actions',      field: null,           sortable: false },
  ];
  return cols.map(c => `
    <th class="${c.sortable ? 'sortable' : ''} ${c.field === sortField ? `sort-${sortDir}` : ''}"
      ${c.sortable ? `data-field="${c.field}" tabindex="0" role="columnheader" aria-sort="${c.field === sortField ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}"` : ''}>
      ${c.label}
      ${c.sortable ? `<span class="sort-icon" aria-hidden="true">${c.field === sortField ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>` : ''}
    </th>
  `).join('');
}

function renderPagination(el, page, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= page - 2 && i <= page + 2)) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  el.innerHTML = `
    <button class="pagination-btn" id="pg-prev" aria-label="Previous page" ${page <= 1 ? 'disabled' : ''}>
      ${icons.chevronLeft.replace('width="20"','width="12"').replace('height="20"','height="12"')}
    </button>
    ${pages.map(p =>
      p === '…'
        ? `<span class="pagination-info">…</span>`
        : `<button class="pagination-btn ${p === page ? 'active' : ''}" aria-label="Page ${p}" aria-current="${p === page ? 'page' : 'false'}">${p}</button>`
    ).join('')}
    <button class="pagination-btn" id="pg-next" aria-label="Next page" ${page >= total ? 'disabled' : ''}>
      ${icons.chevronRight.replace('width="20"','width="12"').replace('height="20"','height="12"')}
    </button>
  `;

  el.querySelector('#pg-prev')?.addEventListener('click', () => {
    if (AppState.dashboardPage > 1) { AppState.dashboardPage--; renderTable(); }
  });
  el.querySelector('#pg-next')?.addEventListener('click', () => {
    if (AppState.dashboardPage < total) { AppState.dashboardPage++; renderTable(); }
  });
  el.querySelectorAll('.pagination-btn:not(#pg-prev):not(#pg-next)').forEach(btn => {
    const pg = parseInt(btn.textContent);
    if (!isNaN(pg)) {
      btn.addEventListener('click', () => { AppState.dashboardPage = pg; renderTable(); });
    }
  });
}

function renderStatusPill(status) {
  const map = {
    draft:    ['pill-draft',    'Draft'],
    review:   ['pill-review',   'Under Review'],
    approved: ['pill-approved', 'Approved'],
    rejected: ['pill-rejected', 'Rejected'],
  };
  const [cls, label] = map[status] || ['pill-draft', status];
  return `<span class="pill ${cls}" role="status">${label}</span>`;
}

function renderStatsSkeleton() {
  return Array(4).fill('').map(() => `<div class="stat-card"><div class="skeleton skeleton-card" style="height:90px;"></div></div>`).join('');
}

function renderTableSkeleton() {
  return Array(5).fill('').map(() => `
    <tr>${Array(9).fill('').map(() => `<td><div class="skeleton skeleton-text" style="width:${60+Math.random()*80}%;"></div></td>`).join('')}</tr>
  `).join('');
}

function renderApprovalSkeleton() {
  return Array(2).fill('').map(() => `
    <div class="approval-item">
      <div class="skeleton skeleton-text" style="width:80%;margin-bottom:8px;"></div>
      <div class="skeleton skeleton-text sm" style="width:60%;margin-bottom:6px;"></div>
      <div class="skeleton skeleton-text sm" style="width:40%;margin-bottom:10px;"></div>
      <div class="skeleton" style="height:30px;border-radius:4px;"></div>
    </div>
  `).join('');
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
