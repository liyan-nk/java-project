/**
 * Marketplace View Module (Campus Catalog & Listing Modal)
 * Responsive auto-fit grid, aspect-ratio locked photo containers,
 * category chips, price callouts, and FileReader image preview upload.
 */
import { escapeHtml, showToast } from '../utils.js';
import { store } from '../state.js';
import * as api from '../api.js';

let viewContainer = null;
let activeCategoryFilter = 'ALL';
let uploadedBase64Image = '';

export function init(container) {
  viewContainer = container;

  viewContainer.innerHTML = `
    <!-- Section Header -->
    <div class="section-header">
      <div>
        <h2 class="section-title">Campus Marketplace</h2>
        <div class="section-subtitle">Buy and sell textbooks, dorm gear, and student essentials</div>
      </div>
      <button type="button" id="open-market-modal-btn" class="btn btn-sm">+ Post Listing</button>
    </div>

    <!-- Category Filter Bar -->
    <div class="filter-bar" id="market-filter-bar" role="tablist" aria-label="Filter marketplace by category">
      <button type="button" class="filter-pill active" data-category="ALL" role="tab" aria-selected="true">All Items</button>
      <button type="button" class="filter-pill" data-category="TEXTBOOKS" role="tab" aria-selected="false">📚 Textbooks</button>
      <button type="button" class="filter-pill" data-category="TECH" role="tab" aria-selected="false">💻 Tech & Gear</button>
      <button type="button" class="filter-pill" data-category="DORM" role="tab" aria-selected="false">🛋️ Dorm Life</button>
      <button type="button" class="filter-pill" data-category="GENERAL" role="tab" aria-selected="false">📦 General</button>
    </div>

    <!-- Marketplace Auto-Fit Grid -->
    <div id="marketplace-grid-container" class="marketplace-grid" aria-live="polite">
      <!-- Dynamic Item Cards -->
    </div>

    <!-- Modal Dialog: Create Marketplace Listing -->
    <div id="create-market-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="market-modal-title">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 class="modal-title" id="market-modal-title">List Item for Sale</h3>
          <button type="button" class="modal-close-btn" id="close-market-modal-btn" aria-label="Close modal">✕</button>
        </div>
        <form id="create-market-form">
          <!-- Image Upload with Instant Preview -->
          <div class="form-group">
            <label class="form-label" for="item-image-file">Item Photo</label>
            <div class="image-upload-preview" id="image-upload-dropzone">
              <span id="upload-placeholder-text">📸 Tap to choose photo or drag & drop</span>
              <img id="image-preview-element" src="" alt="Selected item preview" style="display: none;">
            </div>
            <input type="file" id="item-image-file" accept="image/*" style="display: none;">
          </div>

          <div class="form-group">
            <label class="form-label" for="item-title">Item Title</label>
            <input type="text" id="item-title" class="form-input" placeholder="e.g. TI-84 Plus Graphing Calculator" required maxlength="80">
          </div>

          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="item-category">Category</label>
              <select id="item-category" class="form-select" required>
                <option value="TEXTBOOKS">Textbooks</option>
                <option value="TECH">Tech & Electronics</option>
                <option value="DORM">Dorm & Furniture</option>
                <option value="GENERAL">General Goods</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="item-price">Price ($ USD)</label>
              <input type="number" id="item-price" class="form-input" placeholder="0.00" min="0" step="0.5" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="item-desc">Description</label>
            <textarea id="item-desc" class="form-textarea" placeholder="Describe condition, pickup location on campus..." required maxlength="250"></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancel-market-modal-btn">Cancel</button>
            <button type="submit" class="btn" id="submit-market-btn">Publish Listing</button>
          </div>
        </form>
      </div>
    </div>
  `;

  bindEvents();
}

export function render(state) {
  if (!viewContainer) return;

  const gridContainer = viewContainer.querySelector('#marketplace-grid-container');
  if (!gridContainer) return;

  const marketplace = state.marketplace || [];
  const filtered = activeCategoryFilter === 'ALL'
    ? marketplace
    : marketplace.filter((item) => (item.category || '').toUpperCase() === activeCategoryFilter);

  if (filtered.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🛍️</span>
        <strong>No items found in this category</strong>
        <p style="font-size: 0.85rem; margin-top: 4px;">Be the first to list an item by tapping "+ Post Listing" above.</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = filtered.map((item) => {
    const imgUrl = item.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500';

    return `
      <article class="market-card" tabindex="0">
        <div class="market-img-wrapper">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'">
          <span class="market-category-chip">${escapeHtml(item.category || 'GENERAL')}</span>
        </div>

        <div class="market-body">
          <div>
            <h3 class="market-title">${escapeHtml(item.title)}</h3>
            <p class="market-desc">${escapeHtml(item.description || 'No description provided.')}</p>
          </div>

          <div class="market-footer">
            <span class="market-price">$${Number(item.price || 0).toFixed(2)}</span>
            <span class="market-seller">👤 ${escapeHtml(item.sellerName || 'Campus Seller')}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function bindEvents() {
  if (!viewContainer) return;

  // 1. Category Filter Bar
  const filterBar = viewContainer.querySelector('#market-filter-bar');
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
      activeCategoryFilter = btn.getAttribute('data-category') || 'ALL';
      render(store.getState());
    });
  }

  // 2. Modal Controls & Image Upload Preview
  const modal = viewContainer.querySelector('#create-market-modal');
  const openBtn = viewContainer.querySelector('#open-market-modal-btn');
  const closeBtn = viewContainer.querySelector('#close-market-modal-btn');
  const cancelBtn = viewContainer.querySelector('#cancel-market-modal-btn');
  const form = viewContainer.querySelector('#create-market-form');
  const dropzone = viewContainer.querySelector('#image-upload-dropzone');
  const fileInput = viewContainer.querySelector('#item-image-file');
  const previewImg = viewContainer.querySelector('#image-preview-element');
  const placeholderText = viewContainer.querySelector('#upload-placeholder-text');

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

  // Image upload trigger
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
      if (placeholderText) {
        placeholderText.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  });

  // Form Submit
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentUser = store.getState().currentUser;

    const fallbackImg = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500';
    const payload = {
      sellerId: currentUser?.id || 2,
      sellerName: currentUser?.name || 'John Doe',
      title: viewContainer.querySelector('#item-title').value.trim(),
      category: viewContainer.querySelector('#item-category').value,
      price: parseFloat(viewContainer.querySelector('#item-price').value) || 0,
      description: viewContainer.querySelector('#item-desc').value.trim(),
      imageUrl: uploadedBase64Image || fallbackImg
    };

    const submitBtn = viewContainer.querySelector('#submit-market-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const created = await api.createMarketplaceItem(payload);
      store.addMarketplaceItem({
        ...payload,
        id: created?.id || Date.now(),
        status: 'AVAILABLE'
      });
      showToast('Item listing published to marketplace!', 'success');
      closeModal();
    } catch (err) {
      console.error('Failed to create marketplace item:', err);
      // Optimistic append if offline
      store.addMarketplaceItem({ ...payload, id: Date.now(), status: 'AVAILABLE' });
      showToast('Listing created in offline mode', 'info');
      closeModal();
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
