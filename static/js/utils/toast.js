/* SOP Portal — Toast Notification Utility */

let toastContainer = null;

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('role', 'region');
    toastContainer.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message - Main message text
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {string} [sub] - Optional secondary text
 * @param {number} [duration=4000] - Auto-dismiss ms (0 = no auto-dismiss)
 */
export function showToast(message, type = 'info', sub = '', duration = 4000) {
  const container = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--color-success);flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--color-danger);flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--color-primary);flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--color-warning);flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };

  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      ${icons[type] || ''}
      <div style="flex:1;min-width:0;">
        <div class="toast-message">${escapeHtml(message)}</div>
        ${sub ? `<div class="toast-sub">${escapeHtml(sub)}</div>` : ''}
      </div>
      <button onclick="this.closest('.toast').remove()" style="background:none;border:none;cursor:pointer;color:var(--color-text-secondary);padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:3px;flex-shrink:0;" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    ${duration > 0 ? `<div class="toast-progress" style="color:var(--color-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary'});animation-duration:${duration}ms;"></div>` : ''}
  `;

  container.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }

  return toast;
}

function dismissToast(toast) {
  toast.style.transform = 'translateX(120%)';
  toast.style.opacity = '0';
  toast.style.transition = 'transform 300ms ease, opacity 300ms ease';
  setTimeout(() => toast.remove(), 300);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Convenience exports
export const toast = {
  success: (msg, sub) => showToast(msg, 'success', sub),
  error:   (msg, sub) => showToast(msg, 'error', sub),
  info:    (msg, sub) => showToast(msg, 'info', sub),
  warning: (msg, sub) => showToast(msg, 'warning', sub),
};
