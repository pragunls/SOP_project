/* SOP Portal — Admin / User Management Page */

import { api }      from '../utils/api.js';
import { AppState } from '../state.js';
import { icons }    from '../components/icons.js';
import { toast }    from '../utils/toast.js';

let allUsers = [];

export async function renderAdminPage(container) {
  const role = AppState.currentUser.role;
  if (!['admin','manager'].includes(role)) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Access Denied</div>
      <div class="empty-state-text">You don't have permission to view this page.</div></div>`;
    return;
  }

  container.innerHTML = `
    <nav class="breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('#dashboard')" tabindex="0" role="link">Dashboard</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">User Management</span>
    </nav>
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">User Management</h1>
        <p class="page-subtitle">${role === 'admin' ? 'Manage all managers and users' : 'Manage users in your team'}</p>
      </div>
      <button class="btn btn-danger" id="add-user-btn">
        ${icons.plus.replace('width="20"','width="16"').replace('height="20"','height="16"')} Add User
      </button>
    </div>

    <div class="table-card" id="users-table-card">
      <div style="overflow-x:auto;">
        <table class="sop-table" id="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Refinery</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            ${skeletonRows(4, 7)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit User Modal -->
    <div class="modal-overlay" id="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
      <div class="modal-panel" style="max-width:520px;">
        <div class="modal-header">
          <h2 class="modal-title" id="user-modal-title">Add User</h2>
          <button class="modal-close" id="modal-close-btn" type="button" aria-label="Close">
            ${icons.x.replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
        </div>
        <form id="user-form">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
            <div class="input-wrapper">
              <label class="input-label" for="uf-first">First Name *</label>
              <input type="text" id="uf-first" class="input-field" required />
            </div>
            <div class="input-wrapper">
              <label class="input-label" for="uf-last">Last Name *</label>
              <input type="text" id="uf-last" class="input-field" required />
            </div>
          </div>
          <div class="input-wrapper" style="margin-top:var(--space-3);">
            <label class="input-label" for="uf-username">Username *</label>
            <input type="text" id="uf-username" class="input-field" required autocapitalize="none" />
          </div>
          <div class="input-wrapper" style="margin-top:var(--space-3);">
            <label class="input-label" for="uf-email">Email</label>
            <input type="email" id="uf-email" class="input-field" />
          </div>
          <div class="input-wrapper" style="margin-top:var(--space-3);" id="pw-wrapper">
            <label class="input-label" for="uf-password">Password *</label>
            <input type="password" id="uf-password" class="input-field" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);margin-top:var(--space-3);">
            <div class="input-wrapper">
              <label class="input-label" for="uf-role">Role *</label>
              <select id="uf-role" class="select-field">
                ${role === 'admin' ? '<option value="manager">Manager</option>' : ''}
                <option value="user">User</option>
              </select>
            </div>
            <div class="input-wrapper">
              <label class="input-label" for="uf-dept">Department</label>
              <select id="uf-dept" class="select-field">
                <option value="">— None —</option>
                ${AppState.departments.map(d => `<option value="${d.code}">${d.name}</option>`).join('')}
              </select>
            </div>
            <div class="input-wrapper">
              <label class="input-label" for="uf-ref">Refinery</label>
              <select id="uf-ref" class="select-field">
                <option value="">— None —</option>
                ${AppState.refineries.map(r => `<option value="${r.code}">${r.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="user-form-error" class="login-error" style="display:none;margin-top:12px;"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-danger" id="user-save-btn">Save User</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div class="modal-overlay" id="del-modal" role="dialog" aria-modal="true">
      <div class="modal-panel" style="max-width:420px;">
        <div class="modal-header">
          <h2 class="modal-title">Delete User</h2>
          <button class="modal-close" id="del-close-btn" type="button">
            ${icons.x.replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
        </div>
        <p style="font-size:14px;color:var(--color-text-secondary);" id="del-msg">
          Are you sure you want to delete this user? This cannot be undone.
        </p>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="del-cancel-btn">Cancel</button>
          <button type="button" class="btn btn-danger" id="del-confirm-btn">Delete</button>
        </div>
      </div>
    </div>
  `;

  await loadUsers(container);
  bindEvents(container, role);
}

async function loadUsers(container) {
  try {
    allUsers = await api.getUsers();
  } catch (e) {
    allUsers = [];
    toast.error('Failed to load users', e.message);
  }
  renderTable(container);
}

function renderTable(container) {
  const tbody = container.querySelector('#users-tbody');
  if (!tbody) return;
  if (!allUsers.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--color-text-secondary);">No users found.</td></tr>`;
    return;
  }
  const roleColors = { admin:'var(--color-accent)', manager:'var(--color-primary)', user:'var(--color-success)' };
  tbody.innerHTML = allUsers.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="user-avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0;">${esc(u.initials)}</div>
          <span>${esc(u.name)}</span>
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:12px;">${esc(u.username)}</td>
      <td style="font-size:13px;">${esc(u.email||'—')}</td>
      <td>
        <span class="pill" style="background:${roleColors[u.role]||'#eee'}20;color:${roleColors[u.role]||'var(--color-text-secondary)'};">
          ${esc(u.role)}
        </span>
      </td>
      <td style="font-size:13px;">${esc(u.department||'—')}</td>
      <td style="font-size:13px;">${esc(u.refinery||'—')}</td>
      <td>
        <div class="actions-cell">
          <button class="action-btn" data-edit-id="${u.id}" aria-label="Edit user" title="Edit">
            ${icons.pencil.replace('width="20"','width="15"').replace('height="20"','height="15"')}
          </button>
          ${u.id !== AppState.currentUser.id ? `
            <button class="action-btn danger" data-del-id="${u.id}" data-del-name="${esc(u.name)}"
              aria-label="Delete user" title="Delete">
              ${icons.trash.replace('width="20"','width="15"').replace('height="20"','height="15"')}
            </button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function bindEvents(container, role) {
  let editingId = null;

  const modal       = container.querySelector('#user-modal');
  const form        = container.querySelector('#user-form');
  const titleEl     = container.querySelector('#user-modal-title');
  const errEl       = container.querySelector('#user-form-error');
  const saveBtn     = container.querySelector('#user-save-btn');
  const pwWrapper   = container.querySelector('#pw-wrapper');

  const openModal   = (title, editId = null) => {
    editingId = editId;
    titleEl.textContent = title;
    errEl.style.display = 'none';
    pwWrapper.querySelector('label').textContent = editId ? 'New Password (leave blank to keep)' : 'Password *';
    modal.classList.add('open');
    container.querySelector('#uf-first').focus();
  };
  const closeModal  = () => { modal.classList.remove('open'); form.reset(); editingId = null; };

  container.querySelector('#add-user-btn').addEventListener('click', () => openModal('Add User'));
  container.querySelector('#modal-close-btn').addEventListener('click', closeModal);
  container.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Edit / Delete via table delegation
  container.querySelector('#users-tbody').addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit-id]');
    const delBtn  = e.target.closest('[data-del-id]');

    if (editBtn) {
      const uid = Number(editBtn.dataset.editId);
      const u   = allUsers.find(x => x.id === uid);
      if (!u) return;
      container.querySelector('#uf-first').value    = u.first_name || '';
      container.querySelector('#uf-last').value     = u.last_name  || '';
      container.querySelector('#uf-username').value = u.username;
      container.querySelector('#uf-email').value    = u.email || '';
      container.querySelector('#uf-role').value     = u.role;
      container.querySelector('#uf-dept').value     = u.department_code || '';
      container.querySelector('#uf-ref').value      = u.refinery_code   || '';
      container.querySelector('#uf-password').value = '';
      openModal('Edit User', uid);
    }

    if (delBtn) {
      const uid  = Number(delBtn.dataset.delId);
      const name = delBtn.dataset.delName;
      container.querySelector('#del-msg').textContent = `Delete "${name}"? This cannot be undone.`;
      const delModal = container.querySelector('#del-modal');
      delModal.classList.add('open');
      container.querySelector('#del-confirm-btn').onclick = async () => {
        try {
          await api.deleteUser(uid);
          toast.success('User deleted');
          delModal.classList.remove('open');
          await loadUsers(container);
        } catch (err) {
          toast.error('Delete failed', err.message);
        }
      };
    }
  });

  container.querySelector('#del-close-btn').addEventListener('click', () => container.querySelector('#del-modal').classList.remove('open'));
  container.querySelector('#del-cancel-btn').addEventListener('click', () => container.querySelector('#del-modal').classList.remove('open'));

  // Form submit
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.style.display = 'none';

    const data = {
      first_name:  container.querySelector('#uf-first').value.trim(),
      last_name:   container.querySelector('#uf-last').value.trim(),
      username:    container.querySelector('#uf-username').value.trim(),
      email:       container.querySelector('#uf-email').value.trim(),
      role:        container.querySelector('#uf-role').value,
      department:  container.querySelector('#uf-dept').value,
      refinery:    container.querySelector('#uf-ref').value,
    };
    const pw = container.querySelector('#uf-password').value.trim();
    if (pw) data.password = pw;

    if (!data.first_name || !data.username) {
      errEl.textContent = 'First name and username are required.';
      errEl.style.display = 'block'; return;
    }
    if (!editingId && !pw) {
      errEl.textContent = 'Password is required for new users.';
      errEl.style.display = 'block'; return;
    }

    saveBtn.innerHTML = '<span class="btn-spinner"></span>';
    saveBtn.disabled  = true;
    try {
      if (editingId) {
        await api.updateUser(editingId, data);
        toast.success('User updated');
      } else {
        await api.createUser(data);
        toast.success('User created');
      }
      closeModal();
      await loadUsers(container);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      saveBtn.innerHTML = 'Save User';
      saveBtn.disabled  = false;
    }
  });
}

function skeletonRows(rows, cols) {
  return Array(rows).fill('').map(() =>
    `<tr>${Array(cols).fill('').map(() =>
      `<td><div class="skeleton skeleton-text" style="width:${40+Math.random()*40}%"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str||'');
  return d.innerHTML;
}
