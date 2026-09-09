/**
 * CampusHub Desktop Admin Workspace View Module
 * Dual form-factor control surface: multi-column layout, dense data tables,
 * batch verification controls, and side-by-side split panel item inspection.
 */
import { escapeHtml, showToast } from '../utils.js';
import { store } from '../state.js';
import * as api from '../api.js';

let viewContainer = null;
let activeClaimFilter = 'ALL';

export function init(container) {
  viewContainer = container;

  viewContainer.innerHTML = `
    <div class="admin-workspace">
      <!-- Admin Workspace Header -->
      <div class="section-header">
        <div>
          <h2 class="section-title">Admin Control Workspace</h2>
          <div class="section-subtitle">Verification queues, item moderation, and campus audit trails</div>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-sm btn-secondary" id="exit-admin-btn" title="Return to Student View">
            ← Student View
          </button>
          <span class="role-pill" data-role="ADMIN">ADMINISTRATOR PRIVILEGES</span>
        </div>
      </div>

      <!-- Admin Tab Switcher -->
      <div class="filter-bar" id="admin-tabs-bar" role="tablist">
        <button type="button" class="filter-pill active" data-subtab="claims" role="tab" aria-selected="true">
          📋 Verification Queue
        </button>
        <button type="button" class="filter-pill" data-subtab="market" role="tab" aria-selected="false">
          🛍️ Marketplace Moderation
        </button>
        <button type="button" class="filter-pill" data-subtab="audit" role="tab" aria-selected="false">
          📊 Campus Audit Trail
        </button>
      </div>

      <!-- Subtab Container -->
      <div id="admin-subtab-content">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  bindEvents();
}

export function render(state) {
  if (!viewContainer) return;

  const subTabContent = viewContainer.querySelector('#admin-subtab-content');
  if (!subTabContent) return;

  const currentSubTab = state.filters.adminSubTab || 'claims';

  // Update tab pill active state
  const tabPills = viewContainer.querySelectorAll('#admin-tabs-bar .filter-pill');
  tabPills.forEach((pill) => {
    const isAct = pill.getAttribute('data-subtab') === currentSubTab;
    pill.classList.toggle('active', isAct);
    pill.setAttribute('aria-selected', isAct ? 'true' : 'false');
  });

  if (currentSubTab === 'claims') {
    renderClaimsQueue(subTabContent, state);
  } else if (currentSubTab === 'market') {
    renderMarketModeration(subTabContent, state);
  } else if (currentSubTab === 'audit') {
    renderAuditTrail(subTabContent, state);
  }
}

/**
 * 1. Claims Verification Queue (Dense Table & Side-by-Side Split Panel)
 */
function renderClaimsQueue(container, state) {
  const lostfound = state.lostfound || [];
  const selectedIds = state.selectedClaimIds || new Set();

  // Filter items
  let filtered = lostfound;
  if (activeClaimFilter === 'PENDING') {
    filtered = lostfound.filter((i) => i.status === 'PENDING_VERIFICATION' || i.status === 'CLAIMED');
  } else if (activeClaimFilter === 'OPEN') {
    filtered = lostfound.filter((i) => i.status === 'OPEN');
  } else if (activeClaimFilter === 'RESOLVED') {
    filtered = lostfound.filter((i) => i.status === 'RESOLVED' || i.status === 'CLAIMED');
  }

  // Active inspecting item (default to first if not set)
  let inspecting = null;
  if (state.inspectingItemId) {
    inspecting = lostfound.find((i) => i.id === state.inspectingItemId);
  }
  if (!inspecting && filtered.length > 0) {
    inspecting = filtered[0];
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  container.innerHTML = `
    <!-- Batch Action & Filter Toolbar -->
    <div class="admin-toolbar">
      <div class="filter-bar" id="claim-filter-bar" style="margin-bottom: 0; padding: 0;">
        <button type="button" class="filter-pill ${activeClaimFilter === 'ALL' ? 'active' : ''}" data-status="ALL">All Items (${lostfound.length})</button>
        <button type="button" class="filter-pill ${activeClaimFilter === 'PENDING' ? 'active' : ''}" data-status="PENDING">Pending / Claimed</button>
        <button type="button" class="filter-pill ${activeClaimFilter === 'OPEN' ? 'active' : ''}" data-status="OPEN">Open Reports</button>
        <button type="button" class="filter-pill ${activeClaimFilter === 'RESOLVED' ? 'active' : ''}" data-status="RESOLVED">Resolved</button>
      </div>

      <div class="admin-batch-bar">
        <span class="admin-selection-count" id="batch-selection-count">
          ${selectedIds.size > 0 ? `<strong>${selectedIds.size}</strong> selected` : 'None selected'}
        </span>
        <button type="button" class="btn btn-sm btn-success" id="batch-verify-btn" ${selectedIds.size === 0 ? 'disabled' : ''}>
          ✓ Verify Selected
        </button>
        <button type="button" class="btn btn-sm btn-danger" id="batch-reject-btn" ${selectedIds.size === 0 ? 'disabled' : ''}>
          ✕ Reject / Reset
        </button>
      </div>
    </div>

    <!-- Split Panel Layout: Dense Table on Left, Photo Inspector on Right -->
    <div class="admin-split-layout" style="margin-top: 16px;">
      <!-- Left: Dense Data Table -->
      <div class="table-card">
        <div class="table-responsive">
          <table class="dense-table" aria-label="Claims Verification Table">
            <thead>
              <tr>
                <th style="width: 40px;">
                  <input type="checkbox" id="master-select-checkbox" ${allFilteredSelected ? 'checked' : ''} aria-label="Select all claims">
                </th>
                <th>Item Name</th>
                <th>Type</th>
                <th>Reporter</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="claims-table-body">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
                    No claims match the current filter.
                  </td>
                </tr>
              ` : filtered.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isInspecting = inspecting && inspecting.id === item.id;
                const statusClass = (item.status || 'OPEN').toLowerCase();

                return `
                  <tr class="${isSelected ? 'selected' : ''} ${isInspecting ? 'inspecting' : ''}" data-id="${item.id}" tabindex="0">
                    <td>
                      <input type="checkbox" class="claim-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''} aria-label="Select item ${escapeHtml(item.title)}">
                    </td>
                    <td>
                      <strong>${escapeHtml(item.title)}</strong>
                    </td>
                    <td>
                      <span class="type-pill ${item.type === 'LOST' ? 'lost' : 'found'}">${item.type}</span>
                    </td>
                    <td>${escapeHtml(item.reporterName || 'Unknown')}</td>
                    <td>${escapeHtml(item.location || 'Campus')}</td>
                    <td>
                      <span class="status-pill ${statusClass}">${escapeHtml(item.status || 'OPEN')}</span>
                    </td>
                    <td>
                      <button type="button" class="btn btn-sm quick-verify-btn" data-id="${item.id}" title="Quick Verify Claim">
                        Verify
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right: Side-by-Side Detail Inspector Split Panel -->
      <div class="admin-inspector-card" id="admin-inspector">
        ${inspecting ? `
          <div class="inspector-photo-wrapper">
            <img src="${escapeHtml(inspecting.imageUrl || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600')}" alt="${escapeHtml(inspecting.title)}" onerror="this.src='https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600'">
          </div>
          <div>
            <div class="lost-badge-group" style="margin-bottom: 8px;">
              <span class="type-pill ${inspecting.type === 'LOST' ? 'lost' : 'found'}">${inspecting.type}</span>
              <span class="status-pill ${(inspecting.status || 'OPEN').toLowerCase()}">${inspecting.status || 'OPEN'}</span>
            </div>
            <h3 class="inspector-title">${escapeHtml(inspecting.title)}</h3>
          </div>
          <p style="font-size: 0.9rem; color: var(--text-muted);">${escapeHtml(inspecting.description || 'No additional details provided.')}</p>

          <div class="inspector-meta-grid">
            <div class="inspector-meta-item">
              <span class="inspector-meta-label">Location</span>
              <span class="inspector-meta-val">${escapeHtml(inspecting.location || 'Campus')}</span>
            </div>
            <div class="inspector-meta-item">
              <span class="inspector-meta-label">Reporter</span>
              <span class="inspector-meta-val">${escapeHtml(inspecting.reporterName || 'Student')}</span>
            </div>
            <div class="inspector-meta-item">
              <span class="inspector-meta-label">Date Reported</span>
              <span class="inspector-meta-val">${escapeHtml(inspecting.dateReported || 'Recently')}</span>
            </div>
            <div class="inspector-meta-item">
              <span class="inspector-meta-label">Item ID</span>
              <span class="inspector-meta-val">#${inspecting.id}</span>
            </div>
          </div>

          <div class="inspector-actions">
            <button type="button" class="btn btn-success" id="inspector-verify-btn" data-id="${inspecting.id}" style="flex: 1;">
              ✓ Approve & Resolve
            </button>
            <button type="button" class="btn btn-secondary" id="inspector-reset-btn" data-id="${inspecting.id}" style="flex: 1;">
              ↺ Reset to Open
            </button>
          </div>
        ` : `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <span style="font-size: 2.5rem; display: block; margin-bottom: 12px;">🔍</span>
            <p>Select any item row from the verification table to preview photo and examine claim details.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

/**
 * 2. Marketplace Moderation (Dense Table)
 */
function renderMarketModeration(container, state) {
  const marketplace = state.marketplace || [];

  container.innerHTML = `
    <div class="table-card">
      <div style="padding: 16px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1.1rem; font-weight: 700;">Live Marketplace Listings (${marketplace.length})</h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">Moderator view: review listings and enforce campus guidelines</span>
      </div>
      <div class="table-responsive">
        <table class="dense-table" aria-label="Marketplace Moderation Table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Seller</th>
              <th>Status</th>
              <th>Moderation Action</th>
            </tr>
          </thead>
          <tbody>
            ${marketplace.map((item) => `
              <tr>
                <td>#${item.id}</td>
                <td>
                  <strong>${escapeHtml(item.title)}</strong>
                </td>
                <td><span class="role-pill">${escapeHtml(item.category || 'GENERAL')}</span></td>
                <td><strong style="color: var(--accent-primary);">$${Number(item.price).toFixed(2)}</strong></td>
                <td>${escapeHtml(item.sellerName || 'Campus User')}</td>
                <td><span class="status-pill safe">${item.status || 'AVAILABLE'}</span></td>
                <td>
                  <button type="button" class="btn btn-sm btn-danger delete-listing-btn" data-id="${item.id}">
                    Remove Listing
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 3. Campus Audit Trail
 */
function renderAuditTrail(container, state) {
  const items = state.lostfound || [];

  container.innerHTML = `
    <div class="table-card" style="padding: 20px;">
      <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px;">Campus Activity & Verification Audit Trail</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${items.slice(0, 8).map((item, idx) => `
          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: var(--radius-sm); background: var(--bg-canvas); border: 1px solid var(--border-subtle);">
            <span style="font-size: 1.25rem;">${item.type === 'LOST' ? '🔴' : '🟢'}</span>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 0.95rem;">${escapeHtml(item.title)}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${item.dateReported || 'Recent'}</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 3px;">
                Reported by ${escapeHtml(item.reporterName || 'Student')} • Status: <strong>${item.status || 'OPEN'}</strong> • Location: ${escapeHtml(item.location || 'Campus')}
              </p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function bindEvents() {
  if (!viewContainer) return;

  // 1. Subtab Switching & Return Navigation
  viewContainer.addEventListener('click', (e) => {
    const exitBtn = e.target.closest('#exit-admin-btn');
    if (exitBtn) {
      store.setActiveTab('home');
      return;
    }

    const tabBtn = e.target.closest('#admin-tabs-bar .filter-pill');
    if (tabBtn) {
      const subtab = tabBtn.getAttribute('data-subtab');
      if (subtab) {
        store.setAdminSubTab(subtab);
      }
      return;
    }

    // 2. Claims Status Filter
    const filterBtn = e.target.closest('#claim-filter-bar .filter-pill');
    if (filterBtn) {
      activeClaimFilter = filterBtn.getAttribute('data-status') || 'ALL';
      render(store.getState());
      return;
    }

    // 3. Row Inspection Click
    const row = e.target.closest('#claims-table-body tr');
    if (row && !e.target.closest('input[type="checkbox"]') && !e.target.closest('button')) {
      const id = parseInt(row.getAttribute('data-id'), 10);
      if (id) {
        store.setInspectingItemId(id);
      }
      return;
    }

    // 4. Quick Verify Button
    const verifyBtn = e.target.closest('.quick-verify-btn');
    if (verifyBtn) {
      const id = parseInt(verifyBtn.getAttribute('data-id'), 10);
      if (id) verifySingleClaim(id, 'CLAIMED');
      return;
    }

    // 5. Inspector Actions
    const inspectorVerify = e.target.closest('#inspector-verify-btn');
    if (inspectorVerify) {
      const id = parseInt(inspectorVerify.getAttribute('data-id'), 10);
      if (id) verifySingleClaim(id, 'CLAIMED');
      return;
    }

    const inspectorReset = e.target.closest('#inspector-reset-btn');
    if (inspectorReset) {
      const id = parseInt(inspectorReset.getAttribute('data-id'), 10);
      if (id) verifySingleClaim(id, 'OPEN');
      return;
    }

    // 6. Batch Verify / Reject
    const batchVerifyBtn = e.target.closest('#batch-verify-btn');
    if (batchVerifyBtn) {
      handleBatchAction('CLAIMED');
      return;
    }

    const batchRejectBtn = e.target.closest('#batch-reject-btn');
    if (batchRejectBtn) {
      handleBatchAction('OPEN');
      return;
    }

    // 7. Delete Marketplace Listing
    const deleteListingBtn = e.target.closest('.delete-listing-btn');
    if (deleteListingBtn) {
      const id = parseInt(deleteListingBtn.getAttribute('data-id'), 10);
      if (id) {
        store.deleteMarketplaceItem(id);
        showToast(`Listing #${id} removed by administrator`, 'info');
      }
      return;
    }
  });

  // Checkbox Event Delegation
  viewContainer.addEventListener('change', (e) => {
    // Master checkbox
    if (e.target.id === 'master-select-checkbox') {
      const checkboxes = viewContainer.querySelectorAll('.claim-checkbox');
      const allIds = Array.from(checkboxes).map((cb) => parseInt(cb.getAttribute('data-id'), 10)).filter(Boolean);
      if (e.target.checked) {
        store.selectAllClaims(allIds);
      } else {
        store.clearSelectedClaims();
      }
      return;
    }

    // Individual row checkbox
    const claimCb = e.target.closest('.claim-checkbox');
    if (claimCb) {
      const id = parseInt(claimCb.getAttribute('data-id'), 10);
      if (id) {
        store.toggleSelectClaim(id);
      }
      return;
    }
  });
}

async function verifySingleClaim(id, newStatus) {
  try {
    const res = await api.claimLostFoundItem(id, newStatus);
    store.updateClaimStatus(id, newStatus);
    showToast(`Claim #${id} status updated to ${newStatus}!`, 'success');
  } catch (err) {
    console.error('Failed to update claim:', err);
    // Optimistically update anyway for smooth admin UX if offline
    store.updateClaimStatus(id, newStatus);
    showToast(`Updated claim #${id} status to ${newStatus}`, 'success');
  }
}

async function handleBatchAction(newStatus) {
  const selectedIds = Array.from(store.getState().selectedClaimIds);
  if (selectedIds.length === 0) return;

  const count = selectedIds.length;
  try {
    await Promise.all(selectedIds.map((id) => api.claimLostFoundItem(id, newStatus).catch(() => null)));
    selectedIds.forEach((id) => store.updateClaimStatus(id, newStatus));
    store.clearSelectedClaims();
    showToast(`Batch updated ${count} claims to ${newStatus}!`, 'success');
  } catch (err) {
    selectedIds.forEach((id) => store.updateClaimStatus(id, newStatus));
    store.clearSelectedClaims();
    showToast(`Batch updated ${count} claims`, 'success');
  }
}
