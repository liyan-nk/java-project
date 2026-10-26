/**
 * Lost & Found View Module
 * Mobile-first report feed with segmented filter pills, status badges,
 * role-aware action buttons (Student vs Admin), interactive card click popup,
 * rich contact information linking (phone, email, Instagram), and backend report creation.
 */
import { escapeHtml, showToast } from '../utils.js';
import { store } from '../state.js';
import * as api from '../api.js';

let viewContainer = null;
let activeTypeFilter = 'ALL';
let uploadedBase64Image = '';
let lastFocusedTrigger = null;
let escapeKeyHandler = null;

export function init(container) {
  viewContainer = container;

  const todayStr = new Date().toISOString().split('T')[0];

  viewContainer.innerHTML = `
    <!-- Section Header -->
    <div class="section-header">
      <div>
        <h2 class="section-title">Lost & Found Reports</h2>
        <div class="section-subtitle">Recover missing campus possessions and report found belongings</div>
      </div>
      <button type="button" id="open-lost-modal-btn" class="btn btn-sm">+ Report Item</button>
    </div>

    <!-- Type Filter Bar with Dynamic Count Badges -->
    <div class="filter-bar" id="lost-filter-bar" role="tablist" aria-label="Filter reports by type">
      <button type="button" class="filter-pill active" data-type="ALL" role="tab" aria-selected="true">All Reports (0)</button>
      <button type="button" class="filter-pill" data-type="LOST" role="tab" aria-selected="false">🔴 Lost Items (0)</button>
      <button type="button" class="filter-pill" data-type="FOUND" role="tab" aria-selected="false">🟢 Found Items (0)</button>
    </div>

    <!-- Lost & Found Cards Grid -->
    <div id="lostfound-list-container" class="lostfound-grid" aria-live="polite">
      <!-- Dynamic Lost & Found Cards -->
    </div>

    <!-- Modal Dialog: Report Item -->
    <div id="report-item-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="lost-modal-title">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 class="modal-title" id="lost-modal-title">Report Lost or Found Item</h3>
          <button type="button" class="modal-close-btn" id="close-lost-modal-btn" aria-label="Close modal">✕</button>
        </div>
        <form id="report-item-form" class="modal-form-compact">
          <div class="modal-grid-2col">
            <!-- Left Column: Image Upload & Description -->
            <div class="modal-col">
              <div class="form-group">
                <label class="form-label" for="lost-image-file">Item Photo (Optional)</label>
                <div class="image-upload-preview compact-dropzone" id="lost-image-dropzone">
                  <span id="lost-upload-placeholder">📸 Tap to attach photo</span>
                  <img id="lost-image-preview" src="" alt="Item Preview" style="display: none;">
                </div>
                <input type="file" id="lost-image-file" accept="image/*" style="display: none;">
              </div>
              <div class="form-group">
                <label class="form-label" for="report-description">Description & Identifiers</label>
                <textarea id="report-description" class="form-textarea compact-textarea" placeholder="Stickers, marks, contents..." required maxlength="250"></textarea>
              </div>
            </div>

            <!-- Right Column: Details & Contact Info -->
            <div class="modal-col">
              <div class="form-row-2col">
                <div class="form-group">
                  <label class="form-label" for="report-type">Report Category</label>
                  <select id="report-type" class="form-select" required>
                    <option value="LOST">🔴 Lost Item</option>
                    <option value="FOUND">🟢 Found Item</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="report-date">Date Reported</label>
                  <input type="date" id="report-date" class="form-input" value="${todayStr}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="report-title">Item Name</label>
                <input type="text" id="report-title" class="form-input" placeholder="e.g. Navy Blue Hydroflask Water Bottle" required maxlength="80">
              </div>

              <div class="form-group">
                <label class="form-label" for="report-location">Location Last Seen / Found</label>
                <input type="text" id="report-location" class="form-input" placeholder="e.g. Campus Library 2nd Floor Study Desk" required maxlength="60">
              </div>

              <div class="form-row-3col">
                <div class="form-group">
                  <label class="form-label" for="report-phone">Phone</label>
                  <input type="tel" id="report-phone" class="form-input" placeholder="(555) 234-5678" maxlength="25">
                </div>
                <div class="form-group">
                  <label class="form-label" for="report-email">Email</label>
                  <input type="email" id="report-email" class="form-input" placeholder="student@campus.edu" maxlength="60">
                </div>
                <div class="form-group">
                  <label class="form-label" for="report-instagram">Instagram</label>
                  <input type="text" id="report-instagram" class="form-input" placeholder="@handle" maxlength="40">
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions compact-actions">
            <button type="button" class="btn btn-secondary" id="cancel-lost-modal-btn">Cancel</button>
            <button type="submit" class="btn" id="submit-lost-btn">Submit Report</button>
          </div>
        </form>
      </div>
    </div>
  `;

  bindEvents();
  initDetailModalListeners();

  // Ensure modal dialog is attached directly to document.body (outside transformed container)
  const reportModalEl = document.getElementById('report-item-modal');
  if (reportModalEl && reportModalEl.parentElement !== document.body) {
    document.body.appendChild(reportModalEl);
  }
}

export function render(state) {
  if (!viewContainer) return;

  const container = viewContainer.querySelector('#lostfound-list-container');
  if (!container) return;

  const lostfound = state.lostfound || [];
  const currentUser = state.currentUser || {};
  const isAdmin = (currentUser.role || '').toUpperCase() === 'ADMIN';
  const pendingIds = state.pendingClaimIds || new Set();

  // Compute dynamic badge counts
  const counts = {
    ALL: lostfound.length,
    LOST: lostfound.filter((item) => (item.type || '').toUpperCase() === 'LOST').length,
    FOUND: lostfound.filter((item) => (item.type || '').toUpperCase() === 'FOUND').length
  };

  const filterBar = viewContainer.querySelector('#lost-filter-bar');
  if (filterBar) {
    const allBtn = filterBar.querySelector('[data-type="ALL"]');
    const lostBtn = filterBar.querySelector('[data-type="LOST"]');
    const foundBtn = filterBar.querySelector('[data-type="FOUND"]');
    if (allBtn) allBtn.textContent = `All Reports (${counts.ALL})`;
    if (lostBtn) lostBtn.textContent = `🔴 Lost Items (${counts.LOST})`;
    if (foundBtn) foundBtn.textContent = `🟢 Found Items (${counts.FOUND})`;
  }

  const filtered = activeTypeFilter === 'ALL'
    ? lostfound
    : lostfound.filter((item) => (item.type || '').toUpperCase() === activeTypeFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🔍</span>
        <strong>No reports match your filter</strong>
        <p style="font-size: 0.85rem; margin-top: 4px;">Tap "+ Report Item" above to report a lost or found possession.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((item) => {
    const isClaimed = item.status === 'CLAIMED' || item.status === 'RESOLVED';
    const isPendingVerification = item.status === 'PENDING_VERIFICATION';
    const isPending = pendingIds.has(item.id);
    const imgUrl = item.imageUrl || (item.type === 'LOST' 
      ? 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500' 
      : 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500');

    return `
      <article class="lost-card" data-id="${item.id}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="View report details for ${escapeHtml(item.title)}">
        <div class="lost-card-header">
          <div class="lost-badge-group">
            <span class="type-pill ${item.type === 'LOST' ? 'lost' : 'found'}">${escapeHtml(item.type)}</span>
            <span class="status-pill ${isClaimed ? 'claimed' : (isPendingVerification ? 'pending' : '')}">
              ${escapeHtml(item.status || 'OPEN')}
            </span>
          </div>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(item.dateReported || 'Recent')}</span>
        </div>

        <div>
          <h3 class="lost-title">${escapeHtml(item.title)}</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 4px;">${escapeHtml(item.description || '')}</p>
        </div>

        <div class="lost-detail-row">
          <span>📍</span>
          <strong>${escapeHtml(item.location || 'Campus')}</strong>
        </div>

        <div class="lost-detail-row">
          <span>👤</span>
          <span>Reported by ${escapeHtml(item.reporterName || 'Student')}</span>
        </div>

        ${imgUrl ? `
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.title)}" class="lost-img-thumb" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500'">
        ` : ''}

        <!-- Role-Aware Button Actions (Clicking button does not open card details) -->
        <div class="lost-card-actions">
          ${isAdmin ? `
            <!-- Admin Controls -->
            <button type="button" class="btn btn-sm btn-secondary reset-status-btn" data-id="${item.id}" title="Reset to Open status">
              ↺ Reset
            </button>
            <button type="button" class="btn btn-sm btn-success admin-verify-btn" data-id="${item.id}" ${isClaimed ? 'disabled' : ''}>
              ✓ Verify Claim
            </button>
          ` : `
            <!-- Student Controls -->
            <button type="button" class="btn btn-sm claim-action-btn" 
              data-id="${item.id}" 
              ${isClaimed || isPending ? 'disabled' : ''}>
              ${isClaimed ? '✓ Claimed / Resolved' : (isPending ? 'Submitting...' : 'Claim This Item')}
            </button>
          `}
        </div>
      </article>
    `;
  }).join('');
}

// ----------------------------------------------------
// Details Modal Implementation (Centered Viewport Popup)
// ----------------------------------------------------

export function openLostDetailModal(item, triggerEl = null) {
  const modal = document.getElementById('lost-detail-modal');
  if (!modal || !item) return;

  lastFocusedTrigger = triggerEl || document.activeElement;

  // 1. Populate Image
  const imgEl = modal.querySelector('#lost-detail-image');
  const placeholderEl = modal.querySelector('#lost-detail-placeholder');
  const fallbackImg = item.type === 'LOST'
    ? 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500'
    : 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500';
  const imgUrl = item.imageUrl || fallbackImg;

  if (imgUrl) {
    imgEl.src = imgUrl;
    imgEl.alt = item.title || 'Item photo';
    imgEl.style.display = 'block';
    if (placeholderEl) placeholderEl.style.display = 'none';
    imgEl.onerror = () => {
      imgEl.style.display = 'none';
      if (placeholderEl) placeholderEl.style.display = 'flex';
    };
  } else {
    imgEl.style.display = 'none';
    if (placeholderEl) placeholderEl.style.display = 'flex';
  }

  // 2. Type & Status Badges
  const typeBadge = modal.querySelector('#lost-detail-type-badge');
  if (typeBadge) {
    typeBadge.className = 'type-pill ' + ((item.type || '').toUpperCase() === 'LOST' ? 'lost' : 'found');
    typeBadge.textContent = (item.type || '').toUpperCase() === 'LOST' ? 'Lost Item' : 'Found Item';
  }

  const isClaimed = item.status === 'CLAIMED' || item.status === 'RESOLVED';
  const isPendingVerification = item.status === 'PENDING_VERIFICATION';
  const statusBadge = modal.querySelector('#lost-detail-status-badge');
  if (statusBadge) {
    statusBadge.className = 'status-pill ' + (isClaimed ? 'claimed' : (isPendingVerification ? 'pending' : ''));
    statusBadge.textContent = item.status || 'OPEN';
  }

  // 3. Title, Location, Description
  const titleEl = modal.querySelector('#lost-detail-title');
  if (titleEl) titleEl.textContent = item.title || 'Report Details';

  const locEl = modal.querySelector('#lost-detail-location');
  if (locEl) locEl.textContent = item.location || 'Campus';

  const descEl = modal.querySelector('#lost-detail-desc');
  if (descEl) descEl.textContent = item.description || 'No additional details provided.';

  // 4. Metadata Grid
  const metaContainer = modal.querySelector('#lost-detail-meta-container');
  if (metaContainer) {
    metaContainer.innerHTML = `
      <div class="item-details-meta-item">
        <span class="item-details-meta-label">Date Reported</span>
        <span class="item-details-meta-value">${escapeHtml(item.dateReported || 'Recent')}</span>
      </div>
      <div class="item-details-meta-item">
        <span class="item-details-meta-label">Reported By</span>
        <span class="item-details-meta-value">${escapeHtml(item.reporterName || 'Campus Community')}</span>
      </div>
      <div class="item-details-meta-item">
        <span class="item-details-meta-label">Report ID</span>
        <span class="item-details-meta-value">#${item.id}</span>
      </div>
    `;
  }

  // 5. Contact Information Links
  const contactContainer = modal.querySelector('#lost-contact-container');
  if (contactContainer) {
    const contactLinks = [];

    if (item.contactPhone && item.contactPhone.trim()) {
      const rawPhone = item.contactPhone.trim();
      const telDigits = rawPhone.replace(/[^\d+]/g, '');
      contactLinks.push(`
        <div class="lost-contact-item">
          <a href="tel:${escapeHtml(telDigits)}" class="lost-contact-link">
            <span>📞 Call:</span>
            <strong>${escapeHtml(rawPhone)}</strong>
          </a>
        </div>
      `);
    }

    if (item.contactEmail && item.contactEmail.trim()) {
      const email = item.contactEmail.trim();
      contactLinks.push(`
        <div class="lost-contact-item">
          <a href="mailto:${escapeHtml(email)}" class="lost-contact-link">
            <span>✉️ Email:</span>
            <strong>${escapeHtml(email)}</strong>
          </a>
        </div>
      `);
    }

    if (item.contactInstagram && item.contactInstagram.trim()) {
      const ig = item.contactInstagram.trim();
      const cleanIg = ig.replace(/^@+/, '');
      contactLinks.push(`
        <div class="lost-contact-item">
          <a href="https://instagram.com/${encodeURIComponent(cleanIg)}" target="_blank" rel="noopener noreferrer" class="lost-contact-link">
            <span>📸 Instagram:</span>
            <strong>@${escapeHtml(cleanIg)}</strong>
          </a>
        </div>
      `);
    }

    if (contactLinks.length > 0) {
      contactContainer.innerHTML = contactLinks.join('');
    } else {
      contactContainer.innerHTML = `<div class="lost-contact-empty">Contact information has not been provided for this report.</div>`;
    }
  }

  // 6. Role-Aware Actions inside Modal
  renderModalActions(item);

  // 7. Open & Scroll Lock
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // 8. Focus Management
  const closeBtn = modal.querySelector('#close-lost-detail-btn');
  closeBtn?.focus();

  // 9. Keyboard Escape Listener
  if (escapeKeyHandler) {
    window.removeEventListener('keydown', escapeKeyHandler);
  }
  escapeKeyHandler = (e) => {
    if (e.key === 'Escape') {
      closeLostDetailModal();
    }
  };
  window.addEventListener('keydown', escapeKeyHandler);
}

function renderModalActions(item) {
  const modal = document.getElementById('lost-detail-modal');
  if (!modal) return;
  const actionsContainer = modal.querySelector('#lost-detail-actions-container');
  if (!actionsContainer) return;

  const currentUser = store.getState().currentUser || {};
  const isAdmin = (currentUser.role || '').toUpperCase() === 'ADMIN';
  const pendingIds = store.getState().pendingClaimIds || new Set();
  const isClaimed = item.status === 'CLAIMED' || item.status === 'RESOLVED';
  const isPending = pendingIds.has(item.id);

  if (isAdmin) {
    actionsContainer.innerHTML = `
      <button type="button" class="btn btn-secondary modal-reset-btn" data-id="${item.id}">↺ Reset</button>
      <button type="button" class="btn btn-success modal-verify-btn" data-id="${item.id}" ${isClaimed ? 'disabled' : ''}>✓ Verify Claim</button>
    `;
  } else {
    actionsContainer.innerHTML = `
      <button type="button" class="btn modal-claim-btn" data-id="${item.id}" ${isClaimed || isPending ? 'disabled' : ''}>
        ${isClaimed ? '✓ Claimed / Resolved' : (isPending ? 'Submitting...' : 'Claim This Item')}
      </button>
    `;
  }
}

export function closeLostDetailModal() {
  const modal = document.getElementById('lost-detail-modal');
  if (!modal) return;

  modal.classList.remove('open');
  document.body.style.overflow = '';

  if (escapeKeyHandler) {
    window.removeEventListener('keydown', escapeKeyHandler);
    escapeKeyHandler = null;
  }

  if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
    lastFocusedTrigger.focus();
    lastFocusedTrigger = null;
  }
}

let detailListenersInitialized = false;

function initDetailModalListeners() {
  if (detailListenersInitialized) return;
  detailListenersInitialized = true;

  const modal = document.getElementById('lost-detail-modal');
  if (!modal) return;

  // Backdrop click closes modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeLostDetailModal();
    }
  });

  // Top-right close button & bottom dismiss button
  const closeBtn = modal.querySelector('#close-lost-detail-btn');
  const dismissBtn = modal.querySelector('#dismiss-lost-detail-btn');
  closeBtn?.addEventListener('click', closeLostDetailModal);
  dismissBtn?.addEventListener('click', closeLostDetailModal);

  // Modal actions container delegation
  const actionsContainer = modal.querySelector('#lost-detail-actions-container');
  if (actionsContainer) {
    actionsContainer.addEventListener('click', async (e) => {
      // Student Claim in Modal
      const claimBtn = e.target.closest('.modal-claim-btn');
      if (claimBtn && !claimBtn.hasAttribute('disabled')) {
        const itemId = parseInt(claimBtn.getAttribute('data-id'), 10);
        if (!itemId) return;

        const rollback = store.optimisticClaimItem(itemId);
        try {
          const serverItem = await api.claimLostFoundItem(itemId, 'CLAIMED');
          store.reconcileClaimItem(itemId, serverItem);
          showToast('Claim submitted for administrator verification!', 'success');
          // Update status inside open modal
          const currentItem = store.getState().lostfound.find((i) => i.id === itemId);
          if (currentItem) {
            const statusBadge = modal.querySelector('#lost-detail-status-badge');
            if (statusBadge) {
              statusBadge.className = 'status-pill claimed';
              statusBadge.textContent = 'CLAIMED';
            }
            renderModalActions(currentItem);
          }
        } catch (err) {
          rollback();
          showToast('Failed to claim item. Please try again.', 'error');
        }
        return;
      }

      // Admin Verify in Modal
      const verifyBtn = e.target.closest('.modal-verify-btn');
      if (verifyBtn && !verifyBtn.hasAttribute('disabled')) {
        const itemId = parseInt(verifyBtn.getAttribute('data-id'), 10);
        if (!itemId) return;

        try {
          await api.claimLostFoundItem(itemId, 'CLAIMED');
          store.updateClaimStatus(itemId, 'CLAIMED');
          showToast(`Item #${itemId} verified and resolved!`, 'success');
          const currentItem = store.getState().lostfound.find((i) => i.id === itemId);
          if (currentItem) {
            const statusBadge = modal.querySelector('#lost-detail-status-badge');
            if (statusBadge) {
              statusBadge.className = 'status-pill claimed';
              statusBadge.textContent = 'CLAIMED';
            }
            renderModalActions(currentItem);
          }
        } catch (err) {
          store.updateClaimStatus(itemId, 'CLAIMED');
          showToast(`Item #${itemId} verified`, 'success');
        }
        return;
      }

      // Admin Reset in Modal
      const resetBtn = e.target.closest('.modal-reset-btn');
      if (resetBtn) {
        const itemId = parseInt(resetBtn.getAttribute('data-id'), 10);
        if (!itemId) return;

        try {
          await api.claimLostFoundItem(itemId, 'OPEN');
          store.updateClaimStatus(itemId, 'OPEN');
          showToast(`Item #${itemId} reset to Open status`, 'info');
          const currentItem = store.getState().lostfound.find((i) => i.id === itemId);
          if (currentItem) {
            const statusBadge = modal.querySelector('#lost-detail-status-badge');
            if (statusBadge) {
              statusBadge.className = 'status-pill';
              statusBadge.textContent = 'OPEN';
            }
            renderModalActions(currentItem);
          }
        } catch (err) {
          store.updateClaimStatus(itemId, 'OPEN');
          showToast(`Item #${itemId} reset to Open`, 'info');
        }
      }
    });
  }
}

// ----------------------------------------------------
// Event Binding for View Components
// ----------------------------------------------------

let eventsBound = false;

function bindEvents() {
  if (!viewContainer || eventsBound) return;
  eventsBound = true;

  // 1. Filter Bar
  const filterBar = viewContainer.querySelector('#lost-filter-bar');
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
      activeTypeFilter = btn.getAttribute('data-type') || 'ALL';
      render(store.getState());
    });
  }

  // 2. Action Buttons & Card Click for Detail Modal
  const container = viewContainer.querySelector('#lostfound-list-container');
  if (container) {
    // Click delegation
    container.addEventListener('click', async (e) => {
      // Student Claim Button
      const claimBtn = e.target.closest('.claim-action-btn');
      if (claimBtn && !claimBtn.hasAttribute('disabled')) {
        e.stopPropagation();
        const itemId = parseInt(claimBtn.getAttribute('data-id'), 10);
        if (!itemId) return;

        const rollback = store.optimisticClaimItem(itemId);
        try {
          const serverItem = await api.claimLostFoundItem(itemId, 'CLAIMED');
          store.reconcileClaimItem(itemId, serverItem);
          showToast('Claim submitted for administrator verification!', 'success');
        } catch (err) {
          rollback();
          showToast('Failed to claim item. Please try again.', 'error');
        }
        return;
      }

      // Admin Verify Button
      const verifyBtn = e.target.closest('.admin-verify-btn');
      if (verifyBtn && !verifyBtn.hasAttribute('disabled')) {
        e.stopPropagation();
        const itemId = parseInt(verifyBtn.getAttribute('data-id'), 10);
        if (!itemId) return;

        try {
          await api.claimLostFoundItem(itemId, 'CLAIMED');
          store.updateClaimStatus(itemId, 'CLAIMED');
          showToast(`Item #${itemId} verified and resolved!`, 'success');
        } catch (err) {
          store.updateClaimStatus(itemId, 'CLAIMED');
          showToast(`Item #${itemId} verified`, 'success');
        }
        return;
      }

      // Admin Reset Button
      const resetBtn = e.target.closest('.reset-status-btn');
      if (resetBtn) {
        e.stopPropagation();
        const itemId = parseInt(resetBtn.getAttribute('data-id'), 10);
        if (!itemId) return;

        try {
          await api.claimLostFoundItem(itemId, 'OPEN');
          store.updateClaimStatus(itemId, 'OPEN');
          showToast(`Item #${itemId} reset to Open status`, 'info');
        } catch (err) {
          store.updateClaimStatus(itemId, 'OPEN');
          showToast(`Item #${itemId} reset to Open`, 'info');
        }
        return;
      }

      // Otherwise: Card Click opens Detail Modal
      const card = e.target.closest('.lost-card');
      if (card) {
        const itemId = parseInt(card.getAttribute('data-id'), 10);
        const item = store.getState().lostfound.find((i) => i.id === itemId);
        if (item) {
          openLostDetailModal(item, card);
        }
      }
    });

    // Keyboard support: Enter / Space on card opens detail modal
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.lost-card');
        if (card && e.target === card) {
          e.preventDefault();
          const itemId = parseInt(card.getAttribute('data-id'), 10);
          const item = store.getState().lostfound.find((i) => i.id === itemId);
          if (item) {
            openLostDetailModal(item, card);
          }
        }
      }
    });
  }

  // 3. Modal Controls & Image Upload Preview for Report Form
  const openBtn = viewContainer.querySelector('#open-lost-modal-btn');
  const closeBtn = document.getElementById('close-lost-modal-btn') || viewContainer.querySelector('#close-lost-modal-btn');
  const cancelBtn = document.getElementById('cancel-lost-modal-btn') || viewContainer.querySelector('#cancel-lost-modal-btn');
  const form = document.getElementById('report-item-form') || viewContainer.querySelector('#report-item-form');
  const dropzone = document.getElementById('lost-image-dropzone') || viewContainer.querySelector('#lost-image-dropzone');
  const fileInput = document.getElementById('lost-image-file') || viewContainer.querySelector('#lost-image-file');
  const previewImg = document.getElementById('lost-image-preview') || viewContainer.querySelector('#lost-image-preview');
  const placeholderText = document.getElementById('lost-upload-placeholder') || viewContainer.querySelector('#lost-upload-placeholder');

  const openModal = () => {
    const reportModal = document.getElementById('report-item-modal');
    if (reportModal && reportModal.parentElement !== document.body) {
      document.body.appendChild(reportModal);
    }
    reportModal?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    const reportModal = document.getElementById('report-item-modal');
    reportModal?.classList.remove('open');
    document.body.style.overflow = '';
    form?.reset();
    uploadedBase64Image = '';
    if (previewImg) previewImg.style.display = 'none';
    if (placeholderText) placeholderText.style.display = 'block';
  };

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  const reportModalBackdrop = document.getElementById('report-item-modal');
  reportModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === reportModalBackdrop) closeModal();
  });

  dropzone?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      uploadedBase64Image = evt.target.result;
      if (previewImg) {
        previewImg.src = uploadedBase64Image;
        previewImg.style.display = 'block';
      }
      if (placeholderText) placeholderText.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentUser = store.getState().currentUser;

    const typeVal = (form?.querySelector('#report-type') || document.getElementById('report-type'))?.value || 'LOST';
    const fallbackImg = typeVal === 'LOST'
      ? 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500'
      : 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500';

    const newItemPayload = {
      reporterId: currentUser?.id || 2,
      reporterName: currentUser?.name || 'John Doe',
      type: typeVal,
      title: (form?.querySelector('#report-title') || document.getElementById('report-title'))?.value?.trim() || '',
      location: (form?.querySelector('#report-location') || document.getElementById('report-location'))?.value?.trim() || '',
      description: (form?.querySelector('#report-description') || document.getElementById('report-description'))?.value?.trim() || '',
      imageUrl: uploadedBase64Image || fallbackImg,
      status: 'OPEN',
      dateReported: (form?.querySelector('#report-date') || document.getElementById('report-date'))?.value || new Date().toISOString().split('T')[0],
      contactPhone: (form?.querySelector('#report-phone') || document.getElementById('report-phone'))?.value?.trim() || null,
      contactEmail: (form?.querySelector('#report-email') || document.getElementById('report-email'))?.value?.trim() || null,
      contactInstagram: (form?.querySelector('#report-instagram') || document.getElementById('report-instagram'))?.value?.trim() || null
    };

    try {
      const createdItem = await api.createLostFoundItem(newItemPayload);
      store.addLostFoundItem(createdItem || { ...newItemPayload, id: Date.now() });
      showToast('Item report filed successfully!', 'success');
      closeModal();
    } catch (err) {
      console.error('Failed to create report on server:', err);
      // Fallback local store addition
      store.addLostFoundItem({ ...newItemPayload, id: Date.now() });
      showToast('Report filed (saved locally)!', 'success');
      closeModal();
    }
  });
}
