/**
 * KIGALI MARKET - Seller Registration, Authentication & Seller Dashboard
 * Ported to match delivered mockups (post-ad.html, stores.html, etc.).
 */
import { starsHtml } from '../../utils/stars.js';
import { categoryIconText } from '../../utils/categoryIcon.js';
import { stateEngine } from '../../store/stateEngine.js';
import { renderLoginView } from '../../components/LoginView.js';

// Matches the "Max 10 photos" the form has always advertised, and the cap
// enforced in createProductSchema (server/src/routes/products.routes.ts).
const MAX_IMAGES = 10;

let productFormValues = { title: '', category: '', price: '', district: '', condition: '', description: '' };

function captureProductFormValues(container) {
  const title = container.querySelector('#p-title');
  if (title) productFormValues.title = title.value;
  const category = container.querySelector('#p-category');
  if (category) productFormValues.category = category.value;
  const price = container.querySelector('#p-price');
  if (price) productFormValues.price = price.value;
  const district = container.querySelector('#p-district');
  if (district) productFormValues.district = district.value;
  const condition = container.querySelector('#p-condition');
  if (condition) productFormValues.condition = condition.value;
  const description = container.querySelector('#p-desc');
  if (description) productFormValues.description = description.value;
}

function resetProductFormValues(sellerDistrict) {
  productFormValues = { title: '', category: '', price: '', district: sellerDistrict, condition: '', description: '' };
}

export function renderSellerPortal(container) {
  const state = stateEngine.getState();
  const currentUser = state.currentUser;
  const isSeller = currentUser && currentUser.role === 'seller';

  if (!isSeller) {
    renderLoginView(container, 'signup');
  } else {
    renderSellerDashboardView(container, currentUser);
  }
}

function renderSellerDashboardView(container, sellerUser) {
  if (!productFormValues.district) productFormValues.district = sellerUser.district;

  function render() {
    const state = stateEngine.getState();
    const activeTab = state.ui.sellerDashboardTab || 'active';
    const formSubmitting = !!state.loading.productForm;
    const myProductsAttempted = state.loading.myProducts !== undefined;
    const productsLoading = !!state.loading.myProducts || !myProductsAttempted;
    const imageMode = state.ui.productImageMode || 'url';
    const imageUploading = !!state.loading.imageUpload;
    // A list now, not one url. Both upload mode and URL mode append to it.
    const images = state.ui.productImages || [];

    if (!myProductsAttempted) {
      stateEngine.loadMyProducts().catch(() => {});
    }

    const myProducts = state.myProducts;
    const pendingProds = myProducts.filter(p => p.status === 'pending');
    const rejectedProds = myProducts.filter(p => p.status === 'rejected');
    const activeProds = myProducts.filter(p => p.status === 'active');
    const expiringProds = myProducts.filter(p => p.status === 'expiring_soon');
    const expiredProds = myProducts.filter(p => p.status === 'expired');

    let currentTabProds = activeProds;
    if (activeTab === 'pending') currentTabProds = pendingProds;
    if (activeTab === 'rejected') currentTabProds = rejectedProds;
    if (activeTab === 'expiring') currentTabProds = expiringProds;
    if (activeTab === 'expired') currentTabProds = expiredProds;

    container.innerHTML = `
      <div class="seller-dash-wrap max-w-6xl mx-auto py-6 px-4 w-full">
        <!-- Seller Dashboard Header -->
        <div class="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h2 class="text-2xl font-bold text-gray-900">Welcome, ${escapeHtml(sellerUser.name)}</h2>
                <span class="bg-green-100 text-brand-green text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <i class="fa-solid fa-circle-check"></i> Verified Seller
                </span>
              </div>
              <p class="text-xs text-gray-500">
                <i class="fa-solid fa-location-dot text-brand-orange"></i> District: ${escapeHtml(sellerUser.district)} &bull; <i class="fa-regular fa-envelope"></i> ${escapeHtml(sellerUser.email)} &bull; <i class="fa-solid fa-phone text-brand-green"></i> ${escapeHtml(sellerUser.phone)}
              </p>
            </div>

            <div class="flex gap-3">
              <button id="add-new-prod-btn" class="bg-brand-orange text-white font-bold px-5 py-2.5 rounded-xl hover:bg-orange-500 transition shadow text-xs flex items-center gap-1.5">
                <i class="fa-solid fa-plus-circle"></i> Post Your Ad
              </button>
            </div>
          </div>
        </div>

        ${state.error ? `
          <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>${escapeHtml(state.error)}</span>
          </div>
        ` : ''}

        ${activeTab === 'new_product' ? `
          <!-- POST YOUR AD FORM (ui,/post-ad.html template) -->
          <div class="mb-6">
            <div class="mb-3">
              <h1 class="text-xl md:text-2xl font-bold text-gray-900">Post Your Ad</h1>
              <p class="text-xs text-gray-500">Fill in the details below to post your ad</p>
            </div>

            <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <form id="create-product-form" class="space-y-4">
                <div class="flex flex-col lg:flex-row gap-6">

                  <!-- Left Column: Fields -->
                  <div class="lg:w-[58%] space-y-3">
                    <!-- Ad Type Selector -->
                    <div>
                      <label class="block text-xs font-bold text-gray-800 mb-1.5">Ad Type</label>
                      <div class="flex flex-wrap gap-2" id="ad-type-group">
                        <button type="button" class="ad-type-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-brand-green bg-green-50 text-brand-green font-semibold text-xs transition">
                          <i class="fa-solid fa-box text-xs"></i> Product
                        </button>
                        <button type="button" class="ad-type-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-50 transition">
                          <i class="fa-solid fa-car text-xs"></i> Vehicle
                        </button>
                        <button type="button" class="ad-type-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-50 transition">
                          <i class="fa-solid fa-house text-xs"></i> Property
                        </button>
                        <button type="button" class="ad-type-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-50 transition">
                          <i class="fa-solid fa-briefcase text-xs"></i> Service
                        </button>
                        <button type="button" class="ad-type-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-50 transition">
                          <i class="fa-solid fa-user-tie text-xs"></i> Job
                        </button>
                      </div>
                    </div>

                    <!-- Category -->
                    <div>
                      <label class="block text-xs font-bold text-gray-800 mb-1">Category</label>
                      <div class="relative">
                        <select id="p-category" class="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-lg outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                          ${state.categories.map(c => `<option value="${c.id}" ${c.id===productFormValues.category?'selected':''}>${categoryIconText(c.icon)} ${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                          <i class="fa-solid fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                    </div>

                    <!-- Title & Price -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-bold text-gray-800 mb-1">Title</label>
                        <input type="text" id="p-title" required placeholder="Enter ad title" value="${escapeHtml(productFormValues.title)}" class="w-full bg-white border border-gray-300 text-gray-900 py-2 px-3 rounded-lg outline-none text-xs focus:border-brand-green">
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-gray-800 mb-1">Price (RWF)</label>
                        <input type="number" id="p-price" required placeholder="Price" min="1" value="${escapeHtml(productFormValues.price)}" class="w-full bg-white border border-gray-300 text-gray-900 py-2 px-3 rounded-lg outline-none text-xs focus:border-brand-green">
                      </div>
                    </div>

                    <!-- District & Condition -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-bold text-gray-800 mb-1">District Location</label>
                        <select id="p-district" class="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg outline-none text-xs focus:border-brand-green">
                          ${state.districts.map(d => `<option value="${d}" ${d===productFormValues.district?'selected':''}>${d} District</option>`).join('')}
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-gray-800 mb-1">Item Condition</label>
                        <input type="text" id="p-condition" required placeholder="e.g. Brand New" value="${escapeHtml(productFormValues.condition)}" class="w-full bg-white border border-gray-300 text-gray-900 py-2 px-3 rounded-lg outline-none text-xs focus:border-brand-green">
                      </div>
                    </div>

                    <!-- Description -->
                    <div>
                      <label class="block text-xs font-bold text-gray-800 mb-1">Description</label>
                      <textarea id="p-desc" rows="3" required placeholder="Describe your product, service or item..." class="w-full bg-white border border-gray-300 text-gray-900 py-2 px-3 rounded-lg outline-none text-xs focus:border-brand-green resize-none">${escapeHtml(productFormValues.description)}</textarea>
                    </div>
                  </div>

                  <!-- Right Column: Upload Area -->
                  <div class="lg:w-[42%] flex flex-col justify-between">
                    <div class="border-2 border-dashed border-gray-300 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition bg-white h-full min-h-[220px]">
                      <div class="w-12 h-12 mb-2 text-brand-green">
                        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"></path>
                        </svg>
                      </div>
                      <h3 class="text-base font-bold text-brand-green mb-1">Upload Photos</h3>
                      <p class="text-gray-500 text-xs mb-2">Drag & drop or click to upload</p>
                      <p class="text-gray-400 text-[10px] mb-3">Max 10 photos</p>

                      <div class="flex gap-2 mb-3">
                        <button type="button" id="img-mode-upload-btn" class="px-2.5 py-1 text-[10px] font-bold rounded ${imageMode==='upload'?'bg-brand-green text-white':'bg-gray-200 text-gray-700'}">Device Upload</button>
                        <button type="button" id="img-mode-url-btn" class="px-2.5 py-1 text-[10px] font-bold rounded ${imageMode==='url'?'bg-brand-green text-white':'bg-gray-200 text-gray-700'}">Image URL</button>
                      </div>

                      ${images.length ? `
                        <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
                          ${images.map((url, i) => `
                            <div class="relative group aspect-square rounded-lg overflow-hidden border ${i === 0 ? 'border-brand-green border-2' : 'border-gray-200'} bg-white">
                              <img src="${escapeHtml(url)}" alt="Photo ${i + 1}" class="w-full h-full object-cover">
                              ${i === 0 ? `
                                <span class="absolute bottom-0 inset-x-0 bg-brand-green text-white text-[8px] font-bold text-center py-0.5">COVER</span>
                              ` : ''}
                              <button type="button" class="remove-img-btn absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-600 transition"
                                data-index="${i}" title="Remove photo ${i + 1}" aria-label="Remove photo ${i + 1}">&#10005;</button>
                            </div>
                          `).join('')}
                        </div>
                        <p class="text-[10px] text-gray-500 mb-2">
                          ${images.length} of ${MAX_IMAGES} &middot; the first photo is the cover buyers see in the grid
                        </p>
                      ` : ''}

                      ${images.length >= MAX_IMAGES ? `
                        <p class="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          That is the maximum of ${MAX_IMAGES} photos. Remove one to add another.
                        </p>
                      ` : imageMode === 'upload' ? `
                        <input type="file" id="p-image-file" accept="image/*" multiple class="w-full text-xs" ${imageUploading ? 'disabled' : ''}>
                        ${imageUploading ? `<div class="text-xs text-gray-600 font-semibold mt-2">Uploading&hellip;</div>` : ''}
                      ` : `
                        <div class="flex gap-1.5">
                          <input type="url" id="p-image-url" class="flex-1 min-w-0 bg-gray-50 border border-gray-300 text-gray-900 py-1.5 px-2 rounded text-xs" placeholder="Paste an image URL">
                          <button type="button" id="add-image-url-btn" class="bg-brand-dark text-white text-[10px] font-bold px-3 rounded shrink-0">Add</button>
                        </div>
                      `}
                    </div>
                  </div>

                </div>

                <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                  <button type="button" id="cancel-add-btn" class="text-xs font-semibold text-gray-500 hover:underline">Cancel</button>
                  <button type="submit" class="bg-brand-green text-white font-bold py-2.5 px-8 rounded-lg hover:bg-green-800 transition shadow-md text-xs" ${formSubmitting || imageUploading ? 'disabled' : ''}>
                    ${formSubmitting ? 'Publishing...' : 'Continue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ` : ''}

        <!-- Product Status Tabs -->
        <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div class="flex gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200 flex-wrap text-xs">
            <button id="tab-pending-btn" class="px-3 py-1.5 rounded-lg font-semibold ${activeTab==='pending'?'bg-amber-600 text-white':'text-gray-600 hover:bg-gray-200'}">
              🕒 Awaiting Review (${pendingProds.length})
            </button>
            ${rejectedProds.length > 0 ? `
              <button id="tab-rejected-btn" class="px-3 py-1.5 rounded-lg font-semibold ${activeTab==='rejected'?'bg-red-600 text-white':'text-gray-600 hover:bg-gray-200'}">
                ❌ Rejected (${rejectedProds.length})
              </button>
            ` : ''}
            <button id="tab-active-btn" class="px-3 py-1.5 rounded-lg font-semibold ${activeTab==='active'?'bg-brand-green text-white':'text-gray-600 hover:bg-gray-200'}">
              Active Products (${activeProds.length})
            </button>
            <button id="tab-expiring-btn" class="px-3 py-1.5 rounded-lg font-semibold ${activeTab==='expiring'?'bg-amber-500 text-white':'text-gray-600 hover:bg-gray-200'}">
              Expiring Soon (${expiringProds.length})
            </button>
            <button id="tab-expired-btn" class="px-3 py-1.5 rounded-lg font-semibold ${activeTab==='expired'?'bg-red-600 text-white':'text-gray-600 hover:bg-gray-200'}">
              Expired Archive (${expiredProds.length})
            </button>
          </div>
        </div>

        <!-- Products List Table -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th class="p-3.5">Product</th>
                  <th class="p-3.5">Category</th>
                  <th class="p-3.5">Price (RWF)</th>
                  <th class="p-3.5">Posted Date</th>
                  <th class="p-3.5">Expiry Date</th>
                  <th class="p-3.5">Status</th>
                  <th class="p-3.5">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                ${productsLoading ? `
                  <tr><td colspan="7" class="p-8 text-center text-gray-400">Loading your products...</td></tr>
                ` : currentTabProds.length === 0 ? `
                  <tr>
                    <td colspan="7" class="p-8 text-center text-gray-400">
                      No products found in this section.
                    </td>
                  </tr>
                ` : currentTabProds.map(prod => `
                  <tr class="hover:bg-gray-50 transition">
                    <td class="p-3.5">
                      <div class="flex items-center gap-3">
                        <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" class="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0">
                        <div>
                          <div class="font-bold text-gray-900 text-xs">${escapeHtml(prod.title)}</div>
                          <div class="text-[10px] text-gray-500 mt-0.5">📍 ${escapeHtml(prod.district)} &bull; ${prod.condition}</div>
                          <!-- What buyers have done with this listing. The
                               rating is set by an admin; the likes are from
                               buyers tapping the heart on the listing page. -->
                          <div class="text-[10px] text-gray-600 mt-0.5 flex items-center gap-2">
                            ${prod.rating ? `<span class="text-yellow-500">${starsHtml(prod.rating)} <span class="text-gray-600 font-semibold">${Number(prod.rating).toFixed(1)}</span></span>` : '<span class="text-gray-400">Not yet rated</span>'}
                            <span class="${prod.likeCount ? 'text-gray-700 font-semibold' : 'text-gray-400'}">
                              <i class="fa-${prod.likeCount ? 'solid' : 'regular'} fa-heart ${prod.likeCount ? 'text-red-500' : ''}"></i>
                              ${prod.likeCount || 0} ${prod.likeCount === 1 ? 'like' : 'likes'}
                            </span>
                          </div>
                          ${prod.status === 'rejected' && prod.rejectionReason ? `
                            <div class="text-[10px] text-red-700 mt-1 max-w-xs">
                              <strong>Reason:</strong> ${escapeHtml(prod.rejectionReason)}
                            </div>
                          ` : ''}
                          ${prod.status === 'pending' ? `
                            <div class="text-[10px] text-amber-700 mt-1">
                              Under review by platform admins.
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    </td>
                    <td class="p-3.5 font-medium text-gray-700">${escapeHtml(prod.category || 'General')}</td>
                    <td class="p-3.5"><strong class="text-brand-green font-black">RWF ${prod.price.toLocaleString()}</strong></td>
                    <td class="p-3.5 text-gray-500">${new Date(prod.postedDate).toLocaleDateString()}</td>
                    <td class="p-3.5 text-gray-500">${prod.expiryDate ? new Date(prod.expiryDate).toLocaleDateString() : '—'}</td>
                    <td class="p-3.5">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${prod.status==='active'?'bg-green-100 text-brand-green':prod.status==='pending'?'bg-amber-100 text-amber-800':'bg-red-100 text-red-800'}">
                        ${prod.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td class="p-3.5">
                      <div class="flex gap-2">
                        ${prod.status === 'expiring_soon' || prod.status === 'expired' ? `
                          <button class="btn btn-sm bg-brand-green text-white text-[10px] font-bold px-2.5 py-1 rounded-md hover:bg-green-800 transition renew-prod-btn" data-id="${prod.id}">
                            Renew
                          </button>
                        ` : ''}
                        <button class="text-red-600 hover:text-red-800 font-bold text-[10px] px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition del-prod-btn" data-id="${prod.id}">
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
      </div>
    `;

    // Event Handlers
    container.querySelector('#add-new-prod-btn')?.addEventListener('click', () => {
      resetProductFormValues(sellerUser.district);
      stateEngine.setUI({ sellerDashboardTab: 'new_product' });
    });
    container.querySelector('#cancel-add-btn')?.addEventListener('click', () => {
      resetProductFormValues(sellerUser.district);
      // Also drop the photos. Abandoning a draft and starting another one
      // otherwise carries the previous listing's photos into it.
      stateEngine.setUI({ sellerDashboardTab: 'active', productImages: [] });
    });

    container.querySelectorAll('.ad-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.ad-type-btn').forEach((b) => {
          b.className = 'ad-type-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-50 transition';
        });
        btn.className = 'ad-type-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-brand-green bg-green-50 text-brand-green font-semibold text-xs transition';
      });
    });

    container.querySelector('#tab-pending-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'pending' }));
    container.querySelector('#tab-rejected-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'rejected' }));
    container.querySelector('#tab-active-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'active' }));
    container.querySelector('#tab-expiring-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'expiring' }));
    container.querySelector('#tab-expired-btn')?.addEventListener('click', () => stateEngine.setUI({ sellerDashboardTab: 'expired' }));

    container.querySelector('#img-mode-upload-btn')?.addEventListener('click', () => {
      captureProductFormValues(container);
      stateEngine.setUI({ productImageMode: 'upload' });
    });
    container.querySelector('#img-mode-url-btn')?.addEventListener('click', () => {
      captureProductFormValues(container);
      stateEngine.setUI({ productImageMode: 'url' });
    });

    container.querySelector('#p-image-file')?.addEventListener('change', async (e) => {
      const picked = Array.from(e.target.files || []);
      if (!picked.length) return;
      captureProductFormValues(container);

      const current = stateEngine.getState().ui.productImages || [];
      const room = MAX_IMAGES - current.length;
      // Trim to what still fits rather than uploading files that would be
      // rejected afterwards.
      const files = picked.slice(0, room);
      const skipped = picked.length - files.length;

      try {
        const { urls, failed } = await stateEngine.uploadProductImages(files);
        stateEngine.setUI({ productImages: [...current, ...urls] });

        const notes = [];
        if (failed.length) notes.push(`${failed.length} photo${failed.length > 1 ? 's' : ''} failed to upload`);
        if (skipped) notes.push(`${skipped} skipped - the limit is ${MAX_IMAGES}`);
        if (notes.length) {
          stateEngine.data.error = `${notes.join('. ')}.`;
          stateEngine.notify();
        }
      } catch (err) {
        render();
      }
    });

    container.querySelector('#add-image-url-btn')?.addEventListener('click', () => {
      const input = container.querySelector('#p-image-url');
      const url = (input?.value || '').trim();
      if (!url) return;

      captureProductFormValues(container);
      const current = stateEngine.getState().ui.productImages || [];

      if (current.includes(url)) {
        stateEngine.data.error = 'That photo is already on the listing.';
        stateEngine.notify();
        return;
      }
      if (current.length >= MAX_IMAGES) {
        stateEngine.data.error = `You can add up to ${MAX_IMAGES} photos.`;
        stateEngine.notify();
        return;
      }

      stateEngine.setUI({ productImages: [...current, url] });
    });

    // Enter in the URL field adds the photo instead of submitting the whole
    // listing, which is what a single-input row implies.
    container.querySelector('#p-image-url')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        container.querySelector('#add-image-url-btn')?.click();
      }
    });

    container.querySelectorAll('.remove-img-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureProductFormValues(container);
        const idx = Number(btn.dataset.index);
        const current = stateEngine.getState().ui.productImages || [];
        stateEngine.setUI({ productImages: current.filter((_, i) => i !== idx) });
      });
    });

    container.querySelector('#create-product-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = container.querySelector('#p-title').value;
      const category = container.querySelector('#p-category').value;
      const price = container.querySelector('#p-price').value;
      const district = container.querySelector('#p-district').value;
      const condition = container.querySelector('#p-condition').value;
      const description = container.querySelector('#p-desc').value;
      const chosenImages = stateEngine.getState().ui.productImages || [];

      if (!chosenImages.length) {
        captureProductFormValues(container);
        stateEngine.data.error = imageMode === 'upload'
          ? 'Add at least one photo - choose files and wait for the upload to finish.'
          : 'Add at least one photo URL.';
        stateEngine.notify();
        return;
      }

      try {
        await stateEngine.createProduct({ title, category, price, district, condition, description, images: chosenImages });
        alert('Product submitted! It will appear on the marketplace once an admin reviews and approves it - you can track its status under "Awaiting Review".');
        resetProductFormValues(sellerUser.district);
        stateEngine.setUI({ sellerDashboardTab: 'pending', productImageMode: 'url', productImages: [] });
      } catch (err) {
        captureProductFormValues(container);
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
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
