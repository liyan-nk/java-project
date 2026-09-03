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

/**
 * Surfaces non-intrusive auto-dismissing toast notifications.
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

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Smooth entrance transition
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto-dismiss after 3000ms
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}
