/* ============================================================
   SOP Portal — Validators
   ============================================================ */

export function required(value) {
  if (!value || String(value).trim() === '') return 'This field is required.';
  return null;
}

export function minLength(min) {
  return (value) => {
    if (!value || value.length < min) return `Minimum ${min} characters required.`;
    return null;
  };
}

export function maxLength(max) {
  return (value) => {
    if (value && value.length > max) return `Maximum ${max} characters allowed.`;
    return null;
  };
}

export function range(min, max) {
  return (value) => {
    const n = Number(value);
    if (isNaN(n) || n < min || n > max) return `Value must be between ${min} and ${max}.`;
    return null;
  };
}

/**
 * Run validators against a value; returns first error or null.
 */
export function validate(value, ...validators) {
  for (const v of validators) {
    const err = v(value);
    if (err) return err;
  }
  return null;
}

/**
 * Apply validation to a form field and show/clear error message.
 * @param {HTMLElement} input
 * @param {string|null} error
 */
export function applyFieldError(input, error) {
  input.classList.toggle('input-error', !!error);
  const wrapper = input.closest('.input-wrapper');
  if (!wrapper) return;
  let msgEl = wrapper.querySelector('.input-error-msg');
  if (error) {
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.className = 'input-error-msg';
      wrapper.appendChild(msgEl);
    }
    msgEl.textContent = error;
  } else {
    msgEl?.remove();
  }
}
