/**
 * Home Overview View Module
 * Apple x Notion Dashboard with dynamic attendance health pills,
 * next class schedule callout, and quick action shortcuts.
 */
import { escapeHtml, computePercentage } from '../utils.js';
import { store } from '../state.js';

let viewContainer = null;

export function init(container) {
  viewContainer = container;

  viewContainer.innerHTML = `
    <!-- Header -->
    <div class="section-header">
      <div>
        <h2 class="section-title">Campus Overview</h2>
        <div class="section-subtitle">Real-time schedule, attendance analytics & campus feed</div>
      </div>
      <span class="role-pill" style="background: var(--accent-safe-subtle); color: var(--accent-safe);">
        ● Live Connected
      </span>
    </div>

    <!-- Summary Grid -->
    <div id="home-summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      <!-- Skeletons initially -->
      <div class="skeleton" style="height: 140px; border-radius: var(--radius-md);"></div>
      <div class="skeleton" style="height: 140px; border-radius: var(--radius-md);"></div>
    </div>

    <!-- Quick Navigation Shortcuts -->
    <div style="margin-top: 28px;">
      <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">Quick Access</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;" id="quick-actions-bar">
        <button type="button" class="timetable-card" data-nav="planner" style="cursor: pointer; padding: 14px; text-align: left;">
          <span style="font-size: 1.5rem; margin-bottom: 6px; display: block;">📅</span>
          <strong>Planner</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">View & log classes</span>
        </button>
        <button type="button" class="timetable-card" data-nav="market" style="cursor: pointer; padding: 14px; text-align: left;">
          <span style="font-size: 1.5rem; margin-bottom: 6px; display: block;">🛍️</span>
          <strong>Marketplace</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Buy & sell items</span>
        </button>
        <button type="button" class="timetable-card" data-nav="lost" style="cursor: pointer; padding: 14px; text-align: left;">
          <span style="font-size: 1.5rem; margin-bottom: 6px; display: block;">🔍</span>
          <strong>Lost & Found</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Report or recover</span>
        </button>
      </div>
    </div>

    <!-- Announcements Card -->
    <div style="margin-top: 28px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 20px; box-shadow: var(--shadow-sm);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="font-size: 1.25rem;">📢</span>
        <h3 style="font-size: 1.05rem; font-weight: 700;">Campus Announcements</h3>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">
        Welcome to the redesigned CampusHub! Students can track weekly lectures, log attendance with tap steppers, list items, and report lost property. Administrators can access the <strong>Desktop Admin Workspace</strong> for batch claim verifications and moderation.
      </p>
    </div>
  `;

  bindEvents();
}

export function render(state) {
  if (!viewContainer) return;

  const summaryGrid = viewContainer.querySelector('#home-summary-grid');
  if (!summaryGrid) return;

  // 1. Next Class
  const timetable = state.timetable || [];
  const nextClass = timetable[0];

  const classCardHtml = nextClass ? `
    <div class="timetable-card" style="border-left: 4px solid var(--accent-primary);">
      <div class="timetable-header">
        <span class="role-pill">Next Class</span>
        <span class="timetable-time-pill">${escapeHtml(nextClass.startTime)} - ${escapeHtml(nextClass.endTime)}</span>
      </div>
      <div>
        <h3 class="timetable-subject">${escapeHtml(nextClass.subject)}</h3>
        <div class="timetable-meta" style="margin-top: 6px;">
          <div class="timetable-meta-item">🏛️ ${escapeHtml(nextClass.room || 'TBD')}</div>
          <div class="timetable-meta-item">👨‍🏫 ${escapeHtml(nextClass.instructor || 'Staff')}</div>
        </div>
      </div>
    </div>
  ` : `
    <div class="timetable-card" style="text-align: center; padding: 24px;">
      <span style="font-size: 2rem; display: block; margin-bottom: 6px;">☕</span>
      <strong>No Classes Scheduled</strong>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Your schedule is free for today.</p>
    </div>
  `;

  // 2. Attendance Summary
  const attendance = state.attendance || [];
  let attendanceCardHtml = '';

  if (attendance.length > 0) {
    const totalAttended = attendance.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
    const totalClasses = attendance.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
    const avgPercentage = computePercentage(totalAttended, totalClasses);
    const isSafe = avgPercentage >= 75.0;

    attendanceCardHtml = `
      <div class="attendance-card ${isSafe ? 'safe' : 'danger'}">
        <div class="attendance-card-header">
          <div>
            <span class="role-pill" style="font-size: 0.7rem;">Average Standing</span>
            <h3 class="attendance-subject" style="margin-top: 4px;">Overall Attendance</h3>
          </div>
          <span class="attendance-pill ${isSafe ? 'safe' : 'danger'}">
            ${isSafe ? '✓ Safe' : '⚠️ Low'} ${avgPercentage}%
          </span>
        </div>

        <div class="attendance-progress-track">
          <div class="attendance-progress-fill ${isSafe ? 'safe' : 'danger'}" style="width: ${Math.min(100, Math.max(0, avgPercentage))}%"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
          <span>${totalAttended} / ${totalClasses} Classes Logged</span>
          <span>Target: 75%</span>
        </div>
      </div>
    `;
  } else {
    attendanceCardHtml = `
      <div class="attendance-card" style="text-align: center; padding: 24px;">
        <span style="font-size: 2rem; display: block; margin-bottom: 6px;">📊</span>
        <strong>Attendance Up-to-Date</strong>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Check planner to view enrolled courses.</p>
      </div>
    `;
  }

  summaryGrid.innerHTML = `${classCardHtml}${attendanceCardHtml}`;
}

function bindEvents() {
  if (!viewContainer) return;

  const quickBar = viewContainer.querySelector('#quick-actions-bar');
  if (quickBar) {
    quickBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-nav]');
      if (!btn) return;
      const navTarget = btn.getAttribute('data-nav');
      if (navTarget) {
        // Trigger tab navigation
        const tabBtn = document.querySelector(`.dock-item[data-view="${navTarget}"]`);
        tabBtn?.click();
      }
    });
  }
}
