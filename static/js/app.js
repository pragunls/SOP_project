/* ============================================================
   SOP Portal — Main App Entry Point & Router
   ============================================================ */

// ── Company Logo — replace path with your actual logo ──
const COMPANY_LOGO = '/static/assets/Hindustan_Petroleum_Logo.svg';

import { AppState }       from './state.js';
import { initSidebar }    from './components/sidebar.js';
import { icons }          from './components/icons.js';
import { renderDashboard }  from './pages/dashboard.js';
import { renderNewSop }     from './pages/new-sop.js';
import { renderSopDetail }  from './pages/sop-detail.js';
import { renderPendingPage } from './pages/pending.js';
import { toast }           from './utils/toast.js';
import { api }             from './utils/api.js';

// ── Notification state ──
let notifData = { notifications: [], unread_count: 0 };

// ── Shell Init ──
function initShell() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const u = AppState.currentUser;

  navbar.innerHTML = `
    <div class="navbar-brand">
      <button class="hamburger-btn" id="hamburger-btn" aria-label="Open navigation" aria-expanded="false">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <img class="navbar-logo" src="${COMPANY_LOGO}" alt="HPCL Logo"
        style="height:36px;display:none;"
        onload="this.style.display='block';this.nextElementSibling.style.display='none';"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      />
      <div class="navbar-logo-fallback" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
          stroke-linecap="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </div>
      <span class="navbar-title">SOP</span>
    </div>

    <div class="navbar-right">
      <!-- Notification Bell -->
      <button class="navbar-icon-btn" id="notif-btn"
        aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
        <span class="notification-badge" id="notif-badge" style="display:none;"
          role="status" aria-live="polite"></span>
        ${icons.bell}
      </button>

      <!-- User chip -->
      <div class="user-chip" role="button" tabindex="0"
        aria-label="${u.name} — ${u.role}" title="${u.name}">
        <div class="user-avatar" aria-hidden="true">${u.initials}</div>
        <span class="user-name">${u.name}</span>
        <span class="role-badge">${u.role}</span>
      </div>
    </div>

    <!-- Notification Dropdown Panel -->
    <div class="notif-panel" id="notif-panel" role="dialog"
      aria-label="Notifications" aria-hidden="true">
      <div class="notif-panel-header">
        <span class="notif-panel-title">Notifications</span>
        <button class="btn btn-ghost btn-sm" id="notif-mark-all" type="button"
          style="font-size:12px;padding:4px 8px;">Mark all read</button>
      </div>
      <div class="notif-panel-body" id="notif-list">
        <div style="padding:32px;text-align:center;color:var(--color-text-secondary);font-size:13px;">
          Loading…
        </div>
      </div>
    </div>
  `;

  initSidebar();
  initNotifications();
}

// ── Notification Bell ──
async function initNotifications() {
  const btn   = document.getElementById('notif-btn');
  const panel = document.getElementById('notif-panel');
  const badge = document.getElementById('notif-badge');

  if (!btn || !panel) return;

  // Toggle panel
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
    panel.setAttribute('aria-hidden', !isOpen);
    if (isOpen) loadNotifications();
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  // Mark all read
  document.getElementById('notif-mark-all')?.addEventListener('click', async () => {
    await api.markAllNotificationsRead().catch(() => {});
    loadNotifications();
  });

  // Initial load + badge
  await loadNotifications();
}

async function loadNotifications() {
  try {
    notifData = await api.getNotifications();
  } catch {
    // Fallback mock when DB is empty
    notifData = {
      notifications: [
        { id: 1, type: 'approval_request', title: 'Approval required: SOP-MUM-HSE-CDU-2025-002',
          message: 'Priya Sharma submitted "CDU Safety Shutdown" for your approval.',
          sop_id: 2, sop_number: 'SOP-MUM-HSE-CDU-2025-002', is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 2, type: 'draft_reminder', title: 'Draft reminder: FCC Regenerator SOP',
          message: 'Your draft SOP has not been submitted for 3 days.',
          sop_id: 3, sop_number: 'SOP-VIZ-OPS-FCC-2025-001', is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString() },
      ],
      unread_count: 1,
    };
  }

  const badge = document.getElementById('notif-badge');
  if (badge) {
    const count = notifData.unread_count;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = 'flex';
      badge.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        position:absolute;top:-4px;right:-4px;
        min-width:18px;height:18px;padding:0 4px;
        background:var(--color-accent);color:#fff;
        border-radius:var(--radius-pill);font-size:10px;font-weight:700;
        border:2px solid var(--color-primary);
      `;
    } else {
      badge.style.display = 'none';
    }
  }

  renderNotifList(notifData.notifications);
}

function renderNotifList(notifications) {
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (!notifications.length) {
    list.innerHTML = `
      <div class="notif-empty">
        ${icons.bell.replace('width="20"','width="32"').replace('height="20"','height="32"')}
        <div style="font-size:13px;font-weight:500;margin-top:8px;">No notifications</div>
        <div style="font-size:12px;color:var(--color-text-secondary);">You're all caught up!</div>
      </div>
    `;
    return;
  }

  const typeIcon = {
    approval_request: icons.clock,
    approved:         icons['check-circle'],
    rejected:         icons['x-circle'],
    draft_reminder:   icons['file-text'],
    info:             icons.info,
  };

  const typeColor = {
    approval_request: 'var(--color-warning)',
    approved:         'var(--color-success)',
    rejected:         'var(--color-danger)',
    draft_reminder:   'var(--color-primary)',
    info:             'var(--color-primary)',
  };

  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}"
      role="button" tabindex="0"
      onclick="handleNotifClick(${n.id}, ${n.sop_id || 'null'})">
      <div class="notif-icon" style="color:${typeColor[n.type] || 'var(--color-primary)'}">
        ${(typeIcon[n.type] || icons.info).replace('width="20"','width="16"').replace('height="20"','height="16"')}
      </div>
      <div class="notif-body">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        ${n.message ? `<div class="notif-msg">${escapeHtml(n.message)}</div>` : ''}
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
      ${!n.is_read ? '<div class="notif-dot" aria-label="Unread"></div>' : ''}
    </div>
  `).join('');
}

window.handleNotifClick = async function(notifId, sopId) {
  // Mark as read
  await api.markNotificationRead(notifId).catch(() => {});
  // Close panel
  document.getElementById('notif-panel')?.classList.remove('open');
  // Navigate
  if (sopId) navigate(`#sop/${sopId}`);
  else loadNotifications();
};

// ── Router ──
const routes = {
  '#dashboard': () => loadPage(renderDashboard),
  '#new-sop':   () => loadPage(renderNewSop),
  '#my-sops':   () => loadPage(renderMySOPs),
  '#pending':   () => loadPage(renderPendingPage),
  '#admin':     () => loadPage(renderAdmin),
  '#settings':  () => loadPage(renderSettings),
};

async function loadPage(renderFn) {
  const main = document.getElementById('page-content');
  if (!main) return;
  main.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0;" aria-busy="true">
      <div class="skeleton" style="height:28px;width:220px;border-radius:4px;"></div>
      <div class="skeleton" style="height:16px;width:340px;border-radius:4px;"></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:8px;">
        ${Array(4).fill('<div class="skeleton" style="height:90px;border-radius:6px;"></div>').join('')}
      </div>
      <div class="skeleton" style="height:300px;border-radius:6px;margin-top:8px;"></div>
    </div>
  `;
  try {
    await renderFn(main);
  } catch (e) {
    console.error('Page render error:', e);
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icons['alert-circle'].replace('width="20"','width="48"').replace('height="20"','height="48"')}</div>
        <div class="empty-state-title">Something went wrong</div>
        <div class="empty-state-text">${escapeHtml(e.message)}</div>
        <button class="btn btn-primary" onclick="navigate('#dashboard')">Back to Dashboard</button>
      </div>
    `;
  }
}

function handleRoute() {
  const hash = window.location.hash || '#dashboard';
  if (hash.startsWith('#sop/')) {
    const id = hash.split('/')[1];
    loadPage((c) => renderSopDetail(c, id));
    return;
  }
  const handler = routes[hash];
  if (handler) handler();
  else navigate('#dashboard');
}

// ── Stub pages ──
function renderMySOPs(container) {
  container.innerHTML = stubPage('My SOPs', 'Your submitted and drafted SOPs will appear here.', '#new-sop', 'Create New SOP');
}
function renderAdmin(container) {
  container.innerHTML = stubPage('Admin', 'User management, refinery configuration, and system settings.', '#settings', 'Go to Settings');
}
function renderSettings(container) {
  container.innerHTML = stubPage('Settings', 'Manage your account preferences and notifications.', '#dashboard', 'Back to Dashboard');
}

function stubPage(title, text, ctaHash, ctaLabel) {
  return `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('#dashboard')" tabindex="0" role="link">Dashboard</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">${title}</span>
    </nav>
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">${title}</h1>
        <p class="page-subtitle">${text}</p>
      </div>
    </div>
    <div class="empty-state" style="background:var(--color-surface);border-radius:var(--radius-md);
      box-shadow:var(--shadow-card);padding:64px;">
      ${icons['file-doc'].replace('width="24"','width="64"').replace('height="24"','height="64"')
        .replace('stroke="currentColor"','stroke="var(--color-border)"')}
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-text">${text}</div>
      <button class="btn btn-primary" onclick="navigate('${ctaHash}')">${ctaLabel}</button>
    </div>
  `;
}

// ── Helpers ──
window.navigate = (hash) => { window.location.hash = hash; };

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

// ── Bootstrap ──
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
});
