/**
 * CampusHub Marketplace View Module
 * Features:
 * - Responsive auto-fit grid with interactive cards
 * - Real-time category filtering & count badges
 * - Accessible, responsive Item Details modal (Desktop 2-column, Mobile 1-column)
 * - Safe focus management (restores focus to triggering card upon closing)
 * - Scroll lock on document.body during modal presentation
 * - Graceful handling of missing images, missing descriptions, and optional metadata
 * - "Post Listing" modal with drag-and-drop / file upload preview
 */
import { escapeHtml, showToast } from '../utils.js';
import { store } from '../state.js';
import * as api from '../api.js';

let viewContainer = null;
let activeCategoryFilter = 'ALL';
let lastFocusedCard = null;
let uploadedBase64Image = '';

/**
 * Checks if an item's category matches the current active filter
 * Normalizes common synonyms without mutating original data
 * @param {string} itemCategory 
 * @param {string} filterCategory 
 * @returns {boolean}
 */
export function matchesCategory(itemCategory, filterCategory) {
  if (!filterCategory || filterCategory === 'ALL') return true;
  const ic = (itemCategory || '').trim().toUpperCase();
  const fc = filterCategory.trim().toUpperCase();

  if (ic === fc) return true;

  if (fc === 'TEXTBOOKS') {
    return ic === 'BOOKS' || ic === 'BOOK' || ic === 'TEXTBOOK' || ic === 'TEXTBOOKS';
  }
  if (fc === 'TECH') {
    return ic === 'ELECTRONICS' || ic === 'ELECTRONIC' || ic === 'TECH' || ic === 'TECHNOLOGY' || ic === 'GADGETS';
  }
  if (fc === 'DORM') {
    return ic === 'FURNITURE' || ic === 'DORM' || ic === 'ROOM' || ic === 'HOUSING' || ic === 'LIVING';
  }
  if (fc === 'GENERAL') {
    return ic === 'GENERAL' || ic === 'OTHER' || ic === 'MISC' || ic === 'SUPPLIES';
  }

  return false;
}

/**
 * Returns formatted category label with emoji
 * @param {string} cat 
 * @returns {string}
 */
function formatCategoryBadge(cat) {
  const c = (cat || '').trim().toUpperCase();
  if (c === 'TEXTBOOKS' || c === 'BOOKS' || c === 'BOOK') return '📚 Textbooks';
  if (c === 'TECH' || c === 'ELECTRONICS' || c === 'GADGETS') return '💻 Tech & Gear';
  if (c === 'DORM' || c === 'FURNITURE' || c === 'ROOM') return '🛋️ Dorm Life';
  return '📦 General';
}

/**
 * Formats ISO date or timestamp into a readable date string
 * @param {string|number} dateVal 
 * @returns {string|null}
 */
function formatListingDate(dateVal) {
  if (!dateVal) return null;
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  } catch (_) {}
  return String(dateVal);
}

/**
 * Initializes the Marketplace DOM container
 * @param {HTMLElement} container 
 */
export function init(container) {
  viewContainer = container;

  viewContainer.innerHTML = `
    <!-- Section Header -->
    <div class="section-header">
      <div>
        <h2 class="section-title">Campus Marketplace</h2>
        <div class="section-subtitle">Buy, sell, and trade student essentials, books, and dorm gear</div>
      </div>
      <button type="button" id="open-market-modal-btn" class="btn btn-sm">+ Post Listing</button>
    </div>

    <!-- Category Filter Bar -->
    <div class="filter-bar" id="market-filter-bar" role="tablist" aria-label="Filter marketplace by category">
      <button type="button" class="filter-pill active" data-category="ALL" role="tab" aria-selected="true">
        All Items <span class="filter-count" id="count-ALL"></span>
      </button>
      <button type="button" class="filter-pill" data-category="TEXTBOOKS" role="tab" aria-selected="false">
        📚 Textbooks <span class="filter-count" id="count-TEXTBOOKS"></span>
      </button>
      <button type="button" class="filter-pill" data-category="TECH" role="tab" aria-selected="false">
        💻 Tech & Gear <span class="filter-count" id="count-TECH"></span>
      </button>
      <button type="button" class="filter-pill" data-category="DORM" role="tab" aria-selected="false">
        🛋️ Dorm Life <span class="filter-count" id="count-DORM"></span>
      </button>
      <button type="button" class="filter-pill" data-category="GENERAL" role="tab" aria-selected="false">
        📦 General <span class="filter-count" id="count-GENERAL"></span>
      </button>
    </div>

    <!-- Marketplace Auto-Fit Grid -->
    <div id="marketplace-grid-container" class="marketplace-grid" aria-live="polite">
      <!-- Dynamic Item Cards rendered by render() -->
    </div>

    <!-- Modal Dialog: Create Marketplace Listing -->
    <div id="create-market-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="market-modal-title">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 class="modal-title" id="market-modal-title">List Item for Sale</h3>
          <button type="button" class="modal-close-btn" id="close-market-modal-btn" aria-label="Close modal">✕</button>
        </div>
        <form id="create-market-form" class="modal-form-compact">
          <div class="modal-grid-2col">
            <!-- Left Column: Image Upload & Description -->
            <div class="modal-col">
              <div class="form-group">
                <label class="form-label" for="item-image-file">Item Photo</label>
                <div class="image-upload-preview compact-dropzone" id="image-upload-dropzone">
                  <span id="upload-placeholder-text">📸 Tap to attach photo</span>
                  <img id="image-preview-element" src="" alt="Selected item preview" style="display: none;">
                </div>
                <input type="file" id="item-image-file" accept="image/*" style="display: none;">
              </div>
              <div class="form-group">
                <label class="form-label" for="item-desc">Description</label>
                <textarea id="item-desc" class="form-textarea compact-textarea" placeholder="Describe condition, pickup spot..." required maxlength="250"></textarea>
              </div>
            </div>

            <!-- Right Column: Details & Seller Contact Info -->
            <div class="modal-col">
              <div class="form-group">
                <label class="form-label" for="item-title">Item Title</label>
                <input type="text" id="item-title" class="form-input" placeholder="e.g. TI-84 Plus Graphing Calculator" required maxlength="80">
              </div>

              <div class="form-row-2col">
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

              <div class="form-row-2col">
                <div class="form-group">
                  <label class="form-label" for="item-seller-dept">Department</label>
                  <input type="text" id="item-seller-dept" class="form-input" placeholder="e.g. Computer Science" maxlength="80">
                </div>
                <div class="form-group">
                  <label class="form-label" for="item-seller-year">Year / Sem</label>
                  <input type="text" id="item-seller-year" class="form-input" placeholder="e.g. Senior (Year 4)" maxlength="50">
                </div>
              </div>

              <div class="form-row-2col">
                <div class="form-group">
                  <label class="form-label" for="item-seller-phone">Phone / WhatsApp</label>
                  <input type="tel" id="item-seller-phone" class="form-input" placeholder="e.g. +1 (555) 019-2834" maxlength="30">
                </div>
                <div class="form-group">
                  <label class="form-label" for="item-seller-email">Campus Email</label>
                  <input type="email" id="item-seller-email" class="form-input" placeholder="e.g. yourname@campus.edu" maxlength="100">
                </div>
              </div>
              <input type="hidden" id="item-seller-whatsapp" value="">
            </div>
          </div>

          <div class="form-actions compact-actions">
            <button type="button" class="btn btn-secondary" id="cancel-market-modal-btn">Cancel</button>
            <button type="submit" class="btn" id="submit-market-btn">Publish Listing</button>
          </div>
        </form>
      </div>
    </div>
  `;

  bindEvents();

  // Ensure modal dialog is attached directly to document.body (outside transformed container)
  const modalEl = document.getElementById('create-market-modal');
  if (modalEl && modalEl.parentElement !== document.body) {
    document.body.appendChild(modalEl);
  }
}

/**
 * Renders the Marketplace items and updates category counts
 * @param {Object} state 
 */
export function render(state) {
  if (!viewContainer) return;

  const gridContainer = viewContainer.querySelector('#marketplace-grid-container');
  if (!gridContainer) return;

  const marketplace = state.marketplace || [];

  // Update dynamic count indicators on filter pills
  const counts = {
    ALL: marketplace.length,
    TEXTBOOKS: marketplace.filter((i) => matchesCategory(i.category, 'TEXTBOOKS')).length,
    TECH: marketplace.filter((i) => matchesCategory(i.category, 'TECH')).length,
    DORM: marketplace.filter((i) => matchesCategory(i.category, 'DORM')).length,
    GENERAL: marketplace.filter((i) => matchesCategory(i.category, 'GENERAL')).length
  };

  Object.entries(counts).forEach(([cat, count]) => {
    const el = viewContainer.querySelector(`#count-${cat}`);
    if (el) {
      el.textContent = count > 0 ? `(${count})` : '';
    }
  });

  // Filter items based on activeCategoryFilter
  const filtered = activeCategoryFilter === 'ALL'
    ? marketplace
    : marketplace.filter((item) => matchesCategory(item.category, activeCategoryFilter));

  if (filtered.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm);">
        <span style="font-size: 2.4rem; display: block; margin-bottom: 10px;" aria-hidden="true">🛍️</span>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">No items found in this category</h3>
        <p style="font-size: 0.88rem; margin-top: 4px; max-width: 420px; margin-left: auto; margin-right: auto; line-height: 1.5;">
          There are currently no listings under "${escapeHtml(activeCategoryFilter)}". You can view all campus items or publish a new listing.
        </p>
        <div style="margin-top: 18px; display: flex; justify-content: center; gap: 10px;">
          <button type="button" class="btn btn-secondary btn-sm" id="reset-market-filter-btn">Show All Items</button>
          <button type="button" class="btn btn-sm" id="empty-state-post-btn">+ Post Listing</button>
        </div>
      </div>
    `;

    // Bind empty state action buttons
    const resetBtn = gridContainer.querySelector('#reset-market-filter-btn');
    resetBtn?.addEventListener('click', () => {
      activeCategoryFilter = 'ALL';
      const filterBar = viewContainer.querySelector('#market-filter-bar');
      filterBar?.querySelectorAll('.filter-pill').forEach((p) => {
        const isAll = p.getAttribute('data-category') === 'ALL';
        p.classList.toggle('active', isAll);
        p.setAttribute('aria-selected', isAll ? 'true' : 'false');
      });
      render(store.getState());
    });

    const postBtn = gridContainer.querySelector('#empty-state-post-btn');
    postBtn?.addEventListener('click', () => {
      openCreateModal();
    });

    return;
  }

  // Render cards with role="button", tabindex="0", and data-id for details modal activation
  gridContainer.innerHTML = filtered.map((item) => {
    const imgUrl = item.imageUrl || '';
    const catLabel = formatCategoryBadge(item.category);
    const priceFormatted = Number(item.price || 0).toFixed(2);

    return `
      <article class="marketplace-card market-card" data-id="${item.id}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="View details for ${escapeHtml(item.title)}">
        <div class="market-img-wrapper">
          ${imgUrl ? `
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500';">
          ` : `
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--bg-surface-active); color:var(--text-muted); font-size:1.8rem;">📦</div>
          `}
          <span class="market-category-chip">${escapeHtml(catLabel)}</span>
        </div>

        <div class="market-body">
          <div>
            <h3 class="market-title">${escapeHtml(item.title)}</h3>
            <p class="market-desc">${escapeHtml(item.description || 'No description provided.')}</p>
          </div>

          <div class="market-footer">
            <span class="market-price">$${priceFormatted}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="market-seller">👤 ${escapeHtml(item.sellerName || 'Campus Seller')}</span>
              <span style="font-size: 0.8rem; color: var(--accent-primary); font-weight: 600;" aria-hidden="true">→</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Opens the item details popup and populates it with the clicked item's data
 * @param {Object} item 
 * @param {HTMLElement} [triggerEl] 
 */
function openDetailModal(item, triggerEl) {
  if (!item) return;
  lastFocusedCard = triggerEl || document.activeElement;

  const modal = document.getElementById('market-detail-modal');
  if (!modal) return;

  // Ensure modal is directly attached to document.body (outside transformed containers)
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const catBadge = modal.querySelector('#detail-category-badge');
  const statusBadge = modal.querySelector('#detail-status-badge');
  const imgEl = modal.querySelector('#detail-image');
  const placeholderEl = modal.querySelector('#detail-placeholder');
  const priceEl = modal.querySelector('#detail-price');
  const titleEl = modal.querySelector('#detail-modal-title');
  const descEl = modal.querySelector('#detail-modal-desc');
  const metaContainer = modal.querySelector('#detail-meta-container');
  const closeBtn = modal.querySelector('#close-detail-modal-btn');

  // Title
  if (titleEl) {
    titleEl.textContent = item.title || 'Untitled Listing';
  }

  // Category & Status
  if (catBadge) {
    catBadge.textContent = formatCategoryBadge(item.category);
  }
  if (statusBadge) {
    statusBadge.textContent = item.status || 'AVAILABLE';
  }

  // Price
  if (priceEl) {
    const priceNum = Number(item.price);
    priceEl.textContent = isNaN(priceNum) ? '$0.00' : `$${priceNum.toFixed(2)}`;
  }

  // Description
  if (descEl) {
    if (item.description && item.description.trim()) {
      descEl.textContent = item.description.trim();
      descEl.style.fontStyle = 'normal';
      descEl.style.color = 'var(--text-primary)';
    } else {
      descEl.textContent = 'No additional description provided for this item.';
      descEl.style.fontStyle = 'italic';
      descEl.style.color = 'var(--text-muted)';
    }
  }

  // Image handling
  if (imgEl && placeholderEl) {
    if (item.imageUrl && item.imageUrl.trim()) {
      imgEl.src = item.imageUrl.trim();
      imgEl.alt = item.title ? `${item.title} photo` : 'Marketplace item image';
      imgEl.style.display = 'block';
      placeholderEl.style.display = 'none';

      imgEl.onerror = () => {
        imgEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
      };
    } else {
      imgEl.style.display = 'none';
      placeholderEl.style.display = 'flex';
    }
  }

  // Metadata items: Seller, ID, Listing Date, Condition, Pickup Location
  if (metaContainer) {
    const metaList = [];

    // Seller Name
    metaList.push(`
      <div class="item-details-meta-item">
        <span class="item-details-meta-label">Seller</span>
        <span class="item-details-meta-value">👤 ${escapeHtml(item.sellerName || 'Campus Seller')}</span>
      </div>
    `);

    // Item ID
    if (item.id) {
      metaList.push(`
        <div class="item-details-meta-item">
          <span class="item-details-meta-label">Listing ID</span>
          <span class="item-details-meta-value">#${escapeHtml(String(item.id))}</span>
        </div>
      `);
    }

    // Listing Date (if available)
    if (item.createdAt) {
      const formattedDate = formatListingDate(item.createdAt);
      if (formattedDate) {
        metaList.push(`
          <div class="item-details-meta-item">
            <span class="item-details-meta-label">Listed On</span>
            <span class="item-details-meta-value">📅 ${escapeHtml(formattedDate)}</span>
          </div>
        `);
      }
    }

    // Item condition (if available)
    if (item.condition) {
      metaList.push(`
        <div class="item-details-meta-item">
          <span class="item-details-meta-label">Condition</span>
          <span class="item-details-meta-value">${escapeHtml(item.condition)}</span>
        </div>
      `);
    }

    // Pickup location (if available)
    const pickupLoc = item.pickupLocation || item.location;
    if (pickupLoc) {
      metaList.push(`
        <div class="item-details-meta-item">
          <span class="item-details-meta-label">Campus Pickup</span>
          <span class="item-details-meta-value">📍 ${escapeHtml(pickupLoc)}</span>
        </div>
      `);
    }

    metaContainer.innerHTML = metaList.join('');
  }

  // Populate Senior Student Seller Contact Information & Actions
  renderSellerContactSection(modal, item);

  // Open modal and lock background scrolling
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Place keyboard focus on close button
  setTimeout(() => {
    closeBtn?.focus();
  }, 50);
}

/**
 * Renders the Senior Student Seller Contact Information Section & Action Buttons
 * @param {HTMLElement} modal 
 * @param {Object} item 
 */
function renderSellerContactSection(modal, item) {
  const section = modal.querySelector('#seller-contact-section');
  const cardContainer = modal.querySelector('#seller-contact-card');
  const actionsContainer = modal.querySelector('#seller-contact-actions');
  const badgeEl = modal.querySelector('#seller-status-badge');
  if (!section || !cardContainer || !actionsContainer) return;

  const sellerName = item.sellerName || 'Campus Senior Seller';
  const phone = (item.sellerPhone || '').trim();
  const email = (item.sellerEmail || '').trim();
  const whatsapp = (item.sellerWhatsapp || '').trim();
  const department = (item.sellerDepartment || '').trim();
  const academicYear = (item.sellerYear || '').trim();
  const avatarUrl = (item.sellerAvatarUrl || '').trim() ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sellerName)}`;

  const hasPhone = Boolean(phone);
  const hasEmail = Boolean(email);
  const hasWhatsapp = Boolean(whatsapp);
  const hasContactChannel = hasPhone || hasEmail || hasWhatsapp;
  const hasAcademicInfo = Boolean(department || academicYear);

  // Update header badge dynamically
  if (badgeEl) {
    if (academicYear.toLowerCase().includes('senior') || academicYear.toLowerCase().includes('year 4') || academicYear.toLowerCase().includes('year 3')) {
      badgeEl.textContent = '🎓 Senior Student';
      badgeEl.className = 'seller-badge senior';
    } else if (item.sellerId === 1 || sellerName.toLowerCase().includes('store')) {
      badgeEl.textContent = '🏛️ Campus Verified';
      badgeEl.className = 'seller-badge facility';
    } else if (hasAcademicInfo) {
      badgeEl.textContent = '🎓 Student Seller';
      badgeEl.className = 'seller-badge senior';
    } else {
      badgeEl.textContent = '👤 Campus Seller';
      badgeEl.className = 'seller-badge standard';
    }
  }

  // Case 1: When contact information is missing
  if (!hasContactChannel) {
    cardContainer.innerHTML = `
      <div class="seller-contact-empty">
        <span class="seller-contact-empty-icon" aria-hidden="true">ℹ️</span>
        <div class="seller-contact-empty-content">
          <p class="seller-contact-empty-title">Contact information is not available for this seller.</p>
          <p class="seller-contact-empty-desc">This seller has not provided a verified phone, college email, or WhatsApp contact. You may check student union boards or campus desk for assistance.</p>
        </div>
      </div>
    `;
    actionsContainer.innerHTML = '';
    return;
  }

  // Digits for telecommunication links
  const phoneTelDigits = phone.replace(/[^\d+]/g, '');
  const waDigits = whatsapp.replace(/[^\d]/g, '') || phoneTelDigits.replace(/[^\d]/g, '');

  // Case 2: Contact information is available
  cardContainer.innerHTML = `
    <div class="seller-profile-header">
      <div class="seller-avatar-wrapper">
        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(sellerName)}" class="seller-avatar-img" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=Senior';">
      </div>
      <div class="seller-profile-details">
        <div class="seller-name-row">
          <h4 class="seller-full-name">${escapeHtml(sellerName)}</h4>
          <span class="seller-verified-tick" title="Verified Campus Student">✓</span>
        </div>
        <div class="seller-academic-tags">
          ${department ? `
            <span class="seller-tag dept-tag" title="Department">
              <span class="tag-icon" aria-hidden="true">🏫</span>
              <span>${escapeHtml(department)}</span>
            </span>
          ` : ''}
          ${academicYear ? `
            <span class="seller-tag year-tag" title="Academic Standing">
              <span class="tag-icon" aria-hidden="true">🎓</span>
              <span>${escapeHtml(academicYear)}</span>
            </span>
          ` : ''}
        </div>
      </div>
    </div>

    <div class="seller-contact-list">
      ${hasPhone ? `
        <div class="seller-contact-item">
          <span class="contact-icon" aria-hidden="true">📞</span>
          <div class="contact-info">
            <span class="contact-label">Phone Number</span>
            <a href="tel:${escapeHtml(phoneTelDigits)}" class="contact-value-link" title="Call ${escapeHtml(phone)}">${escapeHtml(phone)}</a>
          </div>
        </div>
      ` : ''}

      ${hasEmail ? `
        <div class="seller-contact-item">
          <span class="contact-icon" aria-hidden="true">✉️</span>
          <div class="contact-info">
            <span class="contact-label">Campus Email</span>
            <a href="mailto:${escapeHtml(email)}" class="contact-value-link" title="Email ${escapeHtml(email)}">${escapeHtml(email)}</a>
          </div>
        </div>
      ` : ''}

      ${hasWhatsapp ? `
        <div class="seller-contact-item">
          <span class="contact-icon" aria-hidden="true">💬</span>
          <div class="contact-info">
            <span class="contact-label">WhatsApp Contact</span>
            <a href="https://wa.me/${escapeHtml(waDigits)}" target="_blank" rel="noopener noreferrer" class="contact-value-link" title="WhatsApp ${escapeHtml(whatsapp)}">${escapeHtml(whatsapp)}</a>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Render Action Buttons: Only display buttons when corresponding contact info is available
  const buttons = [];

  if (hasPhone) {
    buttons.push(`
      <a href="tel:${escapeHtml(phoneTelDigits)}" class="contact-action-btn btn-call" id="btn-call-seller" role="button">
        <span class="btn-icon" aria-hidden="true">📞</span>
        <span>Call Seller</span>
      </a>
    `);
  }

  if (hasEmail) {
    const emailSubject = encodeURIComponent(`CampusHub Marketplace Inquiry: ${item.title || 'Used Item'}`);
    const emailBody = encodeURIComponent(`Hi ${sellerName},\n\nI saw your listing for "${item.title || ''}" on CampusHub ($${Number(item.price || 0).toFixed(2)}) and I would like to purchase it from you.\n\nCould we arrange a campus meetup?\n\nBest regards,\nA Fellow Student`);
    buttons.push(`
      <a href="mailto:${escapeHtml(email)}?subject=${emailSubject}&body=${emailBody}" class="contact-action-btn btn-email" id="btn-email-seller" role="button">
        <span class="btn-icon" aria-hidden="true">✉️</span>
        <span>Email Seller</span>
      </a>
    `);
  }

  if (hasWhatsapp || (hasPhone && phoneTelDigits.length >= 7)) {
    const targetWaDigits = waDigits || phoneTelDigits.replace(/[^\d]/g, '');
    const waText = encodeURIComponent(`Hi ${sellerName}, I found your listing "${item.title || ''}" for $${Number(item.price || 0).toFixed(2)} on CampusHub. Is it still available for purchase?`);
    buttons.push(`
      <a href="https://wa.me/${escapeHtml(targetWaDigits)}?text=${waText}" target="_blank" rel="noopener noreferrer" class="contact-action-btn btn-whatsapp" id="btn-whatsapp-seller" role="button">
        <span class="btn-icon" aria-hidden="true">💬</span>
        <span>WhatsApp</span>
      </a>
    `);
  }

  // Copy Contact button
  buttons.push(`
    <button type="button" class="contact-action-btn btn-copy" id="btn-copy-contact" aria-label="Copy seller contact details to clipboard">
      <span class="btn-icon" aria-hidden="true">📋</span>
      <span id="copy-btn-label">Copy Contact</span>
    </button>
  `);

  actionsContainer.innerHTML = buttons.join('');

  // Wire up Copy Contact button
  const copyBtn = actionsContainer.querySelector('#btn-copy-contact');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const copyLines = [
        `🎓 CampusHub Senior Seller Contact`,
        `Name: ${sellerName}`,
        department ? `Department: ${department}` : null,
        academicYear ? `Academic Year: ${academicYear}` : null,
        phone ? `Phone: ${phone}` : null,
        email ? `Email: ${email}` : null,
        whatsapp ? `WhatsApp: ${whatsapp}` : null,
        `Item: ${item.title || 'Marketplace Item'} ($${Number(item.price || 0).toFixed(2)})`,
        item.id ? `Listing ID: #${item.id}` : null
      ].filter(Boolean).join('\n');

      const executeSuccessFeedback = () => {
        showToast('Seller contact copied to clipboard!', 'success');
        const labelEl = copyBtn.querySelector('#copy-btn-label');
        if (labelEl) {
          const original = labelEl.textContent;
          labelEl.textContent = '✓ Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            labelEl.textContent = original;
            copyBtn.classList.remove('copied');
          }, 2500);
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyLines)
          .then(executeSuccessFeedback)
          .catch(() => {
            fallbackCopy(copyLines);
            executeSuccessFeedback();
          });
      } else {
        fallbackCopy(copyLines);
        executeSuccessFeedback();
      }
    });
  }
}

/**
 * Fallback clipboard copy using temporary textarea
 * @param {string} text 
 */
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
  } catch (_) {}
  document.body.removeChild(ta);
}

/**
 * Closes the item details modal and restores focus and scrolling
 */
function closeDetailModal() {
  const modal = document.getElementById('market-detail-modal');
  if (!modal || !modal.classList.contains('open')) return;

  modal.classList.remove('open');
  document.body.style.overflow = '';

  // Return focus to triggering card
  if (lastFocusedCard && typeof lastFocusedCard.focus === 'function') {
    lastFocusedCard.focus();
  }
  lastFocusedCard = null;
}

/**
 * Binds DOM event listeners
 */
function bindEvents() {
  if (!viewContainer) return;

  // 1. Category Filter Bar Click Handling
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

  // 2. Event Delegation for Marketplace Cards (Click & Keyboard activation)
  const gridContainer = viewContainer.querySelector('#marketplace-grid-container');
  if (gridContainer) {
    // Mouse click on card
    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.marketplace-card, .market-card');
      if (!card) return;

      const itemId = Number(card.getAttribute('data-id'));
      const item = (store.getState().marketplace || []).find((i) => i.id === itemId);
      if (item) {
        openDetailModal(item, card);
      }
    });

    // Keyboard activation on card (Enter or Space)
    gridContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.marketplace-card, .market-card');
        if (card) {
          e.preventDefault();
          const itemId = Number(card.getAttribute('data-id'));
          const item = (store.getState().marketplace || []).find((i) => i.id === itemId);
          if (item) {
            openDetailModal(item, card);
          }
        }
      }
    });
  }

  // 3. Item Detail Modal Controls (Close button, backdrop click, Escape key)
  const detailModal = document.getElementById('market-detail-modal');
  if (detailModal) {
    // Defensive check: ensure attached to document.body
    if (detailModal.parentElement !== document.body) {
      document.body.appendChild(detailModal);
    }

    const closeDetailBtn = detailModal.querySelector('#close-detail-modal-btn');
    const dismissDetailBtn = detailModal.querySelector('#dismiss-detail-btn');

    closeDetailBtn?.addEventListener('click', closeDetailModal);
    dismissDetailBtn?.addEventListener('click', closeDetailModal);

    // Click on backdrop closes modal; click inside modal sheet does not close
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) {
        closeDetailModal();
      }
    });
  }

  // Global Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const detailModal = document.getElementById('market-detail-modal');
      if (detailModal?.classList.contains('open')) {
        closeDetailModal();
      }
      const createModal = document.getElementById('create-market-modal');
      if (createModal?.classList.contains('open')) {
        closeCreateModal();
      }
    }
  });

  // 4. Create Listing Modal Controls & Image Upload Preview
  const openCreateBtn = viewContainer.querySelector('#open-market-modal-btn');
  const closeCreateBtn = document.getElementById('close-market-modal-btn') || viewContainer.querySelector('#close-market-modal-btn');
  const cancelCreateBtn = document.getElementById('cancel-market-modal-btn') || viewContainer.querySelector('#cancel-market-modal-btn');
  const form = document.getElementById('create-market-form') || viewContainer.querySelector('#create-market-form');
  const dropzone = document.getElementById('image-upload-dropzone') || viewContainer.querySelector('#image-upload-dropzone');
  const fileInput = document.getElementById('item-image-file') || viewContainer.querySelector('#item-image-file');
  const previewImg = document.getElementById('image-preview-element') || viewContainer.querySelector('#image-preview-element');
  const placeholderText = document.getElementById('upload-placeholder-text') || viewContainer.querySelector('#upload-placeholder-text');

  const openCreateModal = () => {
    const modal = document.getElementById('create-market-modal');
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    modal?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeCreateModal = () => {
    const modal = document.getElementById('create-market-modal');
    modal?.classList.remove('open');
    document.body.style.overflow = '';
    form?.reset();
    uploadedBase64Image = '';
    if (previewImg) previewImg.style.display = 'none';
    if (placeholderText) placeholderText.style.display = 'block';
  };

  openCreateBtn?.addEventListener('click', openCreateModal);
  closeCreateBtn?.addEventListener('click', closeCreateModal);
  cancelCreateBtn?.addEventListener('click', closeCreateModal);

  const modalBackdrop = document.getElementById('create-market-modal');
  modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeCreateModal();
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
    const deptInput = viewContainer.querySelector('#item-seller-dept')?.value.trim();
    const yearInput = viewContainer.querySelector('#item-seller-year')?.value.trim();
    const phoneInput = viewContainer.querySelector('#item-seller-phone')?.value.trim();
    const whatsappInput = viewContainer.querySelector('#item-seller-whatsapp')?.value.trim();
    const emailInput = viewContainer.querySelector('#item-seller-email')?.value.trim() || currentUser?.email || 'student@campus.edu';

    const payload = {
      sellerId: currentUser?.id || 2,
      sellerName: currentUser?.name || 'John Doe',
      title: viewContainer.querySelector('#item-title').value.trim(),
      category: viewContainer.querySelector('#item-category').value,
      price: parseFloat(viewContainer.querySelector('#item-price').value) || 0,
      description: viewContainer.querySelector('#item-desc').value.trim(),
      imageUrl: uploadedBase64Image || fallbackImg,
      sellerDepartment: deptInput || null,
      sellerYear: yearInput || null,
      sellerPhone: phoneInput || null,
      sellerEmail: emailInput || null,
      sellerWhatsapp: whatsappInput || null,
      sellerAvatarUrl: currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.name || 'User')}`
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
      closeCreateModal();
    } catch (err) {
      console.error('Failed to create marketplace item:', err);
      // Optimistic append if offline
      store.addMarketplaceItem({ ...payload, id: Date.now(), status: 'AVAILABLE' });
      showToast('Listing created in offline mode', 'info');
      closeCreateModal();
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
