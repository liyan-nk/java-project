/**
 * Planner View Module (Timetable & Attendance Stepper)
 * Implements the Uniform View Module Contract: { init, render }
 */
import { escapeHtml, computePercentage, showToast } from '../utils.js';
import { store } from '../state.js';
import * as api from '../api.js';

let viewContainer = null;
let activeDayFilter = 'ALL';

export function init(container) {
  viewContainer = container;

  viewContainer.innerHTML = `
    <!-- Timetable Section -->
    <div class="section-title">
      <div>
        <span>Course Timetable</span>
        <div class="section-subtitle">Weekly class schedule</div>
      </div>
      <button id="add-class-btn" class="btn btn-sm">+ Add Class</button>
    </div>

    <!-- Weekday Filter Pills -->
    <div class="filter-bar" id="timetable-filter-bar">
      <button class="filter-pill active" data-day="ALL">All Days</button>
      <button class="filter-pill" data-day="MONDAY">Mon</button>
      <button class="filter-pill" data-day="TUESDAY">Tue</button>
      <button class="filter-pill" data-day="WEDNESDAY">Wed</button>
      <button class="filter-pill" data-day="THURSDAY">Thu</button>
      <button class="filter-pill" data-day="FRIDAY">Fri</button>
    </div>

    <div id="timetable-list-container">
      <!-- Dynamic Timetable -->
    </div>

    <!-- Attendance Section -->
    <div class="section-title" style="margin-top: 28px;">
      <div>
        <span>Attendance Tracker</span>
        <div class="section-subtitle">Tap +/- to log attendance</div>
      </div>
    </div>

    <div id="attendance-list-container">
      <!-- Dynamic Attendance -->
    </div>

    <!-- Modal Dialog: Add Class -->
    <div id="add-class-modal" class="modal-backdrop">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 class="modal-title">Add Timetable Class</h3>
          <button type="button" class="modal-close-btn" id="close-class-modal-btn">✕</button>
        </div>
        <form id="add-class-form">
          <div class="form-group">
            <label class="form-label" for="class-day">Day of Week</label>
            <select id="class-day" class="form-select" required>
              <option value="MONDAY">Monday</option>
              <option value="TUESDAY">Tuesday</option>
              <option value="WEDNESDAY">Wednesday</option>
              <option value="THURSDAY">Thursday</option>
              <option value="FRIDAY">Friday</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="class-subject">Subject</label>
            <input type="text" id="class-subject" class="form-input" placeholder="e.g. Advanced Operating Systems" required maxlength="80">
          </div>
          <div class="form-group">
            <label class="form-label" for="class-room">Room / Location</label>
            <input type="text" id="class-room" class="form-input" placeholder="e.g. Science Complex 402" required maxlength="40">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="class-start">Start Time</label>
              <input type="time" id="class-start" class="form-input" value="09:00" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="class-end">End Time</label>
              <input type="time" id="class-end" class="form-input" value="10:30" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="class-instructor">Instructor</label>
            <input type="text" id="class-instructor" class="form-input" placeholder="e.g. Dr. Alan Turing" required maxlength="60">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-class-modal-btn">Cancel</button>
            <button type="submit" class="btn" id="submit-class-btn">Save Class</button>
          </div>
        </form>
      </div>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  // 1. Day of Week Filter Bar
  const filterBar = viewContainer.querySelector('#timetable-filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;

      filterBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      activeDayFilter = btn.getAttribute('data-day') || 'ALL';
      render(store.getState());
    });
  }

  // 2. Stepper Delegate for Attendance (+ / -)
  const attendanceContainer = viewContainer.querySelector('#attendance-list-container');
  if (attendanceContainer) {
    attendanceContainer.addEventListener('click', async (e) => {
      const stepBtn = e.target.closest('.step-btn');
      if (!stepBtn || stepBtn.hasAttribute('disabled')) return;

      const recordId = parseInt(stepBtn.getAttribute('data-id'), 10);
      const isAttended = stepBtn.getAttribute('data-step') === 'plus';

      if (!recordId) return;

      // Optimistic stepping with pending lock
      const rollback = store.optimisticStepAttendance(recordId, isAttended);

      try {
        const serverRecord = await api.stepAttendance(recordId, isAttended);
        store.reconcileStepAttendance(recordId, serverRecord);
      } catch (err) {
        rollback();
        showToast('Failed to update attendance. Please try again.', 'error');
      }
    });
  }

  // 3. Modal Controls: Add Class
  const modal = viewContainer.querySelector('#add-class-modal');
  const addBtn = viewContainer.querySelector('#add-class-btn');
  const closeBtn = viewContainer.querySelector('#close-class-modal-btn');
  const cancelBtn = viewContainer.querySelector('#cancel-class-modal-btn');
  const form = viewContainer.querySelector('#add-class-form');

  const openModal = () => modal && modal.classList.add('active');
  const closeModal = () => {
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
  };

  if (addBtn) addBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = viewContainer.querySelector('#submit-class-btn');
      if (submitBtn) submitBtn.setAttribute('disabled', 'true');

      const currentUser = store.getState().currentUser;
      const payload = {
        userId: currentUser.id,
        dayOfWeek: viewContainer.querySelector('#class-day').value,
        subject: viewContainer.querySelector('#class-subject').value.trim(),
        room: viewContainer.querySelector('#class-room').value.trim(),
        startTime: viewContainer.querySelector('#class-start').value,
        endTime: viewContainer.querySelector('#class-end').value,
        instructor: viewContainer.querySelector('#class-instructor').value.trim()
      };

      try {
        const mergedEntry = await api.createTimetableEntry(payload);
        store.addTimetableEntry(mergedEntry);
        closeModal();
        showToast('Class added to timetable!', 'success');
      } catch (err) {
        showToast('Failed to add class. Please try again.', 'error');
      } finally {
        if (submitBtn) submitBtn.removeAttribute('disabled');
      }
    });
  }
}

export function render(state) {
  if (!viewContainer) return;

  renderTimetable(state);
  renderAttendance(state);
}

function renderTimetable(state) {
  const container = viewContainer.querySelector('#timetable-list-container');
  if (!container) return;

  if (state.loading.timetable) {
    container.innerHTML = `
      <div class="loading">
        <div class="skeleton-card"><div class="skeleton-line w-full"></div></div>
        <div class="skeleton-card"><div class="skeleton-line w-full"></div></div>
      </div>
    `;
    return;
  }

  let items = state.timetable || [];
  if (activeDayFilter !== 'ALL') {
    items = items.filter((item) => item.dayOfWeek && item.dayOfWeek.toUpperCase() === activeDayFilter);
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-title">No Classes Found</div>
        <div class="empty-desc">No classes scheduled for ${escapeHtml(activeDayFilter)}. Tap "+ Add Class" above.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span class="badge badge-blue">${escapeHtml(item.dayOfWeek)}</span>
        <h4 style="font-size: 1rem; margin-top: 6px; font-weight: 600;">${escapeHtml(item.subject)}</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">
          📍 ${escapeHtml(item.room)} • 👨‍🏫 ${escapeHtml(item.instructor)}
        </p>
      </div>
      <div style="text-align: right; font-weight: 600; font-size: 0.9rem; color: var(--accent-color); white-space: nowrap;">
        ${escapeHtml(item.startTime)} - ${escapeHtml(item.endTime)}
      </div>
    </div>
  `).join('');
}

function renderAttendance(state) {
  const container = viewContainer.querySelector('#attendance-list-container');
  if (!container) return;

  if (state.loading.attendance) {
    container.innerHTML = `
      <div class="loading">
        <div class="skeleton-card"><div class="skeleton-line w-full"></div></div>
      </div>
    `;
    return;
  }

  const records = state.attendance || [];
  if (records.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📈</div>
        <div class="empty-title">No Attendance Records</div>
        <div class="empty-desc">No course attendance registered for this account.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = records.map((rec) => {
    const percentage = computePercentage(rec.attendedClasses, rec.totalClasses);
    const target = rec.targetPercentage || 75;
    const isSafe = percentage >= target;
    const isPending = state.pendingAttendanceIds.has(rec.id);

    return `
      <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1; padding-right: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge ${isSafe ? 'badge-green' : 'badge-orange'}">${percentage}%</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">Target: ${target}%</span>
          </div>
          <h4 style="font-size: 0.95rem; margin-top: 6px; font-weight: 600;">${escapeHtml(rec.subject)}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
            ${rec.attendedClasses} of ${rec.totalClasses} classes attended
          </p>
          <div class="progress-container" style="margin-top: 8px;">
            <div class="progress-bar ${isSafe ? 'safe' : 'warning'}" style="width: ${Math.min(percentage, 100)}%;"></div>
          </div>
        </div>
        <div class="step-btn-group">
          <button 
            type="button" 
            class="step-btn ${isPending ? 'disabled' : ''}" 
            data-id="${rec.id}" 
            data-step="minus" 
            ${isPending ? 'disabled' : ''} 
            title="Log Missed Class"
            aria-label="Log Missed Class"
          >−</button>
          <button 
            type="button" 
            class="step-btn ${isPending ? 'disabled' : ''}" 
            data-id="${rec.id}" 
            data-step="plus" 
            ${isPending ? 'disabled' : ''} 
            title="Log Attended Class"
            aria-label="Log Attended Class"
          >+</button>
        </div>
      </div>
    `;
  }).join('');
}
