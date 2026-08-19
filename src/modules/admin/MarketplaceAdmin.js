/**
 * UNIFIED ADMIN PANEL - Marketplace Management Module
 */
import { stateEngine } from '../../store/stateEngine.js';
import { makeAccessibleModal } from '../../components/modalA11y.js';
import { renderCategoryIcon } from '../../utils/categoryIcon.js';

export function renderMarketplaceAdmin(container) {
  function render() {
    const state = stateEngine.getState();

    // Split from product_mgmt on purpose (see server/src/utils/permissions.ts) -
    // a dedicated moderator approving new submissions shouldn't automatically
    // get full product/category/banner management too. Each tab below is
    // gated on its own specific permission, not just "got into this panel at
    // all" - the backend enforces the same split, so showing a tab someone
    // can't actually use would just mean every action on it 403s.
    //
    // Pending Approval is additionally excluded for the full Administrator
    // role itself, by explicit request - product moderation is reserved for
    // a Sub-Administrator holding product_approval only, so fullPermissions()
    // returning true for everything doesn't grant this one tab (see
    // requireExclusivePermission in server/src/middleware/auth.ts, which
    // enforces the same exclusion server-side).
    const perms = state.currentUser?.permissions || {};
    const isFullAdmin = state.currentUser?.role === 'admin';
    const tabPerms = {
      pending: !!perms.product_approval && !isFullAdmin,
      products: !!perms.product_mgmt,
      categories: !!perms.category_mgmt,
      banners: !!perms.banner_mgmt,
    };
    const firstAllowedTab = ['pending', 'products', 'categories', 'banners'].find((t) => tabPerms[t]) || 'pending';
    let activeTab = state.ui.marketplaceAdminTab || firstAllowedTab;
    if (!tabPerms[activeTab]) activeTab = firstAllowedTab;

    if (tabPerms.products && state.loading.products === undefined) stateEngine.loadProducts().catch(() => {});
    if (tabPerms.categories && state.loading.categories === undefined) stateEngine.loadCategories().catch(() => {});
    if (tabPerms.banners && state.loading.banners === undefined) stateEngine.loadBanners().catch(() => {});
    // Loaded unconditionally (not just when that tab is active) so the
    // pending-count badge on the tab button itself is accurate no matter
    // which tab the admin currently has open.
    if (tabPerms.pending && state.loading.pendingProducts === undefined) stateEngine.loadPendingProducts().catch(() => {});

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #0F172A; font-size: 1.3rem;">🛒 Marketplace Management</h2>
            <p style="color: #64748B; font-size: 0.9rem;">
              Manage product listings, categories, homepage promotional banners, and featuring controls.
            </p>
          </div>

          <div style="display: flex; gap: 0.5rem; background: #F1F5F9; padding: 4px; border-radius: 12px; border: 1px solid #E2E8F0; flex-wrap: wrap;">
            ${tabPerms.pending ? `
              <button id="mkt-adm-pending" class="btn btn-sm" style="color:${activeTab==='pending'?'#fff':'#64748B'}; background:${activeTab==='pending'?'#D97706':'transparent'}; position: relative;">
                🕒 Pending Approval (${state.pendingProducts.length})
              </button>
            ` : ''}
            ${tabPerms.products ? `
              <button id="mkt-adm-products" class="btn btn-sm" style="color:${activeTab==='products'?'#fff':'#64748B'}; background:${activeTab==='products'?'var(--primary)':'transparent'};">
                📦 Products (${state.products.length})
              </button>
            ` : ''}
            ${tabPerms.categories ? `
              <button id="mkt-adm-categories" class="btn btn-sm" style="color:${activeTab==='categories'?'#fff':'#64748B'}; background:${activeTab==='categories'?'var(--primary)':'transparent'};">
                📁 Categories (${state.categories.length})
              </button>
            ` : ''}
            ${tabPerms.banners ? `
              <button id="mkt-adm-banners" class="btn btn-sm" style="color:${activeTab==='banners'?'#fff':'#64748B'}; background:${activeTab==='banners'?'var(--primary)':'transparent'};">
                🖼️ Ad Banners (${state.banners.length})
              </button>
            ` : ''}
          </div>
        </div>

        ${state.error ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
            ⚠️ ${escapeHtml(state.error)}
          </div>
        ` : ''}

        ${activeTab === 'pending' ? `
          <!-- PENDING APPROVAL QUEUE - new listings are never public until an
               admin acts on them here (see products.routes.ts POST / which
               creates every listing as PENDING now, not ACTIVE). -->
          ${state.pendingProducts.length === 0 ? `
            <div style="text-align: center; padding: 3rem; background: #F8FAFC; border-radius: var(--radius-md); border: 1px dashed #E2E8F0; color: #64748B;">
              ✅ No listings awaiting review right now.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${state.pendingProducts.map(prod => `
                <div class="glass-panel" style="padding: 1.25rem 1.4rem; border-radius: 20px; border-left: 4px solid #D97706;">
                  <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" class="view-prod-image-btn" data-id="${prod.id}" title="Click to view full size" style="width: 84px; height: 84px; border-radius: 12px; object-fit: cover; flex-shrink: 0; cursor: zoom-in;">

                    <div style="flex: 1; min-width: 220px;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                        <div>
                          <h4 style="color: #0F172A; font-size: 1.05rem;">${escapeHtml(prod.title)}</h4>
                          <div style="font-size: 0.85rem; color: #64748B;">
                            👤 ${escapeHtml(prod.sellerName)} • 📁 ${escapeHtml(prod.category || 'General')} • 📍 ${escapeHtml(prod.district)}
                          </div>
                        </div>
                        <strong style="color: var(--primary); font-size: 1.15rem; white-space: nowrap;">${prod.price.toLocaleString()} RWF</strong>
                      </div>

                      <p style="font-size: 0.88rem; color: #475569; margin-top: 0.6rem; margin-bottom: 0;">
                        ${escapeHtml(prod.description)}
                      </p>

                      <div style="font-size: 0.78rem; color: #94A3B8; margin-top: 0.5rem;">
                        Submitted ${new Date(prod.postedDate).toLocaleString()}
                      </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center; flex-shrink: 0;">
                      <button class="btn btn-sm view-prod-image-btn" data-id="${prod.id}" style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;">
                        🔍 View Image${prod.images.length > 1 ? `s (${prod.images.length})` : ''}
                      </button>
                      <button class="btn btn-sm approve-prod-btn" data-id="${prod.id}" data-title="${escapeHtml(prod.title)}" style="background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0;">
                        ✅ Approve
                      </button>
                      <button class="btn btn-sm reject-prod-btn" data-id="${prod.id}" data-title="${escapeHtml(prod.title)}" style="background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA;">
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        ` : activeTab === 'products' ? `
          <!-- PRODUCTS MANAGEMENT -->
          <div class="custom-table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>District</th>
                  <th>Seller</th>
                  <th>Status</th>
                  <th>Promotions</th>
                  <th class="tbl-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${state.products.map(prod => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                        <div>
                          <div style="font-weight: 600; color: #0F172A;">${escapeHtml(prod.title)}</div>
                          <div style="font-size: 0.78rem; color: #64748B;">Posted: ${new Date(prod.postedDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(prod.category || 'General')}</td>
                    <td><strong style="color: var(--primary);">${prod.price.toLocaleString()} RWF</strong></td>
                    <td>${escapeHtml(prod.district)}</td>
                    <td>${escapeHtml(prod.sellerName)}</td>
                    <td>
                      <span class="badge badge-${prod.status}">${prod.status.replace('_', ' ').toUpperCase()}</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px;">
                        <button class="btn btn-sm flag-btn" data-id="${prod.id}" data-flag="isFeatured" style="background:${prod.isFeatured?'var(--accent-gold-light)':'#F1F5F9'}; color:${prod.isFeatured?'var(--accent-gold)':'#64748B'}; padding: 2px 6px; font-size: 0.75rem;">
                          ⭐ Featured
                        </button>
                        <button class="btn btn-sm flag-btn" data-id="${prod.id}" data-flag="isTrending" style="background:${prod.isTrending?'var(--primary-light)':'#F1F5F9'}; color:${prod.isTrending?'var(--primary)':'#64748B'}; padding: 2px 6px; font-size: 0.75rem;">
                          🔥 Trending
                        </button>
                      </div>
                    </td>
                    <td class="tbl-actions-col">
                      <div style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-danger del-prod-btn" data-id="${prod.id}">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : activeTab === 'categories' ? `
          <!-- CATEGORY MANAGEMENT -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
            <button id="add-cat-btn" class="btn btn-primary btn-sm">
              ➕ Add New Category
            </button>
          </div>

          <div class="custom-table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>Category Name</th>
                  <th>Order</th>
                  <th>Listed Products</th>
                  <th>Status</th>
                  <th class="tbl-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${state.categories.map(cat => `
                  <tr>
                    <td>${renderCategoryIcon(cat.icon, { size: 34, alt: cat.name })}</td>
                    <td><strong style="color: #0F172A;">${escapeHtml(cat.name)}</strong></td>
                    <td>${cat.order}</td>
                    <td>${cat.count} Products</td>
                    <td>
                      <span class="badge badge-active">ENABLED</span>
                    </td>
                    <td class="tbl-actions-col">
                      <button class="btn btn-sm btn-secondary change-cat-icon-btn" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" title="Upload a logo for this category">
                        Change Icon
                      </button>
                      <button class="btn btn-sm btn-danger req-del-cat-btn" data-id="${cat.id}" title="Requires approval from another Administrator before it takes effect">
                        🔒 Delete Category
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <!-- BANNERS MANAGEMENT -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
            <button id="add-banner-btn" class="btn btn-primary btn-sm">
              ➕ Add New Banner
            </button>
          </div>

          ${state.banners.length === 0 ? `
            <div style="text-align: center; padding: 3rem; background: #F8FAFC; border-radius: var(--radius-md); border: 1px dashed #E2E8F0; color: #64748B;">
              No promotional banners configured yet.
            </div>
          ` : `
            <div class="grid-2">
              ${state.banners.map(b => `
                <div class="glass-card" style="padding: 1.5rem;">
                  <div style="height: 140px; border-radius: var(--radius-sm); overflow: hidden; background: #000; margin-bottom: 1rem;">
                    <img src="${b.image}" alt="${escapeHtml(b.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                  </div>
                  <h4 style="color: #0F172A; margin-bottom: 0.25rem;">${escapeHtml(b.title)}</h4>
                  <p style="font-size: 0.85rem; color: #64748B; margin-bottom: 1rem;">${escapeHtml(b.subtitle)}</p>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="badge badge-active">${b.status}</span>
                    <button class="btn btn-sm btn-danger del-banner-btn" data-id="${b.id}">
                      Delete
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        `}
      </div>
    `;

    // Event Handlers
    container.querySelector('#mkt-adm-pending')?.addEventListener('click', () => stateEngine.setUI({ marketplaceAdminTab: 'pending' }));
    container.querySelector('#mkt-adm-products')?.addEventListener('click', () => stateEngine.setUI({ marketplaceAdminTab: 'products' }));
    container.querySelector('#mkt-adm-categories')?.addEventListener('click', () => stateEngine.setUI({ marketplaceAdminTab: 'categories' }));
    container.querySelector('#mkt-adm-banners')?.addEventListener('click', () => stateEngine.setUI({ marketplaceAdminTab: 'banners' }));

    container.querySelectorAll('.view-prod-image-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = state.pendingProducts.find(p => p.id === btn.dataset.id);
        if (prod) openImageLightbox(prod.images, prod.title);
      });
    });

    container.querySelectorAll('.approve-prod-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Approve "${btn.dataset.title}"? It will go live on the marketplace immediately for 6 months.`)) return;
        try {
          await stateEngine.approveProduct(btn.dataset.id);
        } catch (err) { /* handled via state.error */ }
      });
    });

    container.querySelectorAll('.reject-prod-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reason = prompt(`Why is "${btn.dataset.title}" being rejected? (shown to the seller)`);
        if (!reason) return;
        try {
          await stateEngine.rejectProduct(btn.dataset.id, reason);
        } catch (err) { /* handled via state.error */ }
      });
    });

    container.querySelectorAll('.flag-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await stateEngine.toggleProductFlag(btn.dataset.id, btn.dataset.flag);
        } catch (err) { /* state.error already set, re-render shows it */ }
      });
    });

    container.querySelectorAll('.del-prod-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this product?')) {
          try {
            await stateEngine.deleteProduct(btn.dataset.id);
          } catch (err) { /* handled via state.error */ }
        }
      });
    });

    container.querySelectorAll('.req-del-cat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await stateEngine.requestDeleteCategory(btn.dataset.id);
          alert('Created Critical Approval Request for Category Deletion. A second Administrator must approve this request before deletion.');
        } catch (err) { /* handled via state.error */ }
      });
    });

    container.querySelector('#add-cat-btn')?.addEventListener('click', () => {
      openCategoryModal({
        title: 'Add New Category',
        confirmLabel: 'Create Category',
        returnFocusTo: '#add-cat-btn',
        onSubmit: ({ name, icon }) => stateEngine.addCategory(name, icon),
      });
    });

    container.querySelectorAll('.change-cat-icon-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openCategoryModal({
          title: 'Change Category Icon',
          categoryName: btn.dataset.name,
          confirmLabel: 'Save Icon',
          returnFocusTo: `.change-cat-icon-btn[data-id="${btn.dataset.id}"]`,
          onSubmit: ({ icon }) => stateEngine.updateCategoryIcon(btn.dataset.id, icon),
        });
      });
    });

    container.querySelector('#add-banner-btn')?.addEventListener('click', async () => {
      const title = prompt('Enter Banner Title (e.g. "Season Sale - Up to 30% Off"):');
      if (title) {
        const imageUrl = prompt('Enter Banner Image URL:');
        if (imageUrl) {
          try {
            await stateEngine.createBanner(title, imageUrl);
          } catch (err) { /* handled via state.error */ }
        }
      }
    });

    container.querySelectorAll('.del-banner-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this promotional banner?')) {
          try {
            await stateEngine.deleteBanner(btn.dataset.id);
          } catch (err) { /* handled via state.error */ }
        }
      });
    });
  }

  render();
}

// Approval decisions were being made off an 84x84px thumbnail with no way to
// see the rest of a listing's images - a moderator asked for a real way to
// inspect the photo(s) before approving/rejecting. Appended to document.body
// (not the module's own container) so it survives the next stateEngine
// re-render, which would otherwise wipe out an open overlay mid-view.
function openImageLightbox(images, title) {
  let idx = 0;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(2,6,23,0.88); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 2rem;';

  function paint() {
    overlay.innerHTML = `
      <div style="position: relative; max-width: min(90vw, 900px); max-height: 90vh; display: flex; flex-direction: column; align-items: center; gap: 0.85rem;">
        <button id="lightbox-close-btn" title="Close" style="position: absolute; top: -46px; right: 0; background: rgba(255,255,255,0.12); color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 1.1rem; cursor: pointer;">✕</button>
        <img src="${images[idx]}" alt="${escapeHtml(title)}" style="max-width: 100%; max-height: 75vh; border-radius: 12px; object-fit: contain; background: #0F172A; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
        <div style="color: #fff; font-weight: 700; font-size: 0.95rem; text-align: center;">${escapeHtml(title)}</div>
        ${images.length > 1 ? `
          <div style="display: flex; align-items: center; gap: 1rem; color: #fff; font-size: 0.85rem;">
            <button id="lightbox-prev-btn" style="background: rgba(255,255,255,0.12); color: #fff; border: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">‹</button>
            <span>${idx + 1} / ${images.length}</span>
            <button id="lightbox-next-btn" style="background: rgba(255,255,255,0.12); color: #fff; border: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">›</button>
          </div>
        ` : ''}
      </div>
    `;
    overlay.querySelector('#lightbox-close-btn').addEventListener('click', close);
    overlay.querySelector('#lightbox-prev-btn')?.addEventListener('click', () => { idx = (idx - 1 + images.length) % images.length; paint(); });
    overlay.querySelector('#lightbox-next-btn')?.addEventListener('click', () => { idx = (idx + 1) % images.length; paint(); });
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && images.length > 1) { idx = (idx - 1 + images.length) % images.length; paint(); }
    else if (e.key === 'ArrowRight' && images.length > 1) { idx = (idx + 1) % images.length; paint(); }
  }

  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  paint();
  document.body.appendChild(overlay);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// The category-creation flow used two chained window.prompt() calls, the
// second asking for an emoji. A native prompt can only return typed text, so
// "give this category our logo" was not expressible - the best an admin could
// do was paste an emoji and hope it read as a brand. This is the same flow
// with a real form: a name, and an icon that can be an uploaded image.
//
// Appended to document.body rather than the panel's own container, because
// the upload resolves through stateEngine and the resulting notify() re-renders
// that container - a modal parented to it would be wiped out mid-upload.
function openCategoryModal({ title, categoryName = '', confirmLabel, onSubmit, returnFocusTo }) {
  const nameLocked = categoryName !== '';
  let pickedFile = null;
  let previewUrl = null;
  let emoji = '';
  let busy = false;
  let error = '';
  let close = () => {};
  let nameDraft = categoryName;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(2,6,23,0.7); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 1.5rem;';

  function nameValue() {
    return nameLocked ? categoryName : (overlay.querySelector('#cat-name-input')?.value.trim() || '');
  }

  function canSubmit() {
    return !busy && nameValue().length >= 2 && Boolean(pickedFile || emoji.trim());
  }

  function paint() {
    const ok = canSubmit();

    overlay.innerHTML = `
      <div style="background: #fff; border-radius: 16px; width: min(92vw, 460px); max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.35);">
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 1.05rem; color: #0F172A;">${escapeHtml(title)}</strong>
          <button id="cat-modal-close" title="Close" style="background: #F1F5F9; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 0.95rem; color: #475569;">&#10005;</button>
        </div>

        <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.15rem;">
          ${nameLocked ? `
            <div style="font-size: 0.9rem; color: #475569;">
              Category: <strong style="color: #0F172A;">${escapeHtml(categoryName)}</strong>
            </div>
          ` : `
            <label style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.85rem; font-weight: 600; color: #334155;">
              Category name
              <input id="cat-name-input" type="text" value="${escapeHtml(nameDraft)}" placeholder="e.g. Electronics &amp; Tech" autocomplete="off"
                style="border: 1px solid #CBD5E1; border-radius: 10px; padding: 0.6rem 0.75rem; font-size: 0.92rem; outline: none; font-family: inherit;">
            </label>
          `}

          <div style="display: flex; flex-direction: column; gap: 0.55rem;">
            <span style="font-size: 0.85rem; font-weight: 600; color: #334155;">Category icon</span>

            <div style="display: flex; align-items: center; gap: 0.9rem;">
              <div style="width: 68px; height: 68px; border-radius: 12px; border: 1px dashed #CBD5E1; background: #F8FAFC; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                ${previewUrl
                  ? `<img src="${previewUrl}" alt="" style="width: 100%; height: 100%; object-fit: contain;">`
                  : emoji.trim()
                    ? `<span style="font-size: 2rem;">${escapeHtml(emoji.trim())}</span>`
                    : `<span style="color: #94A3B8; font-size: 1.4rem;">&#9633;</span>`}
              </div>

              <div style="flex: 1; display: flex; flex-direction: column; gap: 0.4rem; min-width: 0;">
                <button id="cat-pick-btn" type="button" style="background: #0F172A; color: #fff; border: none; border-radius: 9px; padding: 0.55rem 0.9rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                  Upload logo
                </button>
                <span style="font-size: 0.72rem; color: #64748B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${pickedFile ? escapeHtml(pickedFile.name) : 'PNG, JPG, WEBP or GIF &middot; up to 5MB'}
                </span>
                ${pickedFile ? `<button id="cat-clear-file" type="button" style="background: none; border: none; color: #DC2626; font-size: 0.75rem; cursor: pointer; text-align: left; padding: 0;">Remove image</button>` : ''}
              </div>
              <input id="cat-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display: none;">
            </div>

            <div style="display: flex; align-items: center; gap: 0.6rem; margin-top: 0.15rem;">
              <span style="flex: 1; height: 1px; background: #E2E8F0;"></span>
              <span style="font-size: 0.7rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.04em;">or use an emoji</span>
              <span style="flex: 1; height: 1px; background: #E2E8F0;"></span>
            </div>

            <input id="cat-emoji-input" type="text" value="${escapeHtml(emoji)}" maxlength="4" ${pickedFile ? 'disabled' : ''}
              style="border: 1px solid #CBD5E1; border-radius: 10px; padding: 0.5rem 0.7rem; font-size: 1.1rem; width: 90px; text-align: center; outline: none; font-family: inherit; ${pickedFile ? 'opacity: 0.45;' : ''}">
          </div>

          ${error ? `<div style="background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; border-radius: 9px; padding: 0.6rem 0.75rem; font-size: 0.82rem;">${escapeHtml(error)}</div>` : ''}
        </div>

        <div style="padding: 1rem 1.5rem; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 0.6rem;">
          <button id="cat-cancel-btn" type="button" style="background: #F1F5F9; color: #334155; border: none; border-radius: 9px; padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;">Cancel</button>
          <button id="cat-submit-btn" type="button" ${ok ? '' : 'disabled'}
            style="background: ${ok ? '#04562D' : '#94A3B8'}; color: #fff; border: none; border-radius: 9px; padding: 0.55rem 1.15rem; font-size: 0.85rem; font-weight: 700; cursor: ${ok ? 'pointer' : 'not-allowed'};">
            ${busy ? 'Saving&hellip;' : escapeHtml(confirmLabel)}
          </button>
        </div>
      </div>
    `;
    bind();
  }

  function refreshSubmitState() {
    const btn = overlay.querySelector('#cat-submit-btn');
    if (!btn) return;
    const ok = canSubmit();
    btn.disabled = !ok;
    btn.style.background = ok ? '#04562D' : '#94A3B8';
    btn.style.cursor = ok ? 'pointer' : 'not-allowed';
  }

  function bind() {
    const fileInput = overlay.querySelector('#cat-file-input');

    overlay.querySelector('#cat-pick-btn')?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      // Same 5MB ceiling the server enforces (server/src/routes/uploads.routes.ts),
      // checked here so an oversized file is refused before it is sent.
      if (file.size > 5 * 1024 * 1024) {
        error = 'That image is larger than 5MB. Please choose a smaller file.';
        paint();
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      pickedFile = file;
      previewUrl = URL.createObjectURL(file);
      emoji = '';
      error = '';
      paint();
    });

    overlay.querySelector('#cat-clear-file')?.addEventListener('click', () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      pickedFile = null;
      previewUrl = null;
      paint();
    });

    // Typing repaints for the live preview, which destroys the input, so the
    // caret has to be put back by hand.
    overlay.querySelector('#cat-emoji-input')?.addEventListener('input', (e) => {
      emoji = e.target.value;
      paint();
      const next = overlay.querySelector('#cat-emoji-input');
      next?.focus();
    });

    // The name field deliberately does NOT repaint - nothing on screen depends
    // on it except whether Create is enabled, and repainting mid-word would
    // scramble the caret.
    overlay.querySelector('#cat-name-input')?.addEventListener('input', (e) => {
      nameDraft = e.target.value;
      refreshSubmitState();
    });

    overlay.querySelector('#cat-modal-close')?.addEventListener('click', () => close());
    overlay.querySelector('#cat-cancel-btn')?.addEventListener('click', () => close());
    overlay.querySelector('#cat-submit-btn')?.addEventListener('click', submit);
  }

  async function submit() {
    if (busy) return;
    const name = nameValue();
    if (name.length < 2) {
      error = 'Please enter a category name of at least 2 characters.';
      paint();
      return;
    }
    if (!pickedFile && !emoji.trim()) {
      error = 'Upload a logo or enter an emoji for this category.';
      paint();
      return;
    }

    busy = true;
    error = '';
    paint();

    try {
      // Upload first. If storage fails there is no half-made category left
      // behind holding a placeholder icon nobody chose.
      const icon = pickedFile
        ? await stateEngine.uploadCategoryIcon(pickedFile)
        : emoji.trim();
      await onSubmit({ name, icon });
    } catch (err) {
      busy = false;
      error = err?.message || 'Something went wrong. Please try again.';
      paint();
      return;
    }

    // Deliberately outside the try. The category has been created by this
    // point, so a throw in here is not a failed save and must not be reported
    // as one - an earlier version had close() inside the try and a bug in it
    // surfaced as "your category could not be created" over a category that
    // very much had been.
    close();
  }

  document.body.appendChild(overlay);
  paint();

  ({ close } = makeAccessibleModal(overlay, {
    label: title,
    returnFocusTo,
    onClose: () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
  }));

  overlay.querySelector(nameLocked ? '#cat-pick-btn' : '#cat-name-input')?.focus();
  return close;
}
