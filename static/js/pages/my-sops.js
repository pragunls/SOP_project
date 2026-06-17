/* ============================================================
   SOP Portal — My SOPs Page
   Shows all SOPs created by the current user.
   ============================================================ */

import { api }        from '../utils/api.js';
import { AppState }   from '../state.js';
import { icons }      from '../components/icons.js';
import { toast }      from '../utils/toast.js';

let allMine = [];
let sortField = 'date';
let sortDir   = 'desc';
let filterStatus = '';
let filterSearch = '';

export async function renderMySOPs(container) {
  container.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('#dashboard')" tabindex="0" role="link">Dashboard</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">My SOPs</span>
    </nav>

    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">My SOPs</h1>
        <p class="page-subtitle">SOPs you have created or are preparing</p>
      </div>
      <button class="btn btn-danger" onclick="navigate('#new-sop')" aria-label="Create new SOP">
        ${icons.plus.replace('width="20"','width="16"').replace('height="20"','height="16"')}
        New SOP
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-bar" style="margin-bottom:var(--space-5);">
      <div class="search-wrap input-group" style="flex:1;min-width:200px;">
        <span class="input-icon" aria-hidden="true">
          ${icons.search.replace('width="20"','width="16"').replace('height="20"','height="16"')}
        </span>
        <input type="search" class="input-field" id="mine-search"
          placeholder="Search by title or SOP ID…" aria-label="Search my SOPs" />
      </div>
      <select class="select-field" id="mine-status" style="min-width:150px;" aria-label="Filter by status">
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="review">Under Review</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>

    <!-- Stats row -->
    <div class="my-sops-stats" id="mine-stats"></div>

    <!-- Table -->
    <div class="table-card" id="mine-table-card">
      <div style="overflow-x:auto;" role="region" aria-label="My SOPs table" tabindex="0">
        <table class="sop-table" id="mine-table">
          <thead>
            <tr>
              <th class="sortable" data-field="sop_number" tabindex="0">SOP ID <span class="sort-icon">⇅</span></th>
              <th class="sortable" data-field="title"      tabindex="0">Title  <span class="sort-icon">⇅</span></th>
              <th>Refinery</th>
              <th>Department</th>
              <th>Unit</th>
              <th class="sortable" data-field="status" tabindex="0">Status <span class="sort-icon">⇅</span></th>
              <th class="sortable" data-field="date"   tabindex="0">Date   <span class="sort-icon">⇅</span></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="mine-tbody">
            ${skeletonRows(6, 8)}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span id="mine-info" style="font-size:13px;color:var(--color-text-secondary);">Loading…</span>
      </div>
    </div>
  `;

  // Load data
  try {
    const result = await api.getSOPs({ mine: true });
    allMine = result.results || [];
  } catch (e) {
    toast.error('Failed to load your SOPs', e.message);
    allMine = [];
  }

  renderStatsRow(container);
  renderTable(container);

  // Filter events
  container.querySelector('#mine-search')?.addEventListener('input', (e) => {
    filterSearch = e.target.value.toLowerCase();
    renderTable(container);
  });
  container.querySelector('#mine-status')?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    renderTable(container);
  });

  // Sortable headers
  container.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.field;
      if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortField = field; sortDir = 'asc'; }
      container.querySelectorAll('th.sortable').forEach(t => {
        t.classList.remove('sort-asc','sort-desc');
        t.querySelector('.sort-icon').textContent = '⇅';
      });
      th.classList.add(`sort-${sortDir}`);
      th.querySelector('.sort-icon').textContent = sortDir === 'asc' ? '▲' : '▼';
      renderTable(container);
    });
    th.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') th.click(); });
  });
}

function renderStatsRow(container) {
  const el = container.querySelector('#mine-stats');
  if (!el) return;

  const counts = { draft:0, review:0, approved:0, rejected:0 };
  allMine.forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++; });

  el.innerHTML = `
    <div class="my-sops-stat-row">
      <div class="my-sops-stat">
        <span class="my-sops-stat-num">${allMine.length}</span>
        <span class="my-sops-stat-label">Total</span>
      </div>
      <div class="my-sops-stat">
        <span class="my-sops-stat-num" style="color:var(--color-text-secondary)">${counts.draft}</span>
        <span class="my-sops-stat-label">Draft</span>
      </div>
      <div class="my-sops-stat">
        <span class="my-sops-stat-num" style="color:var(--color-primary)">${counts.review}</span>
        <span class="my-sops-stat-label">Under Review</span>
      </div>
      <div class="my-sops-stat">
        <span class="my-sops-stat-num" style="color:var(--color-success)">${counts.approved}</span>
        <span class="my-sops-stat-label">Approved</span>
      </div>
      <div class="my-sops-stat">
        <span class="my-sops-stat-num" style="color:var(--color-danger)">${counts.rejected}</span>
        <span class="my-sops-stat-label">Rejected</span>
      </div>
    </div>
  `;
}

function renderTable(container) {
  const tbody  = container.querySelector('#mine-tbody');
  const infoEl = container.querySelector('#mine-info');
  if (!tbody) return;

  let data = allMine.filter(s => {
    if (filterSearch && !s.title.toLowerCase().includes(filterSearch)
        && !s.sop_number.toLowerCase().includes(filterSearch)) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });

  data.sort((a,b) => {
    const va = a[sortField]||'', vb = b[sortField]||'';
    if (va < vb) return sortDir==='asc' ? -1 : 1;
    if (va > vb) return sortDir==='asc' ?  1 : -1;
    return 0;
  });

  if (infoEl) infoEl.textContent = `${data.length} SOP${data.length!==1?'s':''}`;

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state" style="padding:48px 24px;">
          ${icons['file-text'].replace('width="20"','width="48"').replace('height="20"','height="48"')
            .replace('stroke="currentColor"','stroke="var(--color-border)"')}
          <div class="empty-state-title">
            ${allMine.length === 0 ? 'No SOPs yet' : 'No SOPs match your filters'}
          </div>
          <div class="empty-state-text">
            ${allMine.length === 0
              ? 'Create your first SOP to get started.'
              : 'Try changing the status filter or search term.'}
          </div>
          ${allMine.length === 0
            ? `<button class="btn btn-danger" onclick="navigate('#new-sop')">
                ${icons.plus.replace('width="20"','width="14"').replace('height="20"','height="14"')}
                Create New SOP
               </button>`
            : ''}
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(sop => `
    <tr>
      <td>
        <a class="sop-id-link" href="#sop/${sop.id}"
          onclick="navigate('#sop/${sop.id}');return false;"
          aria-label="View ${escapeHtml(sop.sop_number)}">
          ${escapeHtml(sop.sop_number)}
        </a>
      </td>
      <td style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
        title="${escapeHtml(sop.title)}">${escapeHtml(sop.title)}</td>
      <td>${escapeHtml(sop.refinery)}</td>
      <td>${escapeHtml(sop.department)}</td>
      <td style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(sop.unit)}</td>
      <td>${statusPill(sop.status)}</td>
      <td style="font-family:var(--font-mono);font-size:12px;white-space:nowrap;">${escapeHtml(sop.date)}</td>
      <td>
        <div class="actions-cell">
          <button class="action-btn" onclick="navigate('#sop/${sop.id}')"
            aria-label="View SOP" title="View">
            ${icons.eye.replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
          ${sop.status === 'draft' || sop.status === 'rejected' ? `
            <button class="action-btn" onclick="navigate('#new-sop')"
              aria-label="Edit SOP" title="Edit">
              ${icons.pencil.replace('width="20"','width="16"').replace('height="20"','height="16"')}
            </button>
          ` : ''}
          <button class="action-btn" onclick="downloadSOP(${sop.id})"
            aria-label="Download PDF" title="Download PDF">
            ${icons.download.replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.downloadSOP = function(id) {
  const url = `/api/sops/${id}/pdf/`;
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.download = `sop-${id}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  toast.info('Downloading PDF…');
};

function statusPill(status) {
  const map = {
    draft:    ['pill-draft',    'Draft'],
    review:   ['pill-review',   'Under Review'],
    approved: ['pill-approved', 'Approved'],
    rejected: ['pill-rejected', 'Rejected'],
  };
  const [cls, label] = map[status] || ['pill-draft', status];
  return `<span class="pill ${cls}" role="status">${label}</span>`;
}

function skeletonRows(rows, cols) {
  return Array(rows).fill('').map(() =>
    `<tr>${Array(cols).fill('').map(() =>
      `<td><div class="skeleton skeleton-text" style="width:${50+Math.random()*40}%"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str||'');
  return d.innerHTML;
}
