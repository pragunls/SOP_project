/* SOP Portal — Main App Entry Point */

const COMPANY_LOGO = '/static/assets/Hindustan_Petroleum_Logo.svg';

import { AppState }          from './state.js';
import { initSidebar }       from './components/sidebar.js';
import { icons }             from './components/icons.js';
import { renderLogin }       from './pages/login.js';
import { renderDashboard }   from './pages/dashboard.js';
import { renderNewSop }      from './pages/new-sop.js';
import { renderSopDetail }   from './pages/sop-detail.js';
import { renderPendingPage } from './pages/pending.js';
import { renderMySOPs }      from './pages/my-sops.js';
import { renderAdminPage }   from './pages/admin.js';
import { toast }             from './utils/toast.js';
import { api }               from './utils/api.js';

let notifData = { notifications: [], unread_count: 0 };

/* ── Auth bootstrap ─────────────────────────────────────────── */
async function initAuth() {
  try {
    const user = await api.getMe();
    setCurrentUser(user);
    bootApp();
  } catch {
    showLoginPage();
  }
}

function setCurrentUser(data) {
  AppState.currentUser = {
    id:       data.id,
    name:     data.name,
    initials: data.initials,
    role:     data.role,
    email:    data.email,
    username: data.username,
  };
}

function showLoginPage() {
  document.title = 'SOP Login';
  const root = document.getElementById('app-root');
  if (root) root.innerHTML = '';
  renderLogin();
  window.addEventListener('auth:login', e => {
    setCurrentUser(e.detail);
    bootApp();
  }, { once: true });
}

/* ── Boot full app shell ─────────────────────────────────────── */
function bootApp() {
  document.title = 'SOP Portal — HPCL';
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <header id="navbar" class="navbar" role="banner"></header>
    <div id="sidebar-overlay" class="sidebar-overlay" role="presentation" aria-hidden="true"></div>
    <aside id="sidebar" class="sidebar" role="navigation" aria-label="Site navigation">
      <button id="sidebar-toggle" class="sidebar-toggle"
        aria-label="Collapse sidebar" title="Collapse sidebar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <nav class="sidebar-nav" role="list" aria-label="Main menu">
        <div class="sidebar-section-label" aria-hidden="true">Navigation</div>
      </nav>
      <div class="sidebar-user" aria-label="Current user"></div>
    </aside>
    <main id="main-content" class="main-content" role="main" aria-label="Page content">
      <div id="page-content"></div>
    </main>
  `;
  initShell();
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

/* ── Shell (navbar + sidebar) ───────────────────────────────── */
function initShell() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const u = AppState.currentUser;

  navbar.innerHTML = `
    <div class="navbar-brand">
      <button class="hamburger-btn" id="hamburger-btn"
        aria-label="Open navigation" aria-expanded="false">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <img class="navbar-logo" src="${COMPANY_LOGO}" alt="HPCL Logo"
        style="height:36px;display:none;"
        onload="this.style.display='block';this.nextElementSibling.style.display='none';"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="navbar-logo-fallback" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
          stroke-width="2" stroke-linecap="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </div>
      <span class="navbar-title">SOP</span>
    </div>

    <div class="navbar-right">
      <button class="navbar-icon-btn" id="notif-btn"
        aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
        <span class="notification-badge" id="notif-badge"
          style="display:none;" role="status"></span>
        ${icons.bell}
      </button>
      <div class="user-chip" role="button" tabindex="0"
        aria-label="${u.name} — ${u.role}" title="${u.name}">
        <div class="user-avatar" aria-hidden="true">${u.initials}</div>
        <span class="user-name">${u.name}</span>
        <span class="role-badge">${u.role}</span>
      </div>
      <button class="navbar-icon-btn" id="logout-btn"
        aria-label="Sign out" title="Sign out" style="margin-left:4px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>

    <div class="notif-panel" id="notif-panel"
      role="dialog" aria-label="Notifications" aria-hidden="true">
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

  /* Logout — clear session then reload to show login */
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try { await api.logout(); } catch { /* ignore */ }
    AppState.currentUser = { id: null, name: '', initials: '', role: 'user', email: '', username: '' };
    showLoginPage();
  });

  initSidebar();
  initNotifications();
}

/* ── Notifications ───────────────────────────────────────────── */
async function initNotifications() {
  const btn   = document.getElementById('notif-btn');
  const panel = document.getElementById('notif-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
    panel.setAttribute('aria-hidden', !isOpen);
    if (isOpen) loadNotifications();
  });

  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  document.getElementById('notif-mark-all')?.addEventListener('click', async () => {
    await api.markAllNotificationsRead().catch(() => {});
    loadNotifications();
  });

  await loadNotifications();
}

async function loadNotifications() {
  try {
    notifData = await api.getNotifications();
  } catch {
    notifData = { notifications: [], unread_count: 0 };
  }
  const badge = document.getElementById('notif-badge');
  if (badge) {
    const count = notifData.unread_count;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        position:absolute;top:-4px;right:-4px;
        min-width:18px;height:18px;padding:0 4px;
        background:var(--color-accent);color:#fff;
        border-radius:var(--radius-pill);font-size:10px;font-weight:700;
        border:2px solid var(--color-primary);`;
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
      </div>`;
    return;
  }
  const typeColor = {
    approval_request: 'var(--color-warning)',
    approved:         'var(--color-success)',
    rejected:         'var(--color-danger)',
    draft_reminder:   'var(--color-primary)',
    info:             'var(--color-primary)',
  };
  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}"
      role="button" tabindex="0"
      onclick="handleNotifClick(${n.id}, ${n.sop_id || 'null'})">
      <div class="notif-icon" style="color:${typeColor[n.type]||'var(--color-primary)'}">
        ${icons.bell.replace('width="20"','width="16"').replace('height="20"','height="16"')}
      </div>
      <div class="notif-body">
        <div class="notif-title">${esc(n.title)}</div>
        ${n.message ? `<div class="notif-msg">${esc(n.message)}</div>` : ''}
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
      ${!n.is_read ? '<div class="notif-dot"></div>' : ''}
    </div>`).join('');
}

window.handleNotifClick = async (notifId, sopId) => {
  await api.markNotificationRead(notifId).catch(() => {});
  document.getElementById('notif-panel')?.classList.remove('open');
  if (sopId) navigate(`#sop/${sopId}`);
  else loadNotifications();
};

/* ── Router ─────────────────────────────────────────────────── */
const routes = {
  '#dashboard': () => loadPage(renderDashboard),
  '#new-sop':   () => loadPage(renderNewSop),
  '#my-sops':   () => loadPage(renderMySOPs),
  '#pending':   () => loadPage(renderPendingPage),
  '#admin':     () => loadPage(renderAdminPage),
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
    </div>`;
  try {
    await renderFn(main);
  } catch (e) {
    console.error('Page error:', e);
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          ${icons['alert-circle'].replace('width="20"','width="48"').replace('height="20"','height="48"')}
        </div>
        <div class="empty-state-title">Something went wrong</div>
        <div class="empty-state-text">${esc(e.message)}</div>
        <button class="btn btn-primary" onclick="navigate('#dashboard')">
          Back to Dashboard
        </button>
      </div>`;
  }
}

function handleRoute() {
  const hash = window.location.hash || '#dashboard';
  if (hash.startsWith('#sop/')) {
    const id = hash.split('/')[1];
    loadPage(c => renderSopDetail(c, id));
    return;
  }
  const handler = routes[hash];
  if (handler) handler();
  else navigate('#dashboard');
}

function renderSettings(container) {
  container.innerHTML = stubPage(
    'Settings', 'Account preferences coming soon.', '#dashboard', 'Back to Dashboard'
  );
}

function stubPage(title, text, ctaHash, ctaLabel) {
  return `
    <nav class="breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('#dashboard')"
        tabindex="0" role="link">Dashboard</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">${title}</span>
    </nav>
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">${title}</h1>
        <p class="page-subtitle">${text}</p>
      </div>
    </div>
    <div class="empty-state" style="background:var(--color-surface);
      border-radius:var(--radius-md);box-shadow:var(--shadow-card);padding:64px;">
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-text">${text}</div>
      <button class="btn btn-primary" onclick="navigate('${ctaHash}')">${ctaLabel}</button>
    </div>`;
}

/* ── Helpers ─────────────────────────────────────────────────── */
window.navigate = hash => { window.location.hash = hash; };

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

/* ── Bootstrap ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initAuth);
