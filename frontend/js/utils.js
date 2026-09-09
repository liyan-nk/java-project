/**
 * CampusHub Core Utilities: XSS Sanitization, Safe Math, and Toast System
 */

/**
 * Escapes unsafe characters in dynamic text to prevent XSS injection.
 * @param {string|number|null|undefined} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return map[char];
  });
}

/**
 * Safely computes attendance percentage guarding against total === 0.
 * @param {number} attended
 * @param {number} total
 * @returns {number}
 */
export function computePercentage(attended, total) {
  if (!total || total <= 0) return 0;
  return Math.round((attended / total) * 10000) / 100;
}

const MAX_VISIBLE_TOASTS = 3;
const TOAST_DURATION_MS = 3000;

/**
 * Dismisses a single toast with an exit transition and DOM cleanup.
 * @param {HTMLElement} toast
 */
export function dismissToast(toast) {
  if (!toast || toast.classList.contains('toast-exit')) return;
  toast.classList.add('toast-exit');
  setTimeout(() => {
    toast.remove();
  }, 260);
}

/**
 * Surfaces non-intrusive auto-dismissing toast notifications.
 * Automatically caps visible toasts at MAX_VISIBLE_TOASTS and dismisses after 3000ms.
 * Also supports click-to-dismiss.
 * @param {string} message
 * @param {'info'|'success'|'error'} [type='info']
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  // Prevent unbounded stacking: remove oldest toast if at limit
  const activeToasts = container.querySelectorAll('.toast:not(.toast-exit)');
  if (activeToasts.length >= MAX_VISIBLE_TOASTS) {
    dismissToast(activeToasts[0]);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} ${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <span class="toast-close" aria-label="Dismiss notification">✕</span>
  `;

  container.appendChild(toast);

  // Auto-dismiss after TOAST_DURATION_MS
  const timer = setTimeout(() => {
    dismissToast(toast);
  }, TOAST_DURATION_MS);

  // Click-to-dismiss handler
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    dismissToast(toast);
  });
}
