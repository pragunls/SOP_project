/* SOP Portal — Login Page */

import { api }      from '../utils/api.js';
import { toast }    from '../utils/toast.js';
import { AppState } from '../state.js';

const COMPANY_LOGO = '/static/assets/Hindustan_Petroleum_Logo.svg';

export function renderLogin() {
  const root = document.getElementById('app-root');
  if (!root) return;

  root.innerHTML = `
    <div class="login-page" role="main">
      <div class="login-card">

        <div class="login-header">
          <img src="${COMPANY_LOGO}" alt="HPCL Logo" class="login-logo"
            onerror="this.style.display='none';document.getElementById('login-logo-fallback').style.display='flex';" />
          <div id="login-logo-fallback" class="navbar-logo-fallback"
            style="display:none;margin:0 auto var(--space-3);background:var(--color-primary);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white"
              stroke-width="2" stroke-linecap="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <h1 class="login-title">SOP Login</h1>
          <p class="login-subtitle">HPCL — Standard Operating Procedures</p>
        </div>

        <form id="login-form" class="login-form" novalidate>
          <div class="input-wrapper">
            <label class="input-label" for="login-username">Username</label>
            <input type="text" id="login-username" class="input-field"
              placeholder="Enter your username"
              autocomplete="username" autocapitalize="none"
              required aria-required="true" />
          </div>

          <div class="input-wrapper">
            <label class="input-label" for="login-password">Password</label>
            <div class="input-group" style="position:relative;">
              <input type="password" id="login-password" class="input-field"
                placeholder="Enter your password"
                autocomplete="current-password"
                required aria-required="true" />
              <button type="button" id="toggle-pw" class="pw-toggle-btn"
                aria-label="Toggle password visibility">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <div id="login-error" class="login-error" style="display:none;" role="alert"></div>

          <button type="submit" class="btn btn-danger" id="login-btn"
            style="width:100%;justify-content:center;padding:12px;font-size:15px;font-weight:600;margin-top:8px;">
            Sign In
          </button>
        </form>

        <div class="login-footer">
          <p>HPCL Refinery Operations · Confidential</p>
        </div>

      </div>
    </div>
  `;

  const form      = root.querySelector('#login-form');
  const userInput = root.querySelector('#login-username');
  const pwInput   = root.querySelector('#login-password');
  const errEl     = root.querySelector('#login-error');
  const submitBtn = root.querySelector('#login-btn');
  const togglePw  = root.querySelector('#toggle-pw');

  // Show/hide password
  togglePw.addEventListener('click', () => {
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = userInput.value.trim();
    const password = pwInput.value.trim();

    if (!username || !password) {
      showError('Please enter both username and password.');
      return;
    }

    submitBtn.innerHTML = '<span class="btn-spinner"></span> Signing in…';
    submitBtn.disabled  = true;
    errEl.style.display = 'none';

    try {
      const userData = await api.login(username, password);
      // Store user in AppState
      AppState.currentUser = {
        id:       userData.id,
        name:     userData.name,
        initials: userData.initials,
        role:     userData.role,
        email:    userData.email,
        username: userData.username,
      };
      // Trigger app bootstrap
      window.dispatchEvent(new CustomEvent('auth:login', { detail: userData }));
    } catch (err) {
      const msg = err.message.includes('401') ? 'Invalid username or password.' : err.message;
      showError(msg);
      submitBtn.innerHTML = 'Sign In';
      submitBtn.disabled  = false;
      pwInput.value = '';
      pwInput.focus();
    }
  });

  function showError(msg) {
    errEl.textContent   = msg;
    errEl.style.display = 'block';
  }

  // Focus username on load
  userInput.focus();
}
