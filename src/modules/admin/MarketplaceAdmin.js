/**
 * UNIFIED ADMIN PANEL - Marketplace Management Module
 */
import { stateEngine } from '../../store/stateEngine.js';

export function renderMarketplaceAdmin(container) {
  let activeTab = 'products'; // 'products' | 'categories' | 'banners'

  function render() {
    const state = stateEngine.getState();

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #fff; font-size: 1.5rem;">🛒 Marketplace Management</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Manage product listings, categories, homepage promotional banners, and featuring controls.
            </p>
          </div>

          <div style="display: flex; gap: 0.5rem; background: var(--navy-card); padding: 4px; border-radius: 12px; border: 1px solid var(--navy-border);">
            <button id="mkt-adm-products" class="btn btn-sm" style="color:${activeTab==='products'?'#fff':'var(--text-muted)'}; background:${activeTab==='products'?'var(--primary)':'transparent'};">
              📦 Products (${state.products.length})
            </button>
            <button id="mkt-adm-categories" class="btn btn-sm" style="color:${activeTab==='categories'?'#fff':'var(--text-muted)'}; background:${activeTab==='categories'?'var(--primary)':'transparent'};">
              📁 Categories (${state.categories.length})
            </button>
            <button id="mkt-adm-banners" class="btn btn-sm" style="color:${activeTab==='banners'?'#fff':'var(--text-muted)'}; background:${activeTab==='banners'?'var(--primary)':'transparent'};">
              🖼️ Ad Banners (${state.banners.length})
            </button>
          </div>
        </div>

        ${activeTab === 'products' ? `
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${state.products.map(prod => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                        <div>
                          <div style="font-weight: 600; color: #fff;">${escapeHtml(prod.title)}</div>
                          <div style="font-size: 0.78rem; color: var(--text-muted);">Posted: ${prod.postedDate}</div>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(state.categories.find(c => c.id === prod.category)?.name || 'General')}</td>
                    <td><strong style="color: var(--primary);">${prod.price.toLocaleString()} RWF</strong></td>
                    <td>${escapeHtml(prod.district)}</td>
                    <td>${escapeHtml(prod.sellerName)}</td>
                    <td>
                      <span class="badge badge-${prod.status}">${prod.status.replace('_', ' ').toUpperCase()}</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px;">
                        <button class="btn btn-sm flag-btn" data-id="${prod.id}" data-flag="isFeatured" style="background:${prod.isFeatured?'var(--accent-gold-light)':'rgba(255,255,255,0.05)'}; color:${prod.isFeatured?'var(--accent-gold)':'var(--text-muted)'}; padding: 2px 6px; font-size: 0.75rem;">
                          ⭐ Featured
                        </button>
                        <button class="btn btn-sm flag-btn" data-id="${prod.id}" data-flag="isTrending" style="background:${prod.isTrending?'var(--primary-light)':'rgba(255,255,255,0.05)'}; color:${prod.isTrending?'var(--primary)':'var(--text-muted)'}; padding: 2px 6px; font-size: 0.75rem;">
                          🔥 Trending
                        </button>
                      </div>
                    </td>
                    <td>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${state.categories.map(cat => `
                  <tr>
                    <td style="font-size: 1.5rem;">${cat.icon}</td>
                    <td><strong style="color: #fff;">${escapeHtml(cat.name)}</strong></td>
                    <td>${cat.order}</td>
                    <td>${state.products.filter(p => p.category === cat.id).length} Products</td>
                    <td>
                      <span class="badge badge-active">ENABLED</span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-danger req-del-cat-btn" data-id="${cat.id}">
                        🔒 Delete Category (Multi-Admin Approval)
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <!-- BANNERS MANAGEMENT -->
          <div class="grid-2">
            ${state.banners.map(b => `
              <div class="glass-card" style="padding: 1.5rem;">
                <div style="height: 140px; border-radius: var(--radius-sm); overflow: hidden; background: #000; margin-bottom: 1rem;">
                  <img src="${b.image}" alt="${escapeHtml(b.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <h4 style="color: #fff; margin-bottom: 0.25rem;">${escapeHtml(b.title)}</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${escapeHtml(b.subtitle)}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="badge badge-active">ACTIVE SLIDER</span>
                  <button class="btn btn-sm btn-secondary">Edit Banner</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    // Event Handlers
    container.querySelector('#mkt-adm-products')?.addEventListener('click', () => { activeTab = 'products'; render(); });
    container.querySelector('#mkt-adm-categories')?.addEventListener('click', () => { activeTab = 'categories'; render(); });
    container.querySelector('#mkt-adm-banners')?.addEventListener('click', () => { activeTab = 'banners'; render(); });

    container.querySelectorAll('.flag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        stateEngine.toggleProductFlag(btn.dataset.id, btn.dataset.flag);
        render();
      });
    });

    container.querySelectorAll('.del-prod-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this product?')) {
          stateEngine.deleteProduct(btn.dataset.id);
          render();
        }
      });
    });

    container.querySelectorAll('.req-del-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        stateEngine.requestDeleteCategory(btn.dataset.id);
        alert('Created Critical Approval Request for Category Deletion. A second Administrator must approve this request before deletion.');
        render();
      });
    });

    container.querySelector('#add-cat-btn')?.addEventListener('click', () => {
      const name = prompt('Enter New Category Name:');
      if (name) {
        const icon = prompt('Enter Category Emoji/Icon (e.g. 📦, 💻, 🌾):') || '📦';
        stateEngine.addCategory(name, icon);
        render();
      }
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

