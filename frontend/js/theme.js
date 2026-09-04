/**
 * Theme Manager for CampusHub (Apple x Notion Theme)
 * Manages light / dark theme persistence, OS color-scheme detection,
 * and data-theme DOM attribute mutation.
 */

const STORAGE_KEY = 'campushub-theme';

export function getPreferredTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
  return nextTheme;
}

export function initTheme() {
  applyTheme(getPreferredTheme());

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}
