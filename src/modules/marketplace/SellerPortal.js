/**
 * KIGALI MARKET - Seller Registration, Authentication & Seller Dashboard
 */
import { stateEngine } from '../../store/stateEngine.js';
import { renderLoginView } from '../../components/LoginView.js';

export function renderSellerPortal(container) {
  const state = stateEngine.getState();
  const currentUser = state.currentUser;
  const isSeller = currentUser && currentUser.role === 'seller';

  if (!isSeller) {
    // Reuse the exact same glass Sign Up / Login component as the header's
    // Sign Up button and the standalone /login page - "Start Selling" should
    // show the one real sign-up form, not a separate look-alike.
    renderLoginView(container, 'signup');
  } else {
    renderSellerDashboardView(container, currentUser);
  }
}

function renderSellerDashboardView(container, sellerUser) {
  function render() {
    const state = stateEngine.getState();
    const activeTab = state.ui.sellerDashboardTab || 'active';
    const formSubmitting = !!state.loading.productForm;
    const myProductsAttempted = state.loading.myProducts !== undefined;
    const productsLoading = !!state.loading.myProducts || !myProductsAttempted;
    const imageMode = state.ui.productImageMode || 'url';
    const imageUploading = !!state.loading.imageUpload;
    const imagePreviewUrl = state.ui.productImagePreview || '';

    if (!myProductsAttempted) {
      stateEngine.loadMyProducts().catch(() => {});
    }

    const myProducts = state.myProducts;
    const activeProds = myProducts.filter(p => p.status === 'active');
    const expiringProds = myProducts.filter(p => p.status === 'expiring_soon');
    const expiredProds = myProducts.filter(p => p.status === 'expired');

    let currentTabProds = activeProds;
    if (activeTab === 'expiring') currentTabProds = expiringProds;
    if (activeTab === 'expired') currentTabProds = expiredProds;

    container.innerHTML = `
      <div style="max-width: 1280px; margin: 0 auto; padding: 2.5rem 1.5rem; width: 100%; box-sizing: border-box;">
        <!-- Seller Dashboard Header -->
        <div class="glass-panel" style="padding: 2rem; border-radius: var(--radius-lg); margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem;">
                <h2 style="font-size: 1.8rem; color: #0F172A;">Welcome, ${escapeHtml(sellerUser.name)}</h2>
                <span class="badge badge-active">✔ Verified Rwandan Seller</span>
              </div>
              <p style="color: #64748B; font-size: 0.92rem;">
                📍 ${escapeHtml(sellerUser.district)} District • ✉️ ${escapeHtml(sellerUser.email)} • 📞 ${escapeHtml(sellerUser.phone)}
              </p>
            </div>

            <div style="display: flex; gap: 1rem;">
              <button id="add-new-prod-btn" class="btn btn-gold" style="padding: 0.85rem 1.5rem; font-size: 0.95rem;">
                ➕ Post New Product Listing
              </button>
            </div>
          </div>
        </div>

        ${state.error ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
            ⚠️ ${escapeHtml(state.error)}
          </div>
        ` : ''}

        ${activeTab === 'new_product' ? `
          <!-- POST NEW PRODUCT FORM -->
          <div class="glass-panel" style="padding: 2.5rem; border-radius: var(--radius-lg); margin-bottom: 3rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
              <h3 style="font-size: 1.4rem; color: #0F172A;">Post New Item on Kigali Marketplace</h3>
              <button id="cancel-add-btn" class="btn btn-secondary btn-sm">Cancel</button>
            </div>

            <form id="create-product-form">
              <div class="grid-2">
                <div class="form-group">
                  <label>Product Title</label>
                  <input type="text" id="p-title" class="form-control" placeholder="e.g. Rwandan Specialty Bourbon Coffee 1kg" required>
                </div>

                <div class="form-group">
                  <label>Category</label>
                  <select id="p-category" class="form-control">
                    ${state.categories.map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="grid-3">
                <div class="form-group">
                  <label>Price (RWF)</label>
                  <input type="number" id="p-price" class="form-control" placeholder="15000" min="1" required>
                </div>

                <div class="form-group">
                  <label>District Location</label>
                  <select id="p-district" class="form-control">
                    ${state.districts.map(d => `<option value="${d}" ${d===sellerUser.district?'selected':''}>${d} District</option>`).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label>Item Condition</label>
                  <input type="text" id="p-condition" class="form-control" placeholder="e.g. Brand New / Fresh Produce" required>
                </div>
              </div>

              <div class="form-group">
                <label>Product Description</label>
                <textarea id="p-desc" class="form-control" rows="4" placeholder="Detailed product specifications, origin, delivery options..." required></textarea>
              </div>

              <div class="form-group">
                <label>Product Photo</label>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.6rem;">
                  <button type="button" id="img-mode-upload-btn" class="btn btn-sm" style="background:${imageMode==='upload'?'var(--primary)':'#F1F5F9'}; color:${imageMode==='upload'?'#fff':'#64748B'};">
                    📁 Upload from Device
                  </button>
                  <button type="button" id="img-mode-url-btn" class="btn btn-sm" style="background:${imageMode==='url'?'var(--primary)':'#F1F5F9'}; color:${imageMode==='url'?'#fff':'#64748B'};">
                    🔗 Paste Image URL
                  </button>
                </div>

                ${imageMode === 'upload' ? `
                  <input type="file" id="p-image-file" accept="image/jpeg,image/png,image/webp,image/gif" class="form-control" ${imageUploading ? 'disabled' : ''}>
                  <div style="font-size: 0.78rem; color: #64748B; margin-top: 0.4rem;">JPEG, PNG, WEBP, or GIF - max 5MB.</div>
                  ${imageUploading ? `
                    <div style="margin-top: 0.75rem; color: #64748B; font-size: 0.85rem;">⏳ Uploading...</div>
                  ` : imagePreviewUrl ? `
                    <div style="margin-top: 0.75rem; display: flex; align-items: center; gap: 0.75rem;">
                      <img src="${imagePreviewUrl}" alt="Preview" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">
                      <span style="color: #10B981; font-size: 0.85rem; font-weight: 600;">✔ Photo uploaded</span>
                    </div>
                  ` : ''}
                  <input type="hidden" id="p-image" value="${escapeHtml(imagePreviewUrl || '')}">
                ` : `
                  <input type="url" id="p-image" class="form-control" value="${escapeHtml(imagePreviewUrl && imageMode === 'url' ? imagePreviewUrl : 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80')}" placeholder="https://...">
                `}
              </div>

              <button type="submit" class="btn btn-primary" style="padding: 0.95rem 2rem; font-size: 1rem; margin-top: 1rem;" ${formSubmitting || imageUploading ? 'disabled' : ''}>
                ${formSubmitting ? 'Publishing...' : '🚀 Publish Product Listing Now'}
              </button>
            </form>
          </div>
        ` : ''}

        <!-- Product Status Tabs -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 0.5rem; background: #F1F5F9; padding: 4px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <button id="tab-active-btn" class="btn btn-sm" style="color:${activeTab==='active'?'#fff':'#64748B'}; background:${activeTab==='active'?'var(--primary)':'transparent'};">
              Active Products (${activeProds.length})
            </button>
            <button id="tab-expiring-btn" class="btn btn-sm" style="color:${activeTab==='expiring'?'#fff':'#64748B'}; background:${activeTab==='expiring'?'var(--warning)':'transparent'};">
              Expiring Soon (${expiringProds.length})
            </button>
            <button id="tab-expired-btn" class="btn btn-sm" style="color:${activeTab==='expired'?'#fff':'#64748B'}; background:${activeTab==='expired'?'var(--danger)':'transparent'};">
              Expired Archive (${expiredProds.length})
            </button>
          </div>
        </div>

        <!-- Products List Table -->
        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price (RWF)</th>
                <th>Posted Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${productsLoading ? `
                <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading your products...</td></tr>
              ` : currentTabProds.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No products found in this section.
                  </td>
                </tr>
              ` : currentTabProds.map(prod => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
                      <div>
                        <div style="font-weight: 600; color: #0F172A;">${escapeHtml(prod.title)}</div>
                        <div style="font-size: 0.78rem; color: #64748B;">📍 ${escapeHtml(prod.district)} • ${prod.condition}</div>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(prod.category || 'General')}</td>
                  <td><strong style="color: var(--accent-gold);">${prod.price.toLocaleString()} RWF</strong></td>
                  <td>${new Date(prod.postedDate).toLocaleDateString()}</td>
                  <td>${new Date(prod.expiryDate).toLocaleDateString()}</td>
                  <td>
                    <span class="badge badge-${prod.status}">${prod.status.replace('_', ' ').toUpperCase()}</span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 0.4rem;">
                      ${prod.status === 'expiring_soon' || prod.status === 'expired' ? `
                        <button class="btn btn-sm btn-primary renew-prod-btn" data-id="${prod.id}">
                          🔄 Renew (6 Months)
                        </button>
                      ` : ''}
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
      </div>
    `;

    // Event Handlers
    container.querySelector('#add-new-prod-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'new_product' }));
    container.querySelector('#cancel-add-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'active' }));

    container.querySelector('#tab-active-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'active' }));
    container.querySelector('#tab-expiring-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'expiring' }));
    container.querySelector('#tab-expired-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'expired' }));

    container.querySelector('#img-mode-upload-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ productImageMode: 'upload' });
    });
    container.querySelector('#img-mode-url-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ productImageMode: 'url' });
    });

    container.querySelector('#p-image-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const url = await stateEngine.uploadProductImage(file);
        stateEngine.setUI({ productImagePreview: url });
      } catch (err) {
        render();
      }
    });

    container.querySelector('#create-product-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = container.querySelector('#p-title').value;
      const category = container.querySelector('#p-category').value;
      const price = container.querySelector('#p-price').value;
      const district = container.querySelector('#p-district').value;
      const condition = container.querySelector('#p-condition').value;
      const description = container.querySelector('#p-desc').value;
      const image = container.querySelector('#p-image').value;

      // #p-image is type="hidden" while in upload mode, so the browser's
      // own `required` validation never runs on it (hidden inputs are
      // excluded from constraint validation) - check by hand instead.
      if (!image) {
        stateEngine.data.error = imageMode === 'upload'
          ? 'Please choose and wait for a product photo to finish uploading.'
          : 'Please provide a product image URL.';
        stateEngine.notify();
        return;
      }

      try {
        await stateEngine.createProduct({ title, category, price, district, condition, description, image });
        alert('Product published successfully to Kigali Marketplace!');
        stateEngine.setUI({ sellerDashboardTab: 'active', productImageMode: 'url', productImagePreview: '' });
      } catch (err) {
        render();
      }
    });

    container.querySelectorAll('.renew-prod-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await stateEngine.renewProduct(btn.dataset.id);
          alert('Product listing renewed for another 6 months!');
        } catch (err) {
          render();
        }
      });
    });

    container.querySelectorAll('.del-prod-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this product?')) {
          try {
            await stateEngine.deleteProduct(btn.dataset.id);
          } catch (err) {
            render();
          }
        }
      });
    });
  }

  const state = stateEngine.getState();
  if (state.loading.categories === undefined) {
    stateEngine.loadCategories().catch(() => {});
  }

  render();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
