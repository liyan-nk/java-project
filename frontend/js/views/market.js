/**
 * Marketplace View Module
 * Implements the Uniform View Module Contract: { init, render }
 */
import { escapeHtml, showToast } from '../utils.js';
import { store } from '../state.js';
import * as api from '../api.js';

let viewContainer = null;
let activeCategoryFilter = 'ALL';

export function init(container) {
  viewContainer = container;

  viewContainer.innerHTML = `
    <div class="section-title">
      <div>
        <span>Campus Marketplace</span>
        <div class="section-subtitle">Buy and sell student essentials</div>
      </div>
      <button id="open-market-modal-btn" class="btn btn-sm">+ Post Item</button>
    </div>

    <!-- Category Filter Bar -->
    <div class="filter-bar" id="market-filter-bar">
      <button class="filter-pill active" data-category="ALL">All Items</button>
      <button class="filter-pill" data-category="TEXTBOOKS">Textbooks</button>
      <button class="filter-pill" data-category="TECH">Tech & Gadgets</button>
      <button class="filter-pill" data-category="DORM">Dorm & Living</button>
      <button class="filter-pill" data-category="GENERAL">General</button>
    </div>

    <div id="marketplace-list-container">
      <!-- Dynamic Marketplace Cards -->
    </div>

    <!-- Modal Dialog: Post Item -->
    <div id="post-item-modal" class="modal-backdrop">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 class="modal-title">List Item for Sale</h3>
          <button type="button" class="modal-close-btn" id="close-market-modal-btn">✕</button>
        </div>
        <form id="post-item-form">
          <div class="form-group">
            <label class="form-label" for="item-title">Item Title</label>
            <input type="text" id="item-title" class="form-input" placeholder="e.g. TI-84 Plus CE Graphing Calculator" required maxlength="80">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="item-price">Price ($ USD)</label>
              <input type="number" id="item-price" class="form-input" placeholder="45.00" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="item-category">Category</label>
              <select id="item-category" class="form-select" required>
                <option value="TEXTBOOKS">Textbooks</option>
                <option value="TECH">Tech & Gadgets</option>
                <option value="DORM">Dorm & Living</option>
                <option value="GENERAL" selected>General</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="item-image">Image URL (Optional)</label>
            <input type="url" id="item-image" class="form-input" placeholder="https://images.unsplash.com/...">
          </div>
          <div class="form-group">
            <label class="form-label" for="item-description">Description</label>
            <textarea id="item-description" class="form-textarea" placeholder="Item condition, pick-up location on campus..." required maxlength="250"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-market-modal-btn">Cancel</button>
            <button type="submit" class="btn" id="submit-market-btn">Post Listing</button>
          </div>
        </form>
      </div>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  // 1. Category Filter Bar
  const filterBar = viewContainer.querySelector('#market-filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;

      filterBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      activeCategoryFilter = btn.getAttribute('data-category') || 'ALL';
      render(store.getState());
    });
  }

  // 2. Modal Handling
  const modal = viewContainer.querySelector('#post-item-modal');
  const openBtn = viewContainer.querySelector('#open-market-modal-btn');
  const closeBtn = viewContainer.querySelector('#close-market-modal-btn');
  const cancelBtn = viewContainer.querySelector('#cancel-market-modal-btn');
  const form = viewContainer.querySelector('#post-item-form');

  const openModal = () => modal && modal.classList.add('active');
  const closeModal = () => {
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = viewContainer.querySelector('#submit-market-btn');
      if (submitBtn) submitBtn.setAttribute('disabled', 'true');

      const currentUser = store.getState().currentUser;
      const defaultImg = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400';
      const rawImage = viewContainer.querySelector('#item-image').value.trim();

      const payload = {
        sellerId: currentUser.id, // Single source of truth
        title: viewContainer.querySelector('#item-title').value.trim(),
        price: parseFloat(viewContainer.querySelector('#item-price').value) || 0,
        category: viewContainer.querySelector('#item-category').value,
        description: viewContainer.querySelector('#item-description').value.trim(),
        imageUrl: rawImage || defaultImg
      };

      try {
        const createdWithId = await api.createMarketplaceItem(payload);

        // Synthesize full display-ready record at call site
        const displayItem = {
          ...createdWithId,
          sellerName: currentUser.name || 'Anonymous',
          status: 'AVAILABLE',
          createdAt: new Date().toISOString()
        };

        store.addMarketplaceItem(displayItem);
        closeModal();
        showToast('Item listed successfully!', 'success');
      } catch (err) {
        showToast('Failed to post item. Please try again.', 'error');
      } finally {
        if (submitBtn) submitBtn.removeAttribute('disabled');
      }
    });
  }
}

export function render(state) {
  if (!viewContainer) return;

  const container = viewContainer.querySelector('#marketplace-list-container');
  if (!container) return;

  if (state.loading.marketplace) {
    container.innerHTML = `
      <div class="loading">
        <div class="skeleton-card"><div class="skeleton-line w-full"></div></div>
        <div class="skeleton-card"><div class="skeleton-line w-full"></div></div>
      </div>
    `;
    return;
  }

  let items = state.marketplace || [];
  if (activeCategoryFilter !== 'ALL') {
    items = items.filter((item) => item.category && item.category.toUpperCase() === activeCategoryFilter);
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛍️</div>
        <div class="empty-title">No Listings Found</div>
        <div class="empty-desc">No items available in category ${escapeHtml(activeCategoryFilter)}. Be the first to post!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="card media-card">
      <img class="card-thumb" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div style="flex: 1;">
          <span class="badge badge-blue">${escapeHtml(item.category || 'GENERAL')}</span>
          <h4 style="font-size: 1rem; margin-top: 6px; font-weight: 600;">${escapeHtml(item.title)}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">
            ${escapeHtml(item.description)}
          </p>
        </div>
        <div style="font-size: 1.15rem; font-weight: 700; color: var(--color-success); white-space: nowrap;">
          $${Number(item.price).toFixed(2)}
        </div>
      </div>
      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 10px;">
        <span style="font-size: 0.75rem; color: var(--text-secondary);">Seller: ${escapeHtml(item.sellerName || 'Campus User')}</span>
        <button type="button" class="btn btn-sm" onclick="alert('Chat interface ready!')">Contact Seller</button>
      </div>
    </div>
  `).join('');
}
