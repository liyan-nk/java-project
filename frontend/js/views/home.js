/**
 * Home Overview View Module
 * Implements the Uniform View Module Contract: { init, render }
 */
import { escapeHtml, computePercentage } from '../utils.js';

let viewContainer = null;

export function init(container) {
  viewContainer = container;
  viewContainer.innerHTML = `
    <div class="section-title">
      <span>Overview</span>
      <span class="badge badge-blue">Live Sync</span>
    </div>
    <div id="home-summary">
      <!-- Loading Skeleton rendered initially -->
      <div class="grid-2 loading">
        <div class="skeleton-card">
          <div class="skeleton-line w-short"></div>
          <div class="skeleton-line w-med"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-line w-short"></div>
          <div class="skeleton-line w-med"></div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top: 14px;">
      <h4 style="font-size: 0.95rem; margin-bottom: 8px;">📢 Campus Announcements</h4>
      <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
        Semester registration closes this Friday at 11:59 PM. Make sure your course selections and attendance tracking are finalized in the Planner tab.
      </p>
    </div>
  `;
}

export function render(state) {
  if (!viewContainer) return;

  const summaryContainer = viewContainer.querySelector('#home-summary');
  if (!summaryContainer) return;

  // Render skeleton if data is loading
  if (state.loading.timetable && state.loading.attendance) {
    summaryContainer.innerHTML = `
      <div class="grid-2 loading">
        <div class="skeleton-card">
          <div class="skeleton-line w-short"></div>
          <div class="skeleton-line w-med"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-line w-short"></div>
          <div class="skeleton-line w-med"></div>
        </div>
      </div>
    `;
    return;
  }

  // 1. Next Class Card
  const timetable = state.timetable || [];
  const nextClass = timetable[0];

  let nextClassHtml = '';
  if (nextClass) {
    nextClassHtml = `
      <div class="card">
        <span class="badge badge-blue">Next Class</span>
        <h3 style="margin-top: 8px; font-size: 1.05rem; font-weight: 600;">${escapeHtml(nextClass.subject)}</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          📍 ${escapeHtml(nextClass.room)} • ${escapeHtml(nextClass.startTime)}
        </p>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
          👨‍🏫 ${escapeHtml(nextClass.instructor)}
        </p>
      </div>
    `;
  } else {
    nextClassHtml = `
      <div class="card empty-state" style="padding: 18px 12px; margin-bottom: 0;">
        <span class="empty-icon" style="font-size: 1.4rem;">☕</span>
        <div class="empty-title" style="font-size: 0.9rem;">No Classes Today</div>
        <div class="empty-desc" style="font-size: 0.75rem;">Your schedule is clear.</div>
      </div>
    `;
  }

  // 2. Average Attendance Card
  const attendance = state.attendance || [];
  let avgAttendanceHtml = '';

  if (attendance.length > 0) {
    const totalAttended = attendance.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
    const totalClasses = attendance.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
    const avgPercentage = computePercentage(totalAttended, totalClasses);
    const isSafe = avgPercentage >= 75;

    avgAttendanceHtml = `
      <div class="card">
        <span class="badge ${isSafe ? 'badge-green' : 'badge-orange'}">Avg Attendance</span>
        <h3 style="margin-top: 8px; font-size: 1.4rem; color: ${isSafe ? 'var(--color-success)' : 'var(--color-warning)'};">
          ${avgPercentage}%
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">🎯 Target: 75%</p>
        <div class="progress-container">
          <div class="progress-bar ${isSafe ? 'safe' : 'warning'}" style="width: ${Math.min(avgPercentage, 100)}%;"></div>
        </div>
      </div>
    `;
  } else {
    avgAttendanceHtml = `
      <div class="card empty-state" style="padding: 18px 12px; margin-bottom: 0;">
        <span class="empty-icon" style="font-size: 1.4rem;">📊</span>
        <div class="empty-title" style="font-size: 0.9rem;">No Attendance Data</div>
        <div class="empty-desc" style="font-size: 0.75rem;">Add courses in Planner.</div>
      </div>
    `;
  }

  summaryContainer.innerHTML = `
    <div class="grid-2">
      ${nextClassHtml}
      ${avgAttendanceHtml}
    </div>
  `;
}
