/**
 * CampusHub Main Application Orchestrator
 * Integrates theme manager, reactive store, canonical REST client,
 * modular views (Home, Planner, Market, Lost, Admin), and dual form-factor routing.
 */
import { initTheme } from './theme.js';
import { initCursorGlow } from './cursor-glow.js';
import { store } from './state.js';
import * as api from './api.js';
import { showToast } from './utils.js';

import * as homeView from './views/home.js';
import * as plannerView from './views/planner.js';
import * as marketView from './views/market.js';
import * as lostfoundView from './views/lostfound.js';
import * as adminView from './views/admin.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme Manager & Ambient Cursor Glow
  initTheme();
  initCursorGlow();

  // 2. Initialize Modular Views
  const homeContainer = document.getElementById('home-view');
  const plannerContainer = document.getElementById('planner-view');
  const marketContainer = document.getElementById('market-view');
  const lostContainer = document.getElementById('lost-view');
  const adminContainer = document.getElementById('admin-view');

  if (homeContainer) homeView.init(homeContainer);
  if (plannerContainer) plannerView.init(plannerContainer);
  if (marketContainer) marketView.init(marketContainer);
  if (lostContainer) lostfoundView.init(lostContainer);
  if (adminContainer) adminView.init(adminContainer);

  // 3. Wire Up Reactive State Subscription
  store.subscribe((state, changedKeys) => {
    updateHeaderUserBadge(state.currentUser);
    syncActiveView(state.activeTab, state.currentUser);

    // Re-render views
    if (homeContainer) homeView.render(state);
    if (plannerContainer) plannerView.render(state);
    if (marketContainer) marketView.render(state);
    if (lostContainer) lostfoundView.render(state);
    if (adminContainer) adminView.render(state);
  });

  // 4. Initialize Navigation & Role Switching
  initNavigation();
  initRoleSwitcher();

  // 5. Initial Data Hydration
  bootstrapAppData();

  // 6. Register Progressive Web App Service Worker
  registerServiceWorker();
});

/**
 * Updates top header user profile information and role badge
 * @param {Object} user
 */
function updateHeaderUserBadge(user) {
  if (!user) return;
  const nameEl = document.getElementById('user-name');
  const avatarEl = document.getElementById('user-avatar');
  const roleEl = document.getElementById('user-role');

  if (nameEl && user.name) nameEl.textContent = user.name;
  if (avatarEl && user.avatarUrl) avatarEl.src = user.avatarUrl;
  if (roleEl) {
    const role = user.role || 'STUDENT';
    roleEl.setAttribute('data-role', role);
    roleEl.innerHTML = `${role} <span class="role-switch-icon" aria-hidden="true">⇄</span>`;
    document.documentElement.setAttribute('data-role', role);
    document.body.setAttribute('data-role', role);

    // Toggle Admin button visibility in desktop navigation and mobile bottom dock
    const desktopAdminTab = document.getElementById('desktop-nav-admin');
    if (desktopAdminTab) {
      desktopAdminTab.style.display = role === 'ADMIN' ? 'inline-flex' : 'none';
    }
    const adminDockTab = document.getElementById('tab-admin');
    if (adminDockTab) {
      adminDockTab.style.display = role === 'ADMIN' ? 'flex' : 'none';
    }
  }
}

/**
 * Binds interactive click to toggle user role between STUDENT and ADMIN
 */
function initRoleSwitcher() {
  const badge = document.getElementById('user-profile-badge');
  if (badge) {
    badge.addEventListener('click', () => {
      const nextRole = store.toggleUserRole();
      showToast(`Switched active role to ${nextRole}`, 'info');
    });

    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const nextRole = store.toggleUserRole();
        showToast(`Switched active role to ${nextRole}`, 'info');
      }
    });
  }

  const brandBtn = document.getElementById('brand-home-btn');
  if (brandBtn) {
    brandBtn.addEventListener('click', () => {
      store.setActiveTab('home');
    });
  }
}

/**
 * Syncs DOM view section visibility with store activeTab across all navigation surfaces
 */
function syncActiveView(targetView, user) {
  const viewSections = document.querySelectorAll('.view-section');
  const navElements = document.querySelectorAll('[data-view]');

  viewSections.forEach((sec) => sec.classList.remove('active'));
  navElements.forEach((btn) => {
    const isAct = btn.getAttribute('data-view') === targetView;
    btn.classList.toggle('active', isAct);
    btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
  });

  const activeSec = document.getElementById(`${targetView}-view`);
  if (activeSec) {
    activeSec.classList.add('active');
  }
}

/**
 * Handles navigation tab switching across desktop navbar and mobile bottom dock
 */
function initNavigation() {
  const navElements = document.querySelectorAll('[data-view]');

  navElements.forEach((item) => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      if (!targetView) return;
      store.setActiveTab(targetView);
    });
  });
}

/**
 * Bootstraps active user session and initial data feeds
 */
async function bootstrapAppData() {
  store.setState({
    loading: {
      user: true,
      timetable: true,
      attendance: true,
      marketplace: true,
      lostfound: true
    }
  });

  // 1. Fetch User Profile
  let activeUserId = 2; // Default seed
  try {
    const user = await api.getUser();
    if (user && user.id) {
      activeUserId = user.id;
      // Preserve local role override if user toggled role
      const savedRole = localStorage.getItem('campushub-role') || user.role || 'STUDENT';
      store.setCurrentUser({ ...user, role: savedRole });
    }
  } catch (err) {
    console.warn('[CampusHub] Using default session profile:', err.message);
  }

  // 2. Concurrently hydrate all feeds
  try {
    const [timetable, attendance, marketplace, lostfound] = await Promise.all([
      api.getTimetable(activeUserId).catch((e) => {
        console.warn('[CampusHub] Timetable fetch fallback:', e);
        return [];
      }),
      api.getAttendance(activeUserId).catch((e) => {
        console.warn('[CampusHub] Attendance fetch fallback:', e);
        return [];
      }),
      api.getMarketplace().catch((e) => {
        console.warn('[CampusHub] Marketplace fetch fallback:', e);
        return [];
      }),
      api.getLostFound().catch((e) => {
        console.warn('[CampusHub] Lost & Found fetch fallback:', e);
        return [];
      })
    ]);

    store.setTimetable(timetable);
    store.setAttendance(attendance);
    store.setMarketplace(marketplace);
    store.setLostFound(lostfound);
  } catch (err) {
    console.error('[CampusHub] Data bootstrap error:', err);
    showToast('Offline: Loaded cached campus data', 'info');
  } finally {
    store.setState({
      loading: {
        user: false,
        timetable: false,
        attendance: false,
        marketplace: false,
        lostfound: false
      }
    });
  }
}

/**
 * Registers Service Worker for offline PWA capabilities
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[CampusHub] Service Worker active, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[CampusHub] Service Worker registration failed:', err);
        });
    });
  }
}
