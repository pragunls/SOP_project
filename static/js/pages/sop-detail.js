/* ============================================================
   SOP Portal — SOP Detail View Page
   ============================================================ */

import { AppState } from '../state.js';
import { api } from '../utils/api.js';
import { icons } from '../components/icons.js';
import { toast } from '../utils/toast.js';

export async function renderSopDetail(container, sopId) {
  container.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('#dashboard')" tabindex="0" role="link">Dashboard</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">SOP Detail</span>
    </nav>
    <div style="display:flex;align-items:center;justify-content:center;padding:60px;">
      <div class="skeleton" style="width:300px;height:24px;border-radius:4px;"></div>
    </div>
  `;

  let sop;
  try {
    sop = await api.getSOPDetail(sopId);
  } catch(e) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icons['x-circle'].replace('width="20"','width="48"').replace('height="20"','height="48"')}</div>
        <div class="empty-state-title">SOP not found</div>
        <div class="empty-state-text">The SOP you're looking for doesn't exist or you don't have access.</div>
        <button class="btn btn-primary" onclick="navigate('#dashboard')">Back to Dashboard</button>
      </div>
    `;
    return;
  }

  const isOwner = sop.submitted_by === AppState.currentUser.name;
  const canEdit = sop.status === 'draft' || isOwner;
  const totalScore = sop.sections.reduce((acc, s) => acc + s.components.reduce((a, c) => a + (Number(c.weight)||0), 0), 0);
  const maxScore = sop.sections.reduce((acc, s) => acc + s.components.length * 9, 0);
  const scorePct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  container.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('#dashboard')" tabindex="0" role="link">Dashboard</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">${escapeHtml(sop.sop_number)}</span>
    </nav>

    <div class="sop-detail-header">
      <div class="sop-detail-number">${escapeHtml(sop.sop_number)}</div>
      <div class="sop-detail-title-row">
        <h1 class="sop-detail-title">${escapeHtml(sop.title)}</h1>
        <div class="sop-detail-actions">
          ${renderStatusPill(sop.status, true)}
          <button class="btn btn-outline" id="download-btn" aria-label="Download PDF">
            ${icons.download.replace('width="20"','width="16"').replace('height="20"','height="16"')} Download PDF
          </button>
          ${canEdit ? `
            <button class="btn btn-primary" id="edit-btn" aria-label="Edit SOP">
              ${icons.pencil.replace('width="20"','width="16"').replace('height="20"','height="16"')} Edit
            </button>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="tab-bar card" role="tablist" style="border-radius:var(--radius-md) var(--radius-md) 0 0;margin-bottom:0;">
      <button class="tab-item active" data-tab="overview"    role="tab" aria-selected="true"  tabindex="0">Overview</button>
      <button class="tab-item"        data-tab="sections"    role="tab" aria-selected="false" tabindex="-1">Sections &amp; Content</button>
      <button class="tab-item"        data-tab="approval"    role="tab" aria-selected="false" tabindex="-1">Approval Status</button>
      <button class="tab-item"        data-tab="history"     role="tab" aria-selected="false" tabindex="-1">Revision History</button>
    </div>

    <!-- Tab Panels -->
    <div style="background:var(--color-surface);border-radius:0 0 var(--radius-md) var(--radius-md);box-shadow:var(--shadow-card);">

      <!-- Overview Tab -->
      <div class="tab-pane active" data-panel="overview" role="tabpanel">
        <div style="padding:var(--space-6);">
          <div class="detail-overview-grid">
            <!-- Metadata Card -->
            <div class="metadata-card">
              <div class="card-header" style="margin-bottom:var(--space-5);">
                <h2 class="card-title">SOP Information</h2>
              </div>
              <div class="metadata-grid">
                <div class="metadata-item">
                  <span class="metadata-label">Refinery</span>
                  <span class="metadata-value">${escapeHtml(sop.refinery)}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Department</span>
                  <span class="metadata-value">${escapeHtml(sop.department)}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Unit</span>
                  <span class="metadata-value mono">${escapeHtml(sop.unit)}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Version</span>
                  <span class="metadata-value">${escapeHtml(sop.version)}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Submitted By</span>
                  <span class="metadata-value">${escapeHtml(sop.submitted_by)}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Effective Date</span>
                  <span class="metadata-value">${escapeHtml(sop.effective_date || '—')}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Submission Date</span>
                  <span class="metadata-value">${escapeHtml(sop.date)}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Status</span>
                  <span class="metadata-value">${renderStatusPill(sop.status)}</span>
                </div>
              </div>
              ${sop.tags?.length ? `
                <div class="metadata-item" style="margin-top:var(--space-4);">
                  <span class="metadata-label">Tags</span>
                  <div class="tags-list">
                    ${sop.tags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Score Card -->
            <div class="score-card">
              <div class="card-header" style="margin-bottom:var(--space-4);">
                <h2 class="card-title">Numerical Scores</h2>
              </div>
              <div class="score-components-list">
                ${sop.sections.flatMap(s => s.components.map(c => `
                  <div class="score-component-row">
                    <span class="score-component-name">${escapeHtml(s.title)} — ${c.type}</span>
                    <span class="score-component-val">${c.weight ?? 0}</span>
                  </div>
                `)).join('')}
              </div>
              <div class="score-total-display">
                <div class="score-total-number">${totalScore}</div>
                <div class="score-total-label">Total Score (max ${maxScore})</div>
                <div class="score-bar-track" style="margin-top:var(--space-3);">
                  <div class="score-bar-fill" style="width:${scorePct}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sections Tab -->
      <div class="tab-pane" data-panel="sections" role="tabpanel">
        <div style="padding:var(--space-6);">
          ${sop.sections.map(section => `
            <div class="accordion-item" id="section-${section.id}">
              <div class="accordion-header" role="button" tabindex="0"
                aria-expanded="false" aria-controls="section-body-${section.id}"
                onclick="this.closest('.accordion-item').classList.toggle('open');this.setAttribute('aria-expanded',this.closest('.accordion-item').classList.contains('open'))">
                <h3 class="accordion-title">${escapeHtml(section.title)}</h3>
                <span class="accordion-chevron" aria-hidden="true">${icons.chevronDown.replace('width="20"','width="16"').replace('height="20"','height="16"')}</span>
              </div>
              <div class="accordion-body" id="section-body-${section.id}" role="region">
                <div class="accordion-content">
                  ${section.components.map(comp => `
                    <div class="detail-component" style="position:relative;margin-bottom:var(--space-5);">
                      <span class="component-value-badge" title="Weight: ${comp.weight}">${comp.weight ?? 0}</span>
                      <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">
                        <div style="padding:3px 10px;background:var(--color-bg);border-bottom:1px solid var(--color-border);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-secondary);">${comp.type}</div>
                        <div style="padding:var(--space-4);">
                          ${renderComponentView(comp)}
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Approval Status Tab -->
      <div class="tab-pane" data-panel="approval" role="tabpanel">
        <div style="padding:var(--space-6);">
          <div class="timeline" aria-label="Approval timeline">
            ${sop.approval_chain.map((step, i) => `
              <div class="timeline-item">
                <div class="timeline-dot ${step.status}" aria-label="${step.status}" role="img">
                  ${step.status === 'approved' ? icons.check.replace('width="20"','width="14"').replace('height="20"','height="14"').replace('stroke-width="1.75"','stroke-width="3"') :
                    step.status === 'rejected' ? icons.x.replace('width="20"','width="14"').replace('height="20"','height="14"') :
                    icons.clock.replace('width="20"','width="14"').replace('height="20"','height="14"')}
                </div>
                <div class="timeline-content">
                  <div class="timeline-role">${escapeHtml(step.role)}</div>
                  <div class="timeline-user">${escapeHtml(step.user)}</div>
                  ${step.timestamp ? `<div class="timeline-timestamp">${new Date(step.timestamp).toLocaleString('en-IN')}</div>` : '<div class="timeline-timestamp">Pending</div>'}
                  ${step.comment ? `<div class="timeline-comment">${escapeHtml(step.comment)}</div>` : ''}
                  ${step.status === 'pending' && i === sop.approval_chain.findIndex(s => s.status === 'pending') ? `
                    <div class="approval-actions-row">
                      <button class="btn btn-primary btn-sm" id="approve-btn-${i}" aria-label="Approve this step" type="button">
                        ${icons.check.replace('width="20"','width="14"').replace('height="20"','height="14"')} Approve
                      </button>
                      <button class="btn btn-danger btn-sm" id="reject-btn-${i}" aria-label="Reject this step" type="button">
                        ${icons.x.replace('width="20"','width="14"').replace('height="20"','height="14"')} Reject
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Revision History Tab -->
      <div class="tab-pane" data-panel="history" role="tabpanel">
        <div style="padding:var(--space-6);">
          <div style="overflow-x:auto;">
            <table class="revision-table sop-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Changed By</th>
                  <th>Date</th>
                  <th>Summary of Changes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${sop.revision_history.map(r => `
                  <tr>
                    <td><span style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(r.version)}</span></td>
                    <td>${escapeHtml(r.changed_by)}</td>
                    <td style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(r.date)}</td>
                    <td>${escapeHtml(r.summary)}</td>
                    <td><button class="btn btn-outline btn-sm" type="button">View</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div class="modal-overlay" id="reject-modal" role="dialog" aria-modal="true" aria-labelledby="reject-modal-title">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="reject-modal-title">Reject SOP</h2>
          <button class="modal-close" id="modal-close-btn" aria-label="Close modal" type="button">
            ${icons.x.replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
        </div>
        <div class="input-wrapper">
          <label class="input-label" for="reject-comment">Rejection Reason (required)</label>
          <textarea id="reject-comment" class="input-field" rows="4"
            placeholder="Provide a clear reason for rejection..."
            aria-required="true"></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel-btn" type="button">Cancel</button>
          <button class="btn btn-danger" id="modal-confirm-reject" type="button">
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  container.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = tab.dataset.tab;
      container.querySelectorAll('[data-tab]').forEach(t => {
        const isActive = t.dataset.tab === panel;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive);
        t.setAttribute('tabindex', isActive ? '0' : '-1');
      });
      container.querySelectorAll('[data-panel]').forEach(p => {
        p.classList.toggle('active', p.dataset.panel === panel);
      });
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') tab.click();
    });
  });

  // Edit button
  container.querySelector('#edit-btn')?.addEventListener('click', () => navigate('#new-sop'));

  // Download
  container.querySelector('#download-btn')?.addEventListener('click', () => {
    toast.info('PDF generation is handled by the backend.', 'API endpoint: /api/sops/' + sopId + '/pdf/');
  });

  // Approve/Reject buttons
  container.querySelectorAll('[id^="approve-btn-"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.innerHTML = '<span class="btn-spinner"></span>';
      btn.disabled = true;
      try {
        await api.approveSOP(sopId);
        toast.success('SOP approved!');
        setTimeout(() => renderSopDetail(container, sopId), 1000);
      } catch(e) {
        toast.error('Approval failed', e.message);
        btn.textContent = 'Approve';
        btn.disabled = false;
      }
    });
  });

  container.querySelectorAll('[id^="reject-btn-"]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelector('#reject-modal').classList.add('open');
      container.querySelector('#reject-comment')?.focus();
    });
  });

  const modal = container.querySelector('#reject-modal');
  const closeModal = () => modal.classList.remove('open');
  container.querySelector('#modal-close-btn')?.addEventListener('click', closeModal);
  container.querySelector('#modal-cancel-btn')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  container.querySelector('#modal-confirm-reject')?.addEventListener('click', async () => {
    const comment = container.querySelector('#reject-comment')?.value?.trim();
    if (!comment) {
      container.querySelector('#reject-comment')?.classList.add('input-error');
      container.querySelector('#reject-comment')?.focus();
      return;
    }
    try {
      await api.rejectSOP(sopId, comment);
      toast.warning('SOP has been rejected.');
      closeModal();
      setTimeout(() => renderSopDetail(container, sopId), 1000);
    } catch(e) {
      toast.error('Rejection failed', e.message);
    }
  });

  // Open first section in accordion
  const firstAccordion = container.querySelector('.accordion-item');
  if (firstAccordion) {
    firstAccordion.classList.add('open');
    firstAccordion.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'true');
  }
}

function renderComponentView(comp) {
  switch(comp.type) {
    case 'text':
      return `<div class="detail-component-text">${comp.content || '<em style="color:var(--color-text-secondary)">No content</em>'}</div>`;
    case 'chart':
    case 'image':
      return comp.src
        ? `<img src="${escapeHtml(comp.src)}" class="detail-component-img" alt="${escapeHtml(comp.altText||comp.chartTitle||'')}" />${comp.caption||comp.chartDesc ? `<p class="component-caption">${escapeHtml(comp.caption||comp.chartDesc)}</p>` : ''}`
        : `<div style="background:var(--color-bg);border-radius:var(--radius-sm);padding:32px;text-align:center;color:var(--color-text-secondary);">${icons.image.replace('width="20"','width="32"').replace('height="20"','height="32"')}<br/>No image uploaded</div>`;
    case 'table':
      if (!comp.rows || comp.rows.length === 0) return '<em style="color:var(--color-text-secondary)">No table data</em>';
      return `
        <table class="detail-table">
          <thead><tr>${comp.rows[0].map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${comp.rows.slice(1).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      `;
    default: return '';
  }
}

function renderStatusPill(status, large = false) {
  const map = {
    draft:    ['pill-draft',    'Draft'],
    review:   ['pill-review',   'Under Review'],
    approved: ['pill-approved', 'Approved'],
    rejected: ['pill-rejected', 'Rejected'],
  };
  const [cls, label] = map[status] || ['pill-draft', status];
  return `<span class="pill ${cls} ${large ? 'pill-lg' : ''}" role="status">${label}</span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
