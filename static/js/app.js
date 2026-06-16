/* ============================================================
   SOP Portal — Main App Entry Point & Router
   ============================================================ */

// ── Company Logo ──
// Replace './assets/logo.png' with your actual logo path
const COMPANY_LOGO = '/static/assets/Hindustan_Petroleum_Logo.svg';

import { AppState } from './state.js';
import { initSidebar } from './components/sidebar.js';
import { icons } from './components/icons.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderNewSop } from './pages/new-sop.js';
import { renderSopDetail } from './pages/sop-detail.js';
import { toast } from './utils/toast.js';

// ── Shell Init ──
function initShell() {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const u = AppState.currentUser;
    navbar.innerHTML = `
      <div class="navbar-brand">
        <button class="hamburger-btn" id="hamburger-btn" aria-label="Open navigation" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <img class="navbar-logo" src="${COMPANY_LOGO}" alt="HPCL Logo"
          style="height:36px;display:none;"
          onload="this.style.display='block';this.nextElementSibling.style.display='none';"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
        />
        <div class="navbar-logo-fallback" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </div>
        <span class="navbar-title">SOP</span>
      </div>
      <div class="navbar-right">
        <button class="navbar-icon-btn" id="notif-btn" aria-label="Notifications" aria-haspopup="true">
          <div class="notification-badge" aria-label="2 unread notifications" role="status"></div>
          ${icons.bell}
        </button>
        <div class="user-chip" role="button" tabindex="0" aria-label="${u.name} — ${u.role}" aria-haspopup="true">
          <div class="user-avatar" aria-hidden="true">${u.initials}</div>
          <span class="user-name">${u.name}</span>
          <span class="role-badge">${u.role}</span>
        </div>
      </div>
    `;
  }

  initSidebar();
}

// ── Client-Side Router ──
const routes = {
  '#dashboard':  () => loadPage(renderDashboard),
  '#new-sop':    () => loadPage(renderNewSop),
  '#my-sops':    () => loadPage(renderMySOPs),
  '#pending':    () => loadPage(renderPending),
  '#admin':      () => loadPage(renderAdmin),
  '#settings':   () => loadPage(renderSettings),
};

async function loadPage(renderFn) {
  const main = document.getElementById('page-content');
  if (!main) return;
  // Show loading shimmer
  main.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0;">
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
  } catch(e) {
    console.error('Page render error:', e);
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icons['alert-circle'].replace('width="20"','width="48"').replace('height="20"','height="48"')}</div>
        <div class="empty-state-title">Something went wrong</div>
        <div class="empty-state-text">${e.message}</div>
        <button class="btn btn-primary" onclick="navigate('#dashboard')">Back to Dashboard</button>
      </div>
    `;
  }
}

function handleRoute() {
  const hash = window.location.hash || '#dashboard';

  // Handle SOP detail route: #sop/123
  if (hash.startsWith('#sop/')) {
    const id = hash.split('/')[1];
    const main = document.getElementById('page-content');
    if (main) {
      loadPage((c) => renderSopDetail(c, id));
    }
    return;
  }

  const handler = routes[hash];
  if (handler) {
    handler();
  } else {
    // Default to dashboard for unmatched routes
    navigate('#dashboard');
  }
}

// ── Stub pages for unimplemented routes ──
function renderMySOPs(container) {
  container.innerHTML = stubPage('My SOPs', 'Your submitted and drafted SOPs will appear here.', '#new-sop', 'Create New SOP');
}
function renderPending(container) {
  container.innerHTML = stubPage('Pending Approvals', 'SOPs awaiting your review and approval.', '#dashboard', 'Back to Dashboard');
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
    <div class="empty-state" style="background:var(--color-surface);border-radius:var(--radius-md);box-shadow:var(--shadow-card);padding:64px;">
      ${icons['file-doc'].replace('width="24"','width="64"').replace('height="24"','height="64"').replace('stroke="currentColor"','stroke="var(--color-border)"')}
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-text">${text}</div>
      <button class="btn btn-primary" onclick="navigate('${ctaHash}')">${ctaLabel}</button>
    </div>
  `;
}

// ── Global navigation helper ──
window.navigate = function(hash) {
  window.location.hash = hash;
};

// ── Bootstrap ──
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // Handle initial load
});
