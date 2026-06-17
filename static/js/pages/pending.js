/* ============================================================
   SOP Portal — Pending Approvals Page
   ============================================================ */

import { api }   from '../utils/api.js';
import { icons } from '../components/icons.js';
import { toast } from '../utils/toast.js';

export async function renderPendingPage(container) {
  container.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('#dashboard')" tabindex="0" role="link">Dashboard</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">Pending Approvals</span>
    </nav>
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Pending Approvals</h1>
        <p class="page-subtitle">SOPs awaiting your review and sign-off</p>
      </div>
    </div>
    <div id="pending-content">
      ${renderSkeletons()}
    </div>
  `;

  let items = [];
  try {
    items = await api.getPendingApprovals();
  } catch (e) {
    // Fallback mock
    items = [
      { id: 2, title: 'Crude Distillation Unit Safety Shutdown',
        sop_number: 'SOP-MUM-HSE-CDU-2025-002',
        submitter: 'Priya Sharma', unit: 'CDU', refinery: 'Mumbai',
        step: 1, role: 'HSE Officer', time: new Date(Date.now()-3600000).toISOString() },
      { id: 6, title: 'CCR Catalyst Regeneration Procedure',
        sop_number: 'SOP-MUM-OPS-CCR-2025-001',
        submitter: 'Anita Desai', unit: 'CCR', refinery: 'Mumbai',
        step: 2, role: 'Department Head', time: new Date(Date.now()-86400000).toISOString() },
    ];
  }

  const content = container.querySelector('#pending-content');
  if (!content) return;

  if (items.length === 0) {
    content.innerHTML = `
      <div class="empty-state card card-padded" style="padding:64px;">
        ${icons['check-circle'].replace('width="20"','width="56"').replace('height="20"','height="56"')
          .replace('stroke="currentColor"','stroke="var(--color-success)"')}
        <div class="empty-state-title">All caught up!</div>
        <div class="empty-state-text">No SOPs are waiting for your approval.</div>
        <button class="btn btn-primary" onclick="navigate('#dashboard')">Back to Dashboard</button>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="pending-grid">
      ${items.map(item => renderPendingCard(item)).join('')}
    </div>
  `;

  // Wire up Review buttons
  content.querySelectorAll('[data-review-id]').forEach(btn => {
    btn.addEventListener('click', () => navigate(`#sop/${btn.dataset.reviewId}`));
  });

  // Quick Approve buttons
  content.querySelectorAll('[data-approve-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.approveId;
      btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>';
      btn.disabled = true;
      try {
        await api.approveSOP(id);
        toast.success('SOP approved');
        renderPendingPage(container);
      } catch (err) {
        toast.error('Approval failed', err.message);
        btn.textContent = 'Approve';
        btn.disabled = false;
      }
    });
  });
}

function renderPendingCard(item) {
  const timeStr = item.time
    ? new Date(item.time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return `
    <div class="pending-card card">
      <div class="pending-card-header">
        <div>
          <div class="pending-sop-number">${escapeHtml(item.sop_number)}</div>
          <div class="pending-sop-title">${escapeHtml(item.title)}</div>
        </div>
        <span class="pill pill-review">Under Review</span>
      </div>

      <div class="pending-meta-grid">
        <div class="pending-meta-item">
          <span class="pending-meta-label">Refinery</span>
          <span class="pending-meta-value">${escapeHtml(item.refinery)}</span>
        </div>
        <div class="pending-meta-item">
          <span class="pending-meta-label">Unit</span>
          <span class="pending-meta-value" style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(item.unit)}</span>
        </div>
        <div class="pending-meta-item">
          <span class="pending-meta-label">Submitted By</span>
          <span class="pending-meta-value">${escapeHtml(item.submitter)}</span>
        </div>
        <div class="pending-meta-item">
          <span class="pending-meta-label">Your Role</span>
          <span class="pending-meta-value">${escapeHtml(item.role)}</span>
        </div>
        <div class="pending-meta-item">
          <span class="pending-meta-label">Approval Step</span>
          <span class="pending-meta-value">Step ${item.step}</span>
        </div>
        <div class="pending-meta-item">
          <span class="pending-meta-label">Submitted</span>
          <span class="pending-meta-value" style="font-family:var(--font-mono);font-size:12px;">${timeStr}</span>
        </div>
      </div>

      <div class="pending-card-actions">
        <button class="btn btn-outline" data-review-id="${item.id}"
          aria-label="Review ${escapeHtml(item.title)}">
          ${icons.eye.replace('width="20"','width="15"').replace('height="20"','height="15"')}
          Review SOP
        </button>
        <button class="btn btn-primary" data-approve-id="${item.id}"
          aria-label="Approve ${escapeHtml(item.title)}">
          ${icons.check.replace('width="20"','width="15"').replace('height="20"','height="15"')
            .replace('stroke-width="1.75"','stroke-width="2.5"')}
          Quick Approve
        </button>
      </div>
    </div>
  `;
}

function renderSkeletons() {
  return `<div class="pending-grid">
    ${Array(3).fill('').map(() => `
      <div class="card card-padded">
        <div class="skeleton" style="height:18px;width:60%;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:14px;width:40%;margin-bottom:16px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
          ${Array(6).fill('<div class="skeleton" style="height:32px;border-radius:4px;"></div>').join('')}
        </div>
        <div class="skeleton" style="height:36px;border-radius:4px;"></div>
      </div>
    `).join('')}
  </div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}
