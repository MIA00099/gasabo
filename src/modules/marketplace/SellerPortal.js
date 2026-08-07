/**
 * URWAGASABO MARKETPLACE - Seller Registration, Authentication & Seller Dashboard
 */
import { stateEngine } from '../../store/stateEngine.js';
import { renderLoginView } from '../../components/LoginView.js';

export function renderSellerPortal(container) {
  const state = stateEngine.getState();
  const currentUser = state.currentUser;
  const isSeller = currentUser && currentUser.role === 'seller';

  if (!isSeller) {
    renderSellerAuthView(container);
  } else {
    renderSellerDashboardView(container, currentUser);
  }
}

function renderSellerAuthView(container) {
  let step = 'register'; // 'register' | 'created' | 'login'
  let registeredSellerData = null;

  function update() {
    const state = stateEngine.getState();

    // Step progress indicators matching the diagram
    const stepsConfig = [
      { key: 'register', label: '1. Register & Form' },
      { key: 'created', label: '2. Account Created' },
      { key: 'login', label: '3. Login' },
      { key: 'dashboard', label: '4. Seller Dashboard' }
    ];

    container.innerHTML = `
      <div style="max-width: 600px; margin: 2rem auto; padding: 0 1rem;">
        <!-- Visual Flowchart Header -->
        <div style="margin-bottom: 1.5rem; text-align: center;">
          <h2 style="font-size: 1.6rem; color: #fff; margin-bottom: 0.5rem;">Seller Registration & Onboarding</h2>
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.78rem; font-weight: 700;">
            <div style="color: ${step==='register'?'#10B981':'#94A3B8'}; display: flex; align-items: center; gap: 4px;">
              <span style="background: ${step==='register'?'#10B981':'#334155'}; color: #fff; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">1</span>
              Complete Form
            </div>
            <span style="color: #64748B;">➔</span>
            <div style="color: ${step==='created'?'#10B981':'#94A3B8'}; display: flex; align-items: center; gap: 4px;">
              <span style="background: ${step==='created'?'#10B981':'#334155'}; color: #fff; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">2</span>
              Account Created
            </div>
            <span style="color: #64748B;">➔</span>
            <div style="color: ${step==='login'?'#10B981':'#94A3B8'}; display: flex; align-items: center; gap: 4px;">
              <span style="background: ${step==='login'?'#10B981':'#334155'}; color: #fff; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">3</span>
              Login
            </div>
            <span style="color: #64748B;">➔</span>
            <div style="color: #94A3B8; display: flex; align-items: center; gap: 4px;">
              <span style="background: #334155; color: #fff; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">4</span>
              Dashboard
            </div>
          </div>
        </div>

        <div class="glass-panel" style="padding: 2.2rem; border-radius: var(--radius-lg); border: 1px solid rgba(255, 255, 255, 0.12);">
          ${step === 'register' ? `
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <h3 style="font-size: 1.4rem; color: #fff; margin-bottom: 0.3rem;">Register Seller Account</h3>
              <p style="color: var(--text-muted); font-size: 0.85rem;">Complete all required fields below to register as a verified Rwandan seller.</p>
            </div>

            <form id="seller-reg-form">
              <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">Full Name</label>
                <input type="text" id="reg-fullname" class="form-control" placeholder="e.g. Marie Claire Uwase" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #fff;">
              </div>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">Phone Number</label>
                <input type="tel" id="reg-phone" class="form-control" placeholder="+250 788 000 000" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #fff;">
              </div>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">Email Address</label>
                <input type="email" id="reg-email" class="form-control" placeholder="seller@domain.rw" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #fff;">
              </div>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">District</label>
                <select id="reg-district" class="form-control" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.8); color: #fff;">
                  ${state.districts.map(d => `<option value="${d}">${d} District</option>`).join('')}
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 1.5rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">Password</label>
                <input type="password" id="reg-password" class="form-control" placeholder="••••••••" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #fff;">
              </div>

              <button type="submit" class="btn btn-gold" style="width: 100%; padding: 0.85rem; font-size: 1rem; border-radius: 8px; font-weight: 700; cursor: pointer;">
                Complete Form & Create Account
              </button>
            </form>
            <div style="text-align: center; margin-top: 1rem;">
              <button id="btn-goto-login" style="background: none; border: none; color: #94A3B8; cursor: pointer; font-size: 0.85rem; text-decoration: underline;">
                Already have an account? Skip to Login
              </button>
            </div>
          ` : step === 'created' ? `
            <div style="text-align: center; padding: 1.5rem 0;">
              <div style="width: 64px; height: 64px; background: rgba(16, 185, 129, 0.2); border: 2px solid #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; font-size: 2rem; color: #10B981;">
                ✓
              </div>
              <h3 style="font-size: 1.6rem; color: #fff; margin-bottom: 0.5rem;">Account Created!</h3>
              <p style="color: #94A3B8; font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">
                Congratulations <strong style="color: #fff;">${escapeHtml(registeredSellerData?.name || 'Seller')}</strong>! Your seller account has been successfully created.
              </p>
              <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; text-align: left; margin-bottom: 1.5rem; font-size: 0.85rem; color: #CBD5E1;">
                <div>📍 <strong>District:</strong> ${escapeHtml(registeredSellerData?.district || 'Gasabo')}</div>
                <div style="margin-top: 4px;">✉️ <strong>Email:</strong> ${escapeHtml(registeredSellerData?.email || '')}</div>
                <div style="margin-top: 4px;">📞 <strong>Phone:</strong> ${escapeHtml(registeredSellerData?.phone || '')}</div>
              </div>
              <button id="btn-proceed-login" class="btn btn-primary" style="width: 100%; padding: 0.85rem; font-size: 1rem; border-radius: 8px; font-weight: 700; cursor: pointer;">
                Proceed to Login →
              </button>
            </div>
          ` : `
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <h3 style="font-size: 1.4rem; color: #fff; margin-bottom: 0.3rem;">Seller Login</h3>
              <p style="color: var(--text-muted); font-size: 0.85rem;">Enter your seller credentials to access your dashboard.</p>
            </div>

            <form id="seller-login-form">
              <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">Email or Phone Number</label>
                <input type="text" id="login-id" class="form-control" placeholder="e.g. +250 788 345 678" value="${escapeHtml(registeredSellerData?.email || 'eric.m@rwandaagri.rw')}" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #fff;">
              </div>
              <div class="form-group" style="margin-bottom: 1.5rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">Password</label>
                <input type="password" class="form-control" placeholder="••••••••" value="password123" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #fff;">
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem; font-size: 1rem; border-radius: 8px; font-weight: 700; cursor: pointer;">
                Login to Seller Dashboard
              </button>
            </form>
          `}
        </div>
      </div>
    `;

    container.querySelector('#seller-reg-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = container.querySelector('#reg-fullname').value;
      const email = container.querySelector('#reg-email').value;
      const phone = container.querySelector('#reg-phone').value;
      const district = container.querySelector('#reg-district').value;

      registeredSellerData = { name, email, phone, district };
      stateEngine.registerSeller(registeredSellerData);
      step = 'created';
      update();
    });

    container.querySelector('#btn-goto-login')?.addEventListener('click', () => {
      step = 'login';
      update();
    });

    container.querySelector('#btn-proceed-login')?.addEventListener('click', () => {
      step = 'login';
      update();
    });

    container.querySelector('#seller-login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      stateEngine.switchRole('seller');
    });
  }

  update();
}

function renderSellerDashboardView(container, sellerUser) {
  let activeTab = 'active'; // 'active' | 'expiring' | 'expired' | 'new_product'

  function render() {
    const state = stateEngine.getState();
    const myProducts = state.products.filter(p => p.sellerId === sellerUser.id || p.sellerName.includes(sellerUser.name));

    const activeProds = myProducts.filter(p => p.status === 'active');
    const expiringProds = myProducts.filter(p => p.status === 'expiring_soon');
    const expiredProds = myProducts.filter(p => p.status === 'expired');

    let currentTabProds = activeProds;
    if (activeTab === 'expiring') currentTabProds = expiringProds;
    if (activeTab === 'expired') currentTabProds = expiredProds;

    container.innerHTML = `
      <div style="max-width: 1280px; margin: 0 auto;">
        <!-- Seller Dashboard Header -->
        <div class="glass-panel" style="padding: 2rem; border-radius: var(--radius-lg); margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem;">
                <h2 style="font-size: 1.8rem; color: #fff;">Welcome, ${escapeHtml(sellerUser.name)}</h2>
                <span class="badge badge-active">✔ Verified Rwandan Seller</span>
              </div>
              <p style="color: var(--text-muted); font-size: 0.92rem;">
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

        ${activeTab === 'new_product' ? `
          <!-- POST NEW PRODUCT FORM -->
          <div class="glass-panel" style="padding: 2.5rem; border-radius: var(--radius-lg); margin-bottom: 3rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
              <h3 style="font-size: 1.4rem; color: #fff;">Post New Item on Kigali Marketplace</h3>
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
                  <input type="number" id="p-price" class="form-control" placeholder="15000" required>
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
                <label>Image URL (or unspash preview image)</label>
                <input type="url" id="p-image" class="form-control" value="https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80" required>
              </div>

              <button type="submit" class="btn btn-primary" style="padding: 0.95rem 2rem; font-size: 1rem; margin-top: 1rem;">
                🚀 Publish Product Listing Now
              </button>
            </form>
          </div>
        ` : ''}

        <!-- Product Status Tabs -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 0.5rem; background: var(--navy-card); padding: 4px; border-radius: 12px; border: 1px solid var(--navy-border);">
            <button id="tab-active-btn" class="btn btn-sm" style="color:${activeTab==='active'?'#fff':'var(--text-muted)'}; background:${activeTab==='active'?'var(--primary)':'transparent'};">
              Active Products (${activeProds.length})
            </button>
            <button id="tab-expiring-btn" class="btn btn-sm" style="color:${activeTab==='expiring'?'#fff':'var(--text-muted)'}; background:${activeTab==='expiring'?'var(--warning)':'transparent'};">
              Expiring Soon (${expiringProds.length})
            </button>
            <button id="tab-expired-btn" class="btn btn-sm" style="color:${activeTab==='expired'?'#fff':'var(--text-muted)'}; background:${activeTab==='expired'?'var(--danger)':'transparent'};">
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
              ${currentTabProds.length === 0 ? `
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
                        <div style="font-weight: 600; color: #fff;">${escapeHtml(prod.title)}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">📍 ${escapeHtml(prod.district)} • ${prod.condition}</div>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(state.categories.find(c => c.id === prod.category)?.name || 'General')}</td>
                  <td><strong style="color: var(--accent-gold);">${prod.price.toLocaleString()} RWF</strong></td>
                  <td>${prod.postedDate}</td>
                  <td>${prod.expiryDate}</td>
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
    container.querySelector('#add-new-prod-btn')?.addEventListener('click', () => { activeTab = 'new_product'; render(); });
    container.querySelector('#cancel-add-btn')?.addEventListener('click', () => { activeTab = 'active'; render(); });

    container.querySelector('#tab-active-btn')?.addEventListener('click', () => { activeTab = 'active'; render(); });
    container.querySelector('#tab-expiring-btn')?.addEventListener('click', () => { activeTab = 'expiring'; render(); });
    container.querySelector('#tab-expired-btn')?.addEventListener('click', () => { activeTab = 'expired'; render(); });

    container.querySelector('#create-product-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector('#p-title').value;
      const category = container.querySelector('#p-category').value;
      const price = parseFloat(container.querySelector('#p-price').value);
      const district = container.querySelector('#p-district').value;
      const condition = container.querySelector('#p-condition').value;
      const description = container.querySelector('#p-desc').value;
      const image = container.querySelector('#p-image').value;

      stateEngine.createProduct({
        title, category, price, district, condition, description, image,
        sellerId: sellerUser.id, sellerName: sellerUser.name, sellerPhone: sellerUser.phone
      });

      alert('Product published successfully to Kigali Marketplace!');
      activeTab = 'active';
      render();
    });

    container.querySelectorAll('.renew-prod-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        stateEngine.renewProductListing(btn.dataset.id);
        alert('Product listing renewed for another 6 months!');
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
  }

  render();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
