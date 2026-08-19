/**
 * Stores Directory View - Ported from delivered mockup stores.html.
 * Renders verified sellers, their contact info, location, categories, and products.
 */
import { stateEngine } from '../../store/stateEngine.js';
import { pushPath, pathForListing, ROUTE_PRODUCT } from '../../store/router.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

// Store cards are built from GET /api/sellers/public - every ACTIVE seller
// with their live listings. No sample data here: the placeholder sellers this
// file shipped with were invented names and phone numbers, which on a live
// marketplace reads as contact details for businesses that do not exist.

export function renderStoresPage(container) {
  let searchFilter = '';
  let categoryFilter = 'all';
  let districtFilter = 'all';

  function render() {
    const state = stateEngine.getState();

    // Fetch once; the loading flag is what records that it was attempted.
    if (state.loading.publicSellers === undefined) {
      stateEngine.loadPublicSellers().catch(() => {});
    }
    const loading = state.loading.publicSellers !== false;

    const stores = (state.publicSellers || []).map((s) => ({
      ...s,
      phone: s.phone || '',
      district: s.district || 'Rwanda',
      initials: (s.name || '?').split(/\s+/).filter(Boolean).slice(0, 2)
        .map((w) => w[0].toUpperCase()).join(''),
      memberSinceYear: s.memberSince ? new Date(s.memberSince).getFullYear() : null,
      verified: true,
    }));

    // Filter options come from the sellers actually on the page - a seller in
    // Musanze must be reachable, and a category nobody trades in is dead UI.
    const allCategories = [...new Set(stores.flatMap((s) => s.categories || []))].sort();
    const allDistricts = [...new Set(stores.map((s) => s.district).filter(Boolean))].sort();

    const filteredStores = stores.filter((store) => {
      const matchSearch = !searchFilter ||
        store.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        store.phone.includes(searchFilter) ||
        store.district.toLowerCase().includes(searchFilter.toLowerCase());

      const matchCat = categoryFilter === 'all' || store.categories.includes(categoryFilter);
      const matchDist = districtFilter === 'all' || store.district.toLowerCase() === districtFilter.toLowerCase();

      return matchSearch && matchCat && matchDist;
    });

    container.innerHTML = `
      <div class="bg-[#F4F7F6] py-6 px-4 min-h-screen">
        <div class="compact-container">

          <!-- Page Title & Stats Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <i class="fa-solid fa-store text-brand-green"></i> Verified Sellers & Stores
              </h1>
              <p class="text-xs text-gray-500 mt-1">Explore verified sellers, their listed products, phone numbers, and location details</p>
            </div>

            <div class="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm text-xs">
              <span class="font-bold text-brand-green">Active Stores: ${stores.length}</span>
              <span class="text-gray-300">|</span>
              <span class="text-gray-600">Total Listings: ${stores.reduce((acc, s) => acc + s.productCount, 0)}</span>
            </div>
          </div>

          <!-- Filter Controls Bar -->
          <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap items-center gap-3 flex-1">

              <div class="relative min-w-[200px] flex-1 sm:flex-none">
                <input type="text" id="seller-search" value="${escapeHtml(searchFilter)}"
                  placeholder="Search seller name or phone..."
                  class="w-full bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-xl py-2 px-3 pl-8 outline-none focus:border-brand-green">
                <i class="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>

              <select id="category-filter" class="bg-gray-50 border border-gray-300 text-gray-700 text-xs rounded-xl py-2 px-3 outline-none focus:border-brand-green">
                <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
                ${allCategories.map((c) => `<option value="${escapeHtml(c)}" ${categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>

              <select id="district-filter" class="bg-gray-50 border border-gray-300 text-gray-700 text-xs rounded-xl py-2 px-3 outline-none focus:border-brand-green">
                <option value="all" ${districtFilter === 'all' ? 'selected' : ''}>All Districts</option>
                ${allDistricts.map((d) => `<option value="${escapeHtml(d)}" ${districtFilter === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
              </select>
            </div>

            <span class="text-xs text-gray-500 font-medium">Showing <strong class="text-gray-900" id="store-count">${filteredStores.length} ${filteredStores.length === 1 ? "Store" : "Stores"}</strong></span>
          </div>

          <!-- STORES GRID -->
          <div class="space-y-6" id="stores-list">
            ${filteredStores.length === 0 ? `
              <div class="bg-white rounded-2xl p-12 text-center border border-gray-200">
                ${loading ? `
                  <i class="fa-solid fa-spinner fa-spin text-3xl text-gray-300 mb-3"></i>
                  <h3 class="font-bold text-gray-700 text-base mb-1">Loading verified sellers...</h3>
                ` : `
                  <i class="fa-solid fa-store-slash text-4xl text-gray-300 mb-3"></i>
                  <h3 class="font-bold text-gray-700 text-base mb-1">No verified stores found</h3>
                  <p class="text-xs text-gray-500">${stores.length ? 'Try adjusting your search terms or filter criteria.' : 'No sellers have been approved yet.'}</p>
                `}
              </div>
            ` : filteredStores.map((store) => `
              <div class="store-card bg-white rounded-2xl p-5 shadow-sm border border-gray-200 transition hover:shadow-md">
                <!-- Top Info Row -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div class="flex items-center gap-3">
                    <div class="w-14 h-14 rounded-full bg-green-100 border-2 border-brand-green flex items-center justify-center text-brand-green font-black text-xl shadow-inner shrink-0">
                      ${store.initials}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h2 class="text-lg font-bold text-gray-900">${escapeHtml(store.name)}</h2>
                        ${store.verified ? `
                          <span class="bg-green-100 text-brand-green text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <i class="fa-solid fa-circle-check"></i> Verified Seller
                          </span>
                        ` : ''}
                      </div>
                      <div class="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-1">
                        ${store.phone ? `
                          <span class="flex items-center gap-1 font-semibold text-gray-800">
                            <i class="fa-solid fa-phone text-brand-green"></i> ${escapeHtml(store.phone)}
                          </span>
                        ` : ''}
                        <span class="flex items-center gap-1">
                          <i class="fa-solid fa-location-dot text-brand-orange"></i> District: ${escapeHtml(store.district)}
                        </span>
                        <span class="flex items-center gap-1">
                          <i class="fa-solid fa-box text-gray-400"></i> ${store.productCount} ${store.productCount === 1 ? "Product" : "Products"} Listed
                        </span>
                        ${store.memberSinceYear ? `
                          <span class="flex items-center gap-1">
                            <i class="fa-solid fa-calendar-check text-gray-400"></i> Member since ${store.memberSinceYear}
                          </span>
                        ` : ''}
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    ${store.phone ? `
                      <a href="tel:${escapeHtml(store.phone.replace(/\s+/g, ''))}" class="bg-brand-green text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-green-800 transition flex items-center gap-1.5 shadow">
                        <i class="fa-solid fa-phone text-xs"></i> Call Seller
                      </a>
                      <a href="https://wa.me/${escapeHtml(store.phone.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 shadow">
                        <i class="fa-brands fa-whatsapp text-xs"></i> WhatsApp
                      </a>
                    ` : `
                      <span class="text-xs text-gray-400 italic">No contact number on file</span>
                    `}
                  </div>
                </div>

                <!-- Products Carousel/Grid -->
                <div class="mt-4">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-bold text-gray-700 uppercase tracking-wider">Store Inventory</span>
                    <div class="flex gap-1.5">
                      ${store.categories.map((c) => `<span class="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">${escapeHtml(c)}</span>`).join('')}
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    ${store.products.length === 0 ? `
                      <p class="col-span-full text-xs text-gray-500 text-center py-4">This seller has no active listings right now.</p>
                    ` : store.products.map((p) => `
                      <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-brand-green transition cursor-pointer flex flex-col justify-between group product-item-btn" data-id="${p.id}">
                        <div>
                          <div class="h-32 rounded-lg bg-white overflow-hidden flex items-center justify-center p-2 mb-2 relative border border-gray-100">
                            ${p.image
                              ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" class="max-h-full object-contain group-hover:scale-105 transition transform">`
                              : '<i class="fa-solid fa-image text-2xl text-gray-300"></i>'}
                          </div>
                          <h4 class="text-xs font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-brand-green">${escapeHtml(p.title)}</h4>
                        </div>
                        <div>
                          <div class="flex items-baseline gap-1.5 mt-2">
                            <span class="font-black text-sm text-brand-dark">${escapeHtml(p.currency || 'RWF')} ${Number(p.price).toLocaleString()}</span>
                          </div>
                          <!-- The mockup showed a star rating here. Product has no
                               rating or review column, so there is nothing to render
                               that would not be invented; category and location are
                               the real facts we hold about a listing. -->
                          <div class="flex items-center gap-1 text-[9px] text-gray-500 mt-1">
                            <i class="fa-solid fa-tag text-gray-300"></i>
                            <span>${escapeHtml(p.category || 'Uncategorised')}</span>
                            ${p.district ? `<span class="text-gray-300">|</span><span>${escapeHtml(p.district)}</span>` : ''}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

        </div>
      </div>
    `;

    // Bind event handlers
    const searchInput = container.querySelector('#seller-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchFilter = e.target.value;
        render();
      });
    }

    const catSelect = container.querySelector('#category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        categoryFilter = e.target.value;
        render();
      });
    }

    const distSelect = container.querySelector('#district-filter');
    if (distSelect) {
      distSelect.addEventListener('change', (e) => {
        districtFilter = e.target.value;
        render();
      });
    }

    container.querySelectorAll('.product-item-btn').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        pushPath(pathForListing(ROUTE_PRODUCT, id));
        stateEngine.setRoute({ kind: ROUTE_PRODUCT, id });
      });
    });
  }

  render();
}
