// CampusHub Application Module
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadUserProfile();
  loadHomeOverview();
  loadPlannerData();
  loadMarketplaceData();
  loadLostFoundData();
  registerServiceWorker();
});

// Register Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[CampusHub] SW Registered successfully:', reg.scope))
      .catch(err => console.warn('[CampusHub] SW Registration failed:', err));
  }
}

// 1. Navigation Controller
function initNavigation() {
  const dockItems = document.querySelectorAll('.dock-item');
  const viewSections = document.querySelectorAll('.view-section');

  dockItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      
      dockItems.forEach(i => i.classList.remove('active'));
      viewSections.forEach(v => v.classList.remove('active'));

      item.classList.add('active');
      const activeSection = document.getElementById(`${targetView}-view`);
      if (activeSection) {
        activeSection.classList.add('active');
      }
    });
  });
}

// 2. Fetch Active User Profile: GET /api/user
async function loadUserProfile() {
  try {
    const res = await fetch('/api/user');
    if (!res.ok) throw new Error('User API request failed');
    const user = await res.json();
    
    document.getElementById('user-name').textContent = user.name || 'John Doe';
    if (user.avatarUrl) {
      document.getElementById('user-avatar').src = user.avatarUrl;
    }
  } catch (err) {
    console.warn('[CampusHub] Using fallback user profile:', err);
    document.getElementById('user-name').textContent = 'John Doe';
  }
}

// 3. Load Home View Overview
async function loadHomeOverview() {
  const summaryContainer = document.getElementById('home-summary');
  if (!summaryContainer) return;

  try {
    const [timetableRes, attendanceRes] = await Promise.all([
      fetch('/api/timetable'),
      fetch('/api/attendance')
    ]);

    const timetable = await timetableRes.json();
    const attendance = await attendanceRes.json();

    const nextClass = timetable[0] || { subject: 'No upcoming classes', room: 'N/A', startTime: '--:--' };
    const avgAttendance = attendance.length 
      ? Math.round(attendance.reduce((acc, curr) => acc + curr.percentage, 0) / attendance.length) 
      : 85;

    summaryContainer.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <span class="badge badge-blue">Next Class</span>
          <h3 style="margin-top: 8px; font-size: 1.05rem;">${escapeHtml(nextClass.subject)}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">📍 ${escapeHtml(nextClass.room)} • ${escapeHtml(nextClass.startTime)}</p>
        </div>
        <div class="card">
          <span class="badge badge-green">Avg Attendance</span>
          <h3 style="margin-top: 8px; font-size: 1.4rem; color: #10B981;">${avgAttendance}%</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">🎯 Target: 75%</p>
        </div>
      </div>
    `;
  } catch (err) {
    console.warn('[CampusHub] Error rendering home summary:', err);
  }
}

// 4. Load Planner Data: GET /api/timetable & GET /api/attendance
async function loadPlannerData() {
  const timetableList = document.getElementById('timetable-list');
  const attendanceList = document.getElementById('attendance-list');

  try {
    const [tRes, aRes] = await Promise.all([fetch('/api/timetable'), fetch('/api/attendance')]);
    const timetable = await tRes.json();
    const attendance = await aRes.json();

    if (timetableList) {
      timetableList.innerHTML = timetable.map(item => `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span class="badge badge-blue">${escapeHtml(item.dayOfWeek)}</span>
            <h4 style="font-size: 1rem; margin-top: 4px;">${escapeHtml(item.subject)}</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">📍 ${escapeHtml(item.room)} • 👨‍🏫 ${escapeHtml(item.instructor)}</p>
          </div>
          <div style="text-align: right; font-weight: 600; font-size: 0.9rem; color: var(--accent-color);">
            ${escapeHtml(item.startTime)} - ${escapeHtml(item.endTime)}
          </div>
        </div>
      `).join('');
    }

    if (attendanceList) {
      renderAttendanceList(attendanceList, attendance);
    }
  } catch (err) {
    console.warn('[CampusHub] Error loading planner data:', err);
  }
}

function renderAttendanceList(container, attendance) {
  container.innerHTML = attendance.map(item => {
    const isSafe = item.percentage >= item.targetPercentage;
    return `
      <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="badge ${isSafe ? 'badge-green' : 'badge-orange'}">${item.percentage}% Attended</span>
          <h4 style="font-size: 0.95rem; margin-top: 4px;">${escapeHtml(item.subject)}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">${item.attendedClasses} / ${item.totalClasses} classes</p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="step-btn" onclick="stepAttendance(${item.id}, false)">-</button>
          <button class="step-btn" onclick="stepAttendance(${item.id}, true)">+</button>
        </div>
      </div>
    `;
  }).join('');
}

// Step Attendance: POST /api/attendance/step
async function stepAttendance(id, attended) {
  try {
    const res = await fetch('/api/attendance/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, attended })
    });
    if (res.ok) {
      loadPlannerData();
      loadHomeOverview();
    }
  } catch (err) {
    console.error('[CampusHub] Failed to step attendance:', err);
  }
}

// 5. Load Marketplace Items: GET /api/marketplace
async function loadMarketplaceData() {
  const container = document.getElementById('marketplace-list');
  if (!container) return;

  try {
    const res = await fetch('/api/marketplace');
    const items = await res.json();

    container.innerHTML = items.map(item => `
      <div class="card media-card">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span class="badge badge-blue">${escapeHtml(item.category)}</span>
            <h4 style="font-size: 1rem; margin-top: 4px;">${escapeHtml(item.title)}</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(item.description)}</p>
          </div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #10B981;">
            $${item.price}
          </div>
        </div>
        <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 8px;">
          <span style="font-size: 0.75rem; color: var(--text-secondary);">Seller: ${escapeHtml(item.sellerName)}</span>
          <button class="btn" style="padding: 4px 12px; font-size: 0.75rem;">Contact Seller</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.warn('[CampusHub] Error loading marketplace:', err);
  }
}

// 6. Load Lost & Found Items: GET /api/lostfound
async function loadLostFoundData() {
  const container = document.getElementById('lostfound-list');
  if (!container) return;

  try {
    const res = await fetch('/api/lostfound');
    const items = await res.json();

    container.innerHTML = items.map(item => `
      <div class="card media-card">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div>
          <span class="badge ${item.type === 'LOST' ? 'badge-orange' : 'badge-green'}">${escapeHtml(item.type)}</span>
          <span class="badge" style="margin-left: 6px;">${escapeHtml(item.status)}</span>
          <h4 style="font-size: 1rem; margin-top: 4px;">${escapeHtml(item.title)}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(item.description)}</p>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">📍 ${escapeHtml(item.location)} • 📅 ${escapeHtml(item.dateReported)}</p>
        </div>
        <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 8px;">
          <span style="font-size: 0.75rem; color: var(--text-secondary);">Reporter: ${escapeHtml(item.reporterName)}</span>
          ${item.status === 'OPEN' ? `<button class="btn btn-secondary" onclick="claimItem(${item.id})">Claim / Resolve</button>` : `<span style="font-size: 0.75rem; color: #10B981; font-weight: 600;">Resolved</span>`}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.warn('[CampusHub] Error loading lost & found:', err);
  }
}

// Claim Item: POST /api/lostfound/claim
async function claimItem(id) {
  try {
    const res = await fetch('/api/lostfound/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'CLAIMED' })
    });
    if (res.ok) {
      loadLostFoundData();
    }
  } catch (err) {
    console.error('[CampusHub] Error claiming item:', err);
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, match => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return map[match];
  });
}
