/**
 * Lost & Found View Module
 * Implements the Uniform View Module Contract: { init, render }
 */
import { escapeHtml, showToast } from '../utils.js';
import { store } from '../state.js';
import * as api from '../api.js';

let viewContainer = null;
let activeTypeFilter = 'ALL';

export function init(container) {
  viewContainer = container;

  viewContainer.innerHTML = `
    <div class="section-title">
      <div>
        <span>Lost & Found Reports</span>
        <div class="section-subtitle">Recover missing campus possessions</div>
      </div>
      <button id="open-lost-modal-btn" class="btn btn-secondary btn-sm">+ Report Item</button>
    </div>

    <!-- Type Filter Bar -->
    <div class="filter-bar" id="lost-filter-bar">
      <button class="filter-pill active" data-type="ALL">All Reports</button>
      <button class="filter-pill" data-type="LOST">Lost Items</button>
      <button class="filter-pill" data-type="FOUND">Found Items</button>
    </div>

    <div id="lostfound-list-container">
      <!-- Dynamic Lost & Found Cards -->
    </div>

    <!-- Modal Dialog: Report Item -->
    <div id="report-item-modal" class="modal-backdrop">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 class="modal-title">Report Lost or Found Item</h3>
          <button type="button" class="modal-close-btn" id="close-lost-modal-btn">✕</button>
        </div>
        <form id="report-item-form">
          <div class="form-group">
            <label class="form-label" for="report-type">Report Type</label>
            <select id="report-type" class="form-select" required>
              <option value="LOST">I Lost Something</option>
              <option value="FOUND">I Found Something</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="report-title">Item Name</label>
            <input type="text" id="report-title" class="form-input" placeholder="e.g. Hydroflask Water Bottle, Blue" required maxlength="80">
          </div>
          <div class="form-group">
            <label class="form-label" for="report-location">Location</label>
            <input type="text" id="report-location" class="form-input" placeholder="e.g. Campus Library 2nd Floor" required maxlength="60">
          </div>
          <div class="form-group">
            <label class="form-label" for="report-image">Image URL (Optional)</label>
            <input type="url" id="report-image" class="form-input" placeholder="https://images.unsplash.com/...">
          </div>
          <div class="form-group">
            <label class="form-label" for="report-description">Description / Identifiers</label>
            <textarea id="report-description" class="form-textarea" placeholder="Identifying marks, stickers, color..." required maxlength="250"></textarea>
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

function bindEvents() {
  // 1. Type Filter Bar
  const filterBar = viewContainer.querySelector('#lost-filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;

      filterBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      activeTypeFilter = btn.getAttribute('data-type') || 'ALL';
      render(store.getState());
    });
  }

  // 2. Claim Action Delegate
  const container = viewContainer.querySelector('#lostfound-list-container');
  if (container) {
    container.addEventListener('click', async (e) => {
      const claimBtn = e.target.closest('.claim-action-btn');
      if (!claimBtn || claimBtn.hasAttribute('disabled')) return;

      const itemId = parseInt(claimBtn.getAttribute('data-id'), 10);
      if (!itemId) return;

      const rollback = store.optimisticClaimItem(itemId);

      try {
        const serverItem = await api.claimLostFoundItem(itemId, 'CLAIMED');
        store.reconcileClaimItem(itemId, serverItem);
        showToast('Item status updated to Resolved!', 'success');
      } catch (err) {
        rollback();
        showToast('Failed to claim item. Please try again.', 'error');
      }
    });
  }

  // 3. Modal Controls
  const modal = viewContainer.querySelector('#report-item-modal');
  const openBtn = viewContainer.querySelector('#open-lost-modal-btn');
  const closeBtn = viewContainer.querySelector('#close-lost-modal-btn');
  const cancelBtn = viewContainer.querySelector('#cancel-lost-modal-btn');
  const form = viewContainer.querySelector('#report-item-form');

  const openModal = () => modal && modal.classList.add('active');
  const closeModal = () => {
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentUser = store.getState().currentUser;
      const type = viewContainer.querySelector('#report-type').value;
      const title = viewContainer.querySelector('#report-title').value.trim();
      const location = viewContainer.querySelector('#report-location').value.trim();
      const desc = viewContainer.querySelector('#report-description').value.trim();
      const img = viewContainer.querySelector('#report-image').value.trim() ||
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400';

      const localItem = {
        id: Date.now(),
        reporterId: currentUser.id,
        reporterName: currentUser.name || 'Student',
        type,
        title,
        description: desc,
        location,
        dateReported: new Date().toISOString().split('T')[0],
        status: 'OPEN',
        imageUrl: img
      };

      store.setLostFound([localItem, ...(store.getState().lostfound || [])]);
      closeModal();
      showToast('Lost & Found report submitted!', 'success');
    });
  }
}

export function render(state) {
  if (!viewContainer) return;

  const container = viewContainer.querySelector('#lostfound-list-container');
  if (!container) return;

  if (state.loading.lostfound) {
    container.innerHTML = `
      <div class="loading">
        <div class="skeleton-card"><div class="skeleton-line w-full"></div></div>
        <div class="skeleton-card"><div class="skeleton-line w-full"></div></div>
      </div>
    `;
    return;
  }

  let items = state.lostfound || [];
  if (activeTypeFilter !== 'ALL') {
    items = items.filter((item) => item.type && item.type.toUpperCase() === activeTypeFilter);
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No Reports Found</div>
        <div class="empty-desc">No items matching "${escapeHtml(activeTypeFilter)}".</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => {
    const isLost = item.type === 'LOST';
    const isClaimed = item.status === 'CLAIMED';
    const isPending = state.pendingClaimIds.has(item.id);

    return `
      <div class="card media-card">
        <img class="card-thumb" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'">
        <div>
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <span class="badge ${isLost ? 'badge-orange' : 'badge-green'}">${escapeHtml(item.type)}</span>
            <span class="badge ${isClaimed ? 'badge-green' : 'badge-blue'}">${escapeHtml(item.status || 'OPEN')}</span>
          </div>
          <h4 style="font-size: 1rem; font-weight: 600;">${escapeHtml(item.title)}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">
            ${escapeHtml(item.description)}
          </p>
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">
            📍 ${escapeHtml(item.location)} • 📅 ${escapeHtml(item.dateReported)}
          </p>
        </div>
        <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 10px;">
          <span style="font-size: 0.75rem; color: var(--text-secondary);">Reported by: ${escapeHtml(item.reporterName || 'Campus Member')}</span>
          ${isClaimed ? `
            <span style="font-size: 0.75rem; color: var(--color-success); font-weight: 600;">✓ Resolved</span>
          ` : `
            <button 
              type="button" 
              class="btn btn-secondary btn-sm claim-action-btn ${isPending ? 'disabled' : ''}" 
              data-id="${item.id}"
              ${isPending ? 'disabled' : ''}
            >Claim / Resolve</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}
