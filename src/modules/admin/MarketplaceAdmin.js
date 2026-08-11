/**
 * UNIFIED ADMIN PANEL - Marketplace Management Module
 */
import { stateEngine } from '../../store/stateEngine.js';

export function renderMarketplaceAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const activeTab = state.ui.marketplaceAdminTab || 'products';

    if (state.loading.products === undefined) stateEngine.loadProducts().catch(() => {});
    if (state.loading.categories === undefined) stateEngine.loadCategories().catch(() => {});
    if (state.loading.banners === undefined) stateEngine.loadBanners().catch(() => {});
    // Loaded unconditionally (not just when that tab is active) so the
    // pending-count badge on the tab button itself is accurate no matter
    // which tab the admin currently has open.
    if (state.loading.pendingProducts === undefined) stateEngine.loadPendingProducts().catch(() => {});

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
            <button id="mkt-adm-pending" class="btn btn-sm" style="color:${activeTab==='pending'?'#fff':'#64748B'}; background:${activeTab==='pending'?'#D97706':'transparent'}; position: relative;">
              🕒 Pending Approval (${state.pendingProducts.length})
            </button>
            <button id="mkt-adm-products" class="btn btn-sm" style="color:${activeTab==='products'?'#fff':'#64748B'}; background:${activeTab==='products'?'var(--primary)':'transparent'};">
              📦 Products (${state.products.length})
            </button>
            <button id="mkt-adm-categories" class="btn btn-sm" style="color:${activeTab==='categories'?'#fff':'#64748B'}; background:${activeTab==='categories'?'var(--primary)':'transparent'};">
              📁 Categories (${state.categories.length})
            </button>
            <button id="mkt-adm-banners" class="btn btn-sm" style="color:${activeTab==='banners'?'#fff':'#64748B'}; background:${activeTab==='banners'?'var(--primary)':'transparent'};">
              🖼️ Ad Banners (${state.banners.length})
            </button>
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
                    <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" style="width: 84px; height: 84px; border-radius: 12px; object-fit: cover; flex-shrink: 0;">

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
                    <td style="font-size: 1.5rem;">${cat.icon}</td>
                    <td><strong style="color: #0F172A;">${escapeHtml(cat.name)}</strong></td>
                    <td>${cat.order}</td>
                    <td>${cat.count} Products</td>
                    <td>
                      <span class="badge badge-active">ENABLED</span>
                    </td>
                    <td class="tbl-actions-col">
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

    container.querySelector('#add-cat-btn')?.addEventListener('click', async () => {
      const name = prompt('Enter New Category Name:');
      if (name) {
        const icon = prompt('Enter Category Emoji/Icon (e.g. 📦, 💻, 🌾):') || '📦';
        try {
          await stateEngine.addCategory(name, icon);
        } catch (err) { /* handled via state.error */ }
      }
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
