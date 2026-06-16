/* ============================================================
   SOP Portal — Approval Chain Builder (Step 4)
   ============================================================ */

import { AppState } from '../state.js';
import { icons } from './icons.js';

let rowCounter = 0;

export function renderApprovalChain(container) {
  container.innerHTML = `
    <div class="card card-padded" style="margin-bottom:var(--space-6);">
      <div class="card-header">
        <h2 class="card-title">Approval Chain</h2>
      </div>
      <p style="font-size:14px;color:var(--color-text-secondary);margin-bottom:var(--space-4);">
        Assign approvers based on role. SOPs require sign-off from all assigned approvers in sequence.
      </p>

      <div id="approver-list">
        ${AppState.sopDraft.approvalChain.length
          ? AppState.sopDraft.approvalChain.map((a, i) => renderApproverRow(a, i)).join('')
          : ''}
      </div>

      <button class="btn btn-dashed" id="add-approver-btn" type="button"
        style="width:100%;margin-top:var(--space-3);" aria-label="Add approver">
        ${icons.plus.replace('width="20"','width="14"').replace('height="20"','height="14"')}
        Add Approver
      </button>

      <div class="info-box" style="margin-top:var(--space-4);">
        ${icons.info.replace('width="20"','width="14"').replace('height="20"','height="14"')}
        <strong>Sequential approval:</strong> each approver is notified only after the previous one approves.
        <strong>Parallel:</strong> all approvers notified simultaneously.
      </div>
    </div>
  `;

  container.querySelector('#add-approver-btn')?.addEventListener('click', () => {
    addApproverRow(container);
  });

  // If no rows yet, add one default
  if (AppState.sopDraft.approvalChain.length === 0) {
    addApproverRow(container);
  }

  initApproverDrag(container);
}

function renderApproverRow(approver, index) {
  rowCounter++;
  const rowId = `approver-row-${rowCounter}`;
  const users = [
    { name: 'Rajesh Kumar', email: 'r.kumar@hpcl.in' },
    { name: 'Priya Sharma', email: 'p.sharma@hpcl.in' },
    { name: 'Venkat Rao', email: 'v.rao@hpcl.in' },
    { name: 'Arjun Patel', email: 'a.patel@hpcl.in' },
    { name: 'Gurpreet Singh', email: 'g.singh@hpcl.in' },
  ];

  return `
    <div class="approver-row" id="${rowId}" draggable="true" data-approver-row>
      <div class="approver-step-num" aria-label="Approver step ${index + 1}">${index + 1}</div>
      <div class="approver-fields">
        <div class="input-wrapper">
          <label class="input-label">Role</label>
          <select class="select-field" data-approver-role aria-label="Approver role">
            <option value="">Select role...</option>
            ${AppState.roles.map(r => `<option value="${r}" ${approver?.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="input-wrapper">
          <label class="input-label">Assigned User</label>
          <select class="select-field" data-approver-user aria-label="Assigned user">
            <option value="">Select user...</option>
            ${users.map(u => `<option value="${u.name}" ${approver?.user === u.name ? 'selected' : ''}>${u.name} — ${u.email}</option>`).join('')}
          </select>
        </div>
        <div class="input-wrapper">
          <label class="input-label">Type</label>
          <div class="toggle-group" role="group" aria-label="Approval type">
            <button class="toggle-option ${!approver?.type || approver?.type === 'sequential' ? 'active' : ''}"
              data-type="sequential" type="button">Sequential</button>
            <button class="toggle-option ${approver?.type === 'parallel' ? 'active' : ''}"
              data-type="parallel" type="button">Parallel</button>
          </div>
        </div>
      </div>
      <button class="btn btn-ghost btn-icon" data-remove-approver aria-label="Remove approver" type="button"
        style="color:var(--color-text-secondary);flex-shrink:0;">
        ${icons.trash.replace('width="20"','width="16"').replace('height="20"','height="16"')}
      </button>
    </div>
  `;
}

function addApproverRow(container) {
  const list = container.querySelector('#approver-list');
  if (!list) return;

  const index = list.querySelectorAll('[data-approver-row]').length;
  const approver = { role: '', user: '', type: 'sequential' };
  AppState.sopDraft.approvalChain.push(approver);

  const div = document.createElement('div');
  div.innerHTML = renderApproverRow(approver, index);
  const row = div.firstElementChild;
  list.appendChild(row);

  // Bind events for the new row
  bindRowEvents(row, approver, container);
  updateStepNumbers(container);
  initApproverDrag(container);
}

function bindRowEvents(row, approver, container) {
  row.querySelector('[data-approver-role]')?.addEventListener('change', (e) => {
    approver.role = e.target.value;
  });
  row.querySelector('[data-approver-user]')?.addEventListener('change', (e) => {
    approver.user = e.target.value;
  });
  row.querySelectorAll('.toggle-option').forEach(btn => {
    btn.addEventListener('click', () => {
      row.querySelectorAll('.toggle-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      approver.type = btn.dataset.type;
    });
  });
  row.querySelector('[data-remove-approver]')?.addEventListener('click', () => {
    const idx = AppState.sopDraft.approvalChain.indexOf(approver);
    if (idx !== -1) AppState.sopDraft.approvalChain.splice(idx, 1);
    row.remove();
    updateStepNumbers(container);
  });
}

function updateStepNumbers(container) {
  container.querySelectorAll('[data-approver-row] .approver-step-num').forEach((el, i) => {
    el.textContent = i + 1;
    el.setAttribute('aria-label', `Approver step ${i + 1}`);
  });
}

let dragSrc = null;

function initApproverDrag(container) {
  container.querySelectorAll('[data-approver-row]').forEach(row => {
    row.addEventListener('dragstart', () => { dragSrc = row; row.style.opacity = '0.6'; });
    row.addEventListener('dragend',   () => { dragSrc = null; row.style.opacity = ''; });
    row.addEventListener('dragover',  (e) => { e.preventDefault(); row.style.borderColor = 'var(--color-primary)'; });
    row.addEventListener('dragleave', () => { row.style.borderColor = ''; });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.style.borderColor = '';
      if (dragSrc && dragSrc !== row) {
        const parent = row.parentNode;
        const allRows = [...parent.querySelectorAll('[data-approver-row]')];
        const srcIdx = allRows.indexOf(dragSrc);
        const dstIdx = allRows.indexOf(row);
        if (srcIdx < dstIdx) parent.insertBefore(dragSrc, row.nextSibling);
        else parent.insertBefore(dragSrc, row);
        // Re-sync approval chain order
        const newOrder = [...parent.querySelectorAll('[data-approver-row]')].map(() => null);
        updateStepNumbers(container);
      }
    });
  });
}
