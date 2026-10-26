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
const TOAST_DURATION_MS = 5000;
const TOAST_TRANSITION_MS = 300;

/**
 * Removes a toast element with a 300ms fade-out transition, then removes from DOM.
 * Clears the auto-dismiss timer to avoid memory leaks.
 * @param {HTMLElement} el
 */
export function removeToast(el) {
  if (!el || el.classList.contains('toast-hide')) return;

  const msg = el.querySelector('.toast-message')?.textContent || '';

  // Clear timer to avoid memory leaks
  if (el._timerId) {
    clearTimeout(el._timerId);
    el._timerId = null;
  }

  el.classList.remove('toast-show');
  el.classList.add('toast-hide');

  setTimeout(() => {
    el.remove();
    console.log('toast removed', msg);
  }, TOAST_TRANSITION_MS);
}

// Backward compatibility alias
export const dismissToast = removeToast;

/**
 * Surfaces non-intrusive auto-dismissing toast notifications.
 * Automatically caps visible toasts at MAX_VISIBLE_TOASTS (3) and dismisses after 5000ms.
 * Guards against duplicate messages by resetting the existing toast's timer.
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

  const strMessage = String(message ?? '');

  // Duplicate guard: If a toast with identical message text is already visible,
  // do not create another one. Reset that existing toast's 5-second timer instead.
  const activeToasts = Array.from(container.querySelectorAll('.toast:not(.toast-hide)'));
  const existingToast = activeToasts.find((t) => {
    const msgEl = t.querySelector('.toast-message');
    return msgEl && msgEl.textContent.trim() === strMessage.trim();
  });

  if (existingToast) {
    if (existingToast._timerId) {
      clearTimeout(existingToast._timerId);
    }
    existingToast._timerId = setTimeout(() => {
      removeToast(existingToast);
    }, TOAST_DURATION_MS);
    return;
  }

  // Limit visible toasts to a maximum of 3. If a 4th arrives, remove oldest immediately.
  while (activeToasts.length >= MAX_VISIBLE_TOASTS) {
    const oldest = activeToasts.shift();
    if (oldest._timerId) {
      clearTimeout(oldest._timerId);
      oldest._timerId = null;
    }
    oldest.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} ${type}`;
  toast.setAttribute('role', 'alert');

  const msgSpan = document.createElement('span');
  msgSpan.className = 'toast-message';
  msgSpan.textContent = strMessage;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.textContent = '✕';

  toast.appendChild(msgSpan);
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Force reflow and add "toast-show" class to trigger slide-up transition
  void toast.offsetHeight;
  toast.classList.add('toast-show');

  // Start auto-dismiss timer immediately before other logic
  toast._timerId = setTimeout(() => {
    removeToast(toast);
  }, TOAST_DURATION_MS);

  // Manual dismissal via small close (x) button
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeToast(toast);
  });

  // Click-to-dismiss on toast body
  toast.addEventListener('click', () => {
    removeToast(toast);
  });

  console.log('toast created', strMessage);
}
