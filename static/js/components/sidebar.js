/* SOP Portal — Sidebar Component */

import { AppState } from '../state.js';
import { icons } from './icons.js';

const NAV_ITEMS = [
  { id: 'dashboard',         label: 'Dashboard',         hash: '#dashboard', icon: 'dashboard',   roles: ['admin','manager','user'] },
  { id: 'new-sop',           label: 'New SOP',           hash: '#new-sop',   icon: 'plus-circle', roles: ['admin','manager','user'] },
  { id: 'my-sops',           label: 'My SOPs',           hash: '#my-sops',   icon: 'file-text',   roles: ['admin','manager','user'] },
  { id: 'pending-approvals', label: 'Pending Approvals', hash: '#pending',   icon: 'clock',       roles: ['admin','manager','user'] },
  { id: 'admin',             label: 'User Management',   hash: '#admin',     icon: 'settings-2',  roles: ['admin','manager'] },
  { id: 'settings',          label: 'Settings',          hash: '#settings',  icon: 'settings',    roles: ['admin','manager','user'] },
];

export function initSidebar() {
  const sidebarEl = document.getElementById('sidebar');
  const mainEl    = document.getElementById('main-content');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const overlay   = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger-btn');

  renderNavItems(sidebarEl);
  renderUserCard(sidebarEl);

  // Desktop collapse toggle
  toggleBtn?.addEventListener('click', () => {
    sidebarEl.classList.toggle('collapsed');
    mainEl?.classList.toggle('sidebar-collapsed');
    const isCollapsed = sidebarEl.classList.contains('collapsed');
    const chevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;
    const chevronLeft  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
    toggleBtn.innerHTML = isCollapsed ? chevronRight : chevronLeft;
    toggleBtn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    toggleBtn.setAttribute('title',      isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
  });

  // Mobile hamburger
  hamburger?.addEventListener('click', () => {
    sidebarEl.classList.add('mobile-open');
    overlay?.classList.add('visible');
  });

  overlay?.addEventListener('click', () => {
    sidebarEl.classList.remove('mobile-open');
    overlay.classList.remove('visible');
  });

  // Update active item on hash change
  window.addEventListener('hashchange', () => updateActiveNav());
  updateActiveNav();
}

function renderNavItems(sidebar) {
  const nav  = sidebar.querySelector('.sidebar-nav');
  if (!nav) return;
  const role = AppState.currentUser?.role || 'user';

  NAV_ITEMS.forEach(item => {
    if (!item.roles.includes(role)) return;
    const el = document.createElement('a');
    el.className = 'nav-item';
    el.href = item.hash;
    el.dataset.nav = item.id;
    el.setAttribute('aria-label', item.label);
    el.innerHTML = `
      <span class="nav-item-icon" aria-hidden="true">${icons[item.icon] || icons.circle}</span>
      <span class="nav-item-label">${item.label}</span>
    `;
    nav.appendChild(el);
  });
}

function renderUserCard(sidebar) {
  const userCard = sidebar.querySelector('.sidebar-user');
  if (!userCard) return;
  const u = AppState.currentUser;
  userCard.innerHTML = `
    <div class="user-avatar" aria-hidden="true" style="width:32px;height:32px;font-size:13px;">${u.initials}</div>
    <div class="sidebar-user-info">
      <div class="sidebar-user-name">${u.name}</div>
      <div class="sidebar-user-role">${u.role}</div>
    </div>
  `;
}

function updateActiveNav() {
  const hash = window.location.hash || '#dashboard';
  document.querySelectorAll('.nav-item[data-nav]').forEach(el => {
    const isActive = el.getAttribute('href') === hash ||
      (hash.startsWith('#sop/') && el.dataset.nav === 'dashboard');
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}
