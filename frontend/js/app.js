/**
 * CampusHub Main Application Orchestrator
 * Integrates theme, reactive store, API client, view modules, and Service Worker.
 */
import { initTheme } from './theme.js';
import { initCursorGlow } from './cursor-glow.js';
import { store } from './state.js';
import * as api from './api.js';
import { escapeHtml, showToast } from './utils.js';

import * as homeView from './views/home.js';
import * as plannerView from './views/planner.js';
import * as marketView from './views/market.js';
import * as lostfoundView from './views/lostfound.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme Manager & Ambient Cursor Glow
  initTheme();
  initCursorGlow();

  // 2. Initialize Modular Views
  const homeContainer = document.getElementById('home-view');
  const plannerContainer = document.getElementById('planner-view');
  const marketContainer = document.getElementById('market-view');
  const lostContainer = document.getElementById('lost-view');

  if (homeContainer) homeView.init(homeContainer);
  if (plannerContainer) plannerView.init(plannerContainer);
  if (marketContainer) marketView.init(marketContainer);
  if (lostContainer) lostfoundView.init(lostContainer);

  // 3. Wire Up State Subscription
  store.subscribe((state, changedKeys) => {
    updateHeaderUserBadge(state.currentUser);

    // Re-render views
    if (homeContainer) homeView.render(state);
    if (plannerContainer) plannerView.render(state);
    if (marketContainer) marketView.render(state);
    if (lostContainer) lostfoundView.render(state);
  });

  // 4. Initialize Navigation Controller
  initNavigation();

  // 5. Initial Data Hydration
  bootstrapAppData();

  // 6. Register Progressive Web App Service Worker
  registerServiceWorker();
});

/**
 * Updates top header user profile information
 * @param {Object} user
 */
function updateHeaderUserBadge(user) {
  if (!user) return;
  const nameEl = document.getElementById('user-name');
  const avatarEl = document.getElementById('user-avatar');
  const roleEl = document.getElementById('user-role');

  if (nameEl && user.name) nameEl.textContent = user.name;
  if (avatarEl && user.avatarUrl) avatarEl.src = user.avatarUrl;
  if (roleEl && user.role) roleEl.textContent = user.role;
}

/**
 * Handles bottom dock view tab switching
 */
function initNavigation() {
  const dockItems = document.querySelectorAll('.dock-item');
  const viewSections = document.querySelectorAll('.view-section');

  dockItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      if (!targetView) return;

      dockItems.forEach((btn) => btn.classList.remove('active'));
      viewSections.forEach((sec) => sec.classList.remove('active'));

      item.classList.add('active');
      const targetSection = document.getElementById(`${targetView}-view`);
      if (targetSection) {
        targetSection.classList.add('active');
      }

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
  let activeUserId = 2; // Seed fallback
  try {
    const user = await api.getUser();
    if (user && user.id) {
      activeUserId = user.id;
      store.setCurrentUser(user);
    }
  } catch (err) {
    console.warn('[CampusHub] Using default session profile:', err.message);
  }

  // 2. Hydrate feeds concurrently using activeUserId as single source of truth
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
