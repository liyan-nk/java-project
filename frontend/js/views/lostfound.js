/**
 * Lost & Found View Module
 * Mobile-first report feed with segmented filter pills, status badges,
 * role-aware action buttons (Student vs Admin), and image upload preview.
 */
import { escapeHtml, showToast } from '../utils.js';
import { store } from '../state.js';
import * as api from '../api.js';

let viewContainer = null;
let activeTypeFilter = 'ALL';
let uploadedBase64Image = '';

export function init(container) {
  viewContainer = container;

  viewContainer.innerHTML = `
    <!-- Section Header -->
    <div class="section-header">
      <div>
        <h2 class="section-title">Lost & Found Reports</h2>
        <div class="section-subtitle">Recover missing campus possessions and report found belongings</div>
      </div>
      <button type="button" id="open-lost-modal-btn" class="btn btn-sm">+ Report Item</button>
    </div>

    <!-- Type Filter Bar -->
    <div class="filter-bar" id="lost-filter-bar" role="tablist" aria-label="Filter reports by type">
      <button type="button" class="filter-pill active" data-type="ALL" role="tab" aria-selected="true">All Reports</button>
      <button type="button" class="filter-pill" data-type="LOST" role="tab" aria-selected="false">🔴 Lost Items</button>
      <button type="button" class="filter-pill" data-type="FOUND" role="tab" aria-selected="false">🟢 Found Items</button>
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
        <form id="report-item-form">
          <!-- Image Dropzone with Preview -->
          <div class="form-group">
            <label class="form-label" for="lost-image-file">Item Photo (Optional)</label>
            <div class="image-upload-preview" id="lost-image-dropzone">
              <span id="lost-upload-placeholder">📸 Tap to attach photo</span>
              <img id="lost-image-preview" src="" alt="Item Preview" style="display: none;">
            </div>
            <input type="file" id="lost-image-file" accept="image/*" style="display: none;">
          </div>

          <div class="form-group">
            <label class="form-label" for="report-type">Report Category</label>
            <select id="report-type" class="form-select" required>
              <option value="LOST">I Lost Something (Missing Item)</option>
              <option value="FOUND">I Found Something (Recovered Item)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="report-title">Item Name</label>
            <input type="text" id="report-title" class="form-input" placeholder="e.g. Navy Blue Hydroflask Water Bottle" required maxlength="80">
          </div>

          <div class="form-group">
            <label class="form-label" for="report-location">Location Last Seen / Found</label>
            <input type="text" id="report-location" class="form-input" placeholder="e.g. Campus Library 2nd Floor Study Desk" required maxlength="60">
          </div>

          <div class="form-group">
            <label class="form-label" for="report-description">Description & Identifiers</label>
            <textarea id="report-description" class="form-textarea" placeholder="Stickers, scratches, brand marks, or contents..." required maxlength="250"></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-lost-modal-btn">Cancel</button>
            <button type="submit" class="btn" id="submit-lost-btn">Submit Report</button>
          </div>
        </form>
      </div>
    </div>
  `;

  bindEvents();
}

export function render(state) {
  if (!viewContainer) return;

  const container = viewContainer.querySelector('#lostfound-list-container');
  if (!container) return;

  const lostfound = state.lostfound || [];
  const currentUser = state.currentUser || {};
  const isAdmin = (currentUser.role || '').toUpperCase() === 'ADMIN';
  const pendingIds = state.pendingClaimIds || new Set();

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
      <article class="lost-card" data-id="${item.id}" tabindex="0">
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

        <!-- Role-Aware Button Actions -->
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

function bindEvents() {
  if (!viewContainer) return;

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

  // 2. Action Buttons (Student Claim vs Admin Verify)
  const container = viewContainer.querySelector('#lostfound-list-container');
  if (container) {
    container.addEventListener('click', async (e) => {
      // Student Claim
      const claimBtn = e.target.closest('.claim-action-btn');
      if (claimBtn && !claimBtn.hasAttribute('disabled')) {
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

      // Admin Verify
      const verifyBtn = e.target.closest('.admin-verify-btn');
      if (verifyBtn && !verifyBtn.hasAttribute('disabled')) {
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

      // Admin Reset
      const resetBtn = e.target.closest('.reset-status-btn');
      if (resetBtn) {
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
      }
    });
  }

  // 3. Modal Controls & Image Upload Preview
  const modal = viewContainer.querySelector('#report-item-modal');
  const openBtn = viewContainer.querySelector('#open-lost-modal-btn');
  const closeBtn = viewContainer.querySelector('#close-lost-modal-btn');
  const cancelBtn = viewContainer.querySelector('#cancel-lost-modal-btn');
  const form = viewContainer.querySelector('#report-item-form');
  const dropzone = viewContainer.querySelector('#lost-image-dropzone');
  const fileInput = viewContainer.querySelector('#lost-image-file');
  const previewImg = viewContainer.querySelector('#lost-image-preview');
  const placeholderText = viewContainer.querySelector('#lost-upload-placeholder');

  const openModal = () => modal?.classList.add('open');
  const closeModal = () => {
    modal?.classList.remove('open');
    form?.reset();
    uploadedBase64Image = '';
    if (previewImg) previewImg.style.display = 'none';
    if (placeholderText) placeholderText.style.display = 'block';
  };

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
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

    const fallbackImg = viewContainer.querySelector('#report-type').value === 'LOST'
      ? 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500'
      : 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500';

    const newItem = {
      id: Date.now(),
      reporterId: currentUser?.id || 2,
      reporterName: currentUser?.name || 'John Doe',
      type: viewContainer.querySelector('#report-type').value,
      title: viewContainer.querySelector('#report-title').value.trim(),
      location: viewContainer.querySelector('#report-location').value.trim(),
      description: viewContainer.querySelector('#report-description').value.trim(),
      imageUrl: uploadedBase64Image || fallbackImg,
      status: 'OPEN',
      dateReported: new Date().toISOString().split('T')[0]
    };

    store.addLostFoundItem(newItem);
    showToast('Item report filed successfully!', 'success');
    closeModal();
  });
}
