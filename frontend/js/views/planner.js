/**
 * Planner View Module (Timetable & Attendance Stepper)
 * Strictly Mobile-First with touch-optimized targets (min 44x44px),
 * horizontal snap-scrolling timetable schedule, and dynamic threshold borders.
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
    <div class="section-header">
      <div>
        <h2 class="section-title">Course Timetable</h2>
        <div class="section-subtitle">Weekly class schedule & lecture halls</div>
      </div>
      <button type="button" id="add-class-btn" class="btn btn-sm">+ Add Class</button>
    </div>

    <!-- Weekday Filter Chips (Mon - Sat) -->
    <div class="filter-bar" id="timetable-filter-bar" role="tablist" aria-label="Filter schedule by weekday">
      <button type="button" class="filter-pill active" data-day="ALL" role="tab" aria-selected="true">All Days</button>
      <button type="button" class="filter-pill" data-day="MONDAY" role="tab" aria-selected="false">Mon</button>
      <button type="button" class="filter-pill" data-day="TUESDAY" role="tab" aria-selected="false">Tue</button>
      <button type="button" class="filter-pill" data-day="WEDNESDAY" role="tab" aria-selected="false">Wed</button>
      <button type="button" class="filter-pill" data-day="THURSDAY" role="tab" aria-selected="false">Thu</button>
      <button type="button" class="filter-pill" data-day="FRIDAY" role="tab" aria-selected="false">Fri</button>
      <button type="button" class="filter-pill" data-day="SATURDAY" role="tab" aria-selected="false">Sat</button>
    </div>

    <!-- Horizontal Snap-Scroll Timetable Cards Container -->
    <div id="timetable-list-container" class="schedule-scroll-container" aria-live="polite">
      <!-- Dynamic Timetable Cards -->
    </div>

    <!-- Attendance Section -->
    <div class="section-header" style="margin-top: 32px;">
      <div>
        <h2 class="section-title">Attendance Tracker</h2>
        <div class="section-subtitle">Tap touch-steppers (+/-) to record class presence</div>
      </div>
    </div>

    <!-- Attendance Grid with Touch Steppers -->
    <div id="attendance-list-container" class="attendance-grid" aria-live="polite">
      <!-- Dynamic Attendance Cards -->
    </div>

    <!-- Modal Dialog: Add Class -->
    <div id="add-class-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-class-modal-title">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 class="modal-title" id="add-class-modal-title">Add Timetable Class</h3>
          <button type="button" class="modal-close-btn" id="close-class-modal-btn" aria-label="Close modal">✕</button>
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
              <option value="SATURDAY">Saturday</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="class-subject">Subject Title</label>
            <input type="text" id="class-subject" class="form-input" placeholder="e.g. Distributed Systems & Cloud Computing" required maxlength="80">
          </div>
          <div class="form-group">
            <label class="form-label" for="class-room">Room / Lecture Hall</label>
            <input type="text" id="class-room" class="form-input" placeholder="e.g. Science Complex Hall B" required maxlength="40">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
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

export function render(state) {
  if (!viewContainer) return;

  const timetableContainer = viewContainer.querySelector('#timetable-list-container');
  const attendanceContainer = viewContainer.querySelector('#attendance-list-container');

  // 1. Render Timetable Schedule Cards
  if (timetableContainer) {
    const timetable = state.timetable || [];
    const filteredTimetable = activeDayFilter === 'ALL'
      ? timetable
      : timetable.filter((item) => (item.dayOfWeek || '').toUpperCase() === activeDayFilter);

    if (filteredTimetable.length === 0) {
      timetableContainer.innerHTML = `
        <div style="width: 100%; text-align: center; padding: 36px 16px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📅</span>
          <strong>No classes scheduled for this day</strong>
          <p style="font-size: 0.85rem; margin-top: 4px;">Tap "+ Add Class" above to create an entry.</p>
        </div>
      `;
    } else {
      timetableContainer.innerHTML = filteredTimetable.map((item) => `
        <article class="timetable-card" tabindex="0">
          <div class="timetable-header">
            <h3 class="timetable-subject">${escapeHtml(item.subject)}</h3>
            <span class="timetable-time-pill">${escapeHtml(item.startTime)} - ${escapeHtml(item.endTime)}</span>
          </div>
          <div class="timetable-meta">
            <div class="timetable-meta-item">
              <span>🏛️</span>
              <strong>${escapeHtml(item.room || 'TBD')}</strong>
            </div>
            <div class="timetable-meta-item">
              <span>👨‍🏫</span>
              <span>${escapeHtml(item.instructor || 'Staff')}</span>
            </div>
            <div class="timetable-meta-item" style="margin-top: 4px;">
              <span class="role-pill" style="font-size: 0.7rem;">${escapeHtml(item.dayOfWeek)}</span>
            </div>
          </div>
        </article>
      `).join('');
    }
  }

  // 2. Render Attendance Cards with 44x44px Steppers
  if (attendanceContainer) {
    const attendance = state.attendance || [];
    const pendingIds = state.pendingAttendanceIds || new Set();

    if (attendance.length === 0) {
      attendanceContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 36px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📊</span>
          <strong>No attendance records registered</strong>
        </div>
      `;
    } else {
      attendanceContainer.innerHTML = attendance.map((rec) => {
        const total = rec.totalClasses || 0;
        const attended = rec.attendedClasses || 0;
        const percentage = computePercentage(attended, total);
        const target = rec.targetPercentage || 75.0;
        const isLow = percentage < target;
        const isPending = pendingIds.has(rec.id);

        return `
          <article class="attendance-card ${isLow ? 'danger' : 'safe'}" data-id="${rec.id}">
            <div class="attendance-card-header">
              <h3 class="attendance-subject">${escapeHtml(rec.subject)}</h3>
              <span class="attendance-pill ${isLow ? 'danger' : 'safe'}" title="Target: ${target}%">
                ${isLow ? '⚠️ ' : '✓ '}${percentage}%
              </span>
            </div>

            <!-- Progress Track -->
            <div class="attendance-progress-track">
              <div class="attendance-progress-fill ${isLow ? 'danger' : 'safe'}" style="width: ${Math.min(100, Math.max(0, percentage))}%"></div>
            </div>

            <!-- Stepper Row -->
            <div class="attendance-stepper-row">
              <div>
                <div class="attendance-ratio">${attended} / ${total} Classes</div>
                <div class="attendance-ratio-sub">Target: ${target}% • ${isLow ? 'Action required' : 'On track'}</div>
              </div>

              <!-- 44x44px Minimum Touch Steppers -->
              <div class="stepper-controls">
                <button type="button" class="stepper-btn attendance-step-btn" 
                  data-id="${rec.id}" 
                  data-attended="false" 
                  ${isPending ? 'disabled' : ''}
                  aria-label="Log class missed for ${escapeHtml(rec.subject)}"
                  title="Mark Missed (+1 Total, +0 Attended)">
                  -
                </button>
                <button type="button" class="stepper-btn attendance-step-btn" 
                  data-id="${rec.id}" 
                  data-attended="true" 
                  ${isPending ? 'disabled' : ''}
                  aria-label="Log class attended for ${escapeHtml(rec.subject)}"
                  title="Mark Attended (+1 Total, +1 Attended)">
                  +
                </button>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }
  }
}

function bindEvents() {
  if (!viewContainer) return;

  // 1. Weekday Filter Pills
  const filterBar = viewContainer.querySelector('#timetable-filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;

      filterBar.querySelectorAll('.filter-pill').forEach((p) => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeDayFilter = btn.getAttribute('data-day') || 'ALL';
      render(store.getState());
    });
  }

  // 2. Stepper Button Event Delegation (+ / -)
  const attendanceList = viewContainer.querySelector('#attendance-list-container');
  if (attendanceList) {
    attendanceList.addEventListener('click', async (e) => {
      const btn = e.target.closest('.attendance-step-btn');
      if (!btn || btn.hasAttribute('disabled')) return;

      const recordId = parseInt(btn.getAttribute('data-id'), 10);
      const attended = btn.getAttribute('data-attended') === 'true';

      if (!recordId) return;

      // Optimistic step update
      const rollback = store.optimisticStepAttendance(recordId, attended);

      try {
        const serverRecord = await api.stepAttendance(recordId, attended);
        store.reconcileStepAttendance(recordId, serverRecord);
        showToast(attended ? 'Class attended logged! 📈' : 'Class absent logged 📉', 'info');
      } catch (err) {
        console.error('Failed to log attendance step:', err);
        rollback();
        showToast('Failed to record attendance. Please try again.', 'error');
      }
    });
  }

  // 3. Modal Controls: Add Class
  const modal = viewContainer.querySelector('#add-class-modal');
  const openBtn = viewContainer.querySelector('#add-class-btn');
  const closeBtn = viewContainer.querySelector('#close-class-modal-btn');
  const cancelBtn = viewContainer.querySelector('#cancel-class-modal-btn');
  const form = viewContainer.querySelector('#add-class-form');

  const openModal = () => modal?.classList.add('open');
  const closeModal = () => {
    modal?.classList.remove('open');
    form?.reset();
  };

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentUser = store.getState().currentUser;

    const payload = {
      userId: currentUser?.id || 2,
      dayOfWeek: viewContainer.querySelector('#class-day').value,
      subject: viewContainer.querySelector('#class-subject').value.trim(),
      room: viewContainer.querySelector('#class-room').value.trim(),
      startTime: viewContainer.querySelector('#class-start').value,
      endTime: viewContainer.querySelector('#class-end').value,
      instructor: viewContainer.querySelector('#class-instructor').value.trim()
    };

    const submitBtn = viewContainer.querySelector('#submit-class-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const created = await api.createTimetableEntry(payload);
      store.addTimetableEntry({
        ...payload,
        id: created?.id || Date.now()
      });
      showToast('New class successfully added to schedule!', 'success');
      closeModal();
    } catch (err) {
      console.error('Failed to create timetable entry:', err);
      showToast('Failed to add class. Please check inputs.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
