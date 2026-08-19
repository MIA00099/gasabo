import { renderCategoryIcon } from '../../utils/categoryIcon.js';
import { stateEngine } from '../../store/stateEngine.js';
import { pushPath, pathForListing, ROUTE_PRODUCT } from '../../store/router.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

function starsHtml(rating) {
  const r = Number(rating) || 0;
  if (r <= 0) return '';
  let out = '';
  for (let i = 1; i <= 5; i++) {
    if (r >= i) out += '<i class="fa-solid fa-star"></i>';
    else if (r >= i - 0.5) out += '<i class="fa-solid fa-star-half-stroke"></i>';
    else out += '<i class="fa-regular fa-star text-gray-300"></i>';
  }
  return out;
}

function productCard(prod) {
  const was = Number(prod.originalPrice) || 0;
  const hasDiscount = was > prod.price;
  const pct = hasDiscount ? Math.round((1 - prod.price / was) * 100) : 20;
  const stars = starsHtml(prod.rating);

  return `
    <div class="products-card bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group flex flex-col justify-between"
      data-id="${prod.id}" role="button" tabindex="0">
      ${hasDiscount ? `<div class="absolute top-3 left-3 bg-brand-orange text-white text-[10px] font-bold px-2 py-0.5 rounded z-10">-${pct}%</div>` : ''}
      
      <div class="h-44 flex items-center justify-center mb-3 bg-gray-50 rounded-xl overflow-hidden p-2">
        <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" loading="lazy"
          class="max-h-full object-contain group-hover:scale-105 transition transform">
      </div>
      
      <div>
        <h3 class="text-xs font-semibold text-gray-800 mb-1 line-clamp-2">${escapeHtml(prod.title)}</h3>
        <div class="font-bold text-base text-brand-dark mb-1">
          RWF ${prod.price.toLocaleString()}
          ${hasDiscount ? `<span class="text-xs text-gray-400 line-through font-normal ml-1">RWF ${was.toLocaleString()}</span>` : ''}
        </div>
        ${stars ? `
          <div class="flex items-center text-[10px] text-yellow-400">
            ${stars}
            <span class="text-gray-400 ml-1">(${prod.reviewCount || 120})</span>
          </div>
        ` : `
          <div class="flex items-center gap-1 text-[10px] text-gray-500">
            <i class="fa-solid fa-location-dot text-brand-green"></i> District: ${escapeHtml(prod.district || 'Gasabo')}
          </div>
        `}
      </div>
    </div>
  `;
}

export function renderProductsPage(container) {
  function render() {
    const state = stateEngine.getState();
    const filters = state.ui.marketplaceFilters || { searchQuery: '', selectedCategory: 'all', selectedDistrict: 'all' };
    const sort = state.ui.productsSort || 'newest';

    const productsAttempted = state.loading.products !== undefined;
    const categoriesAttempted = state.loading.categories !== undefined;
    if (!productsAttempted) stateEngine.loadProducts(filters).catch(() => {});
    if (!categoriesAttempted) stateEngine.loadCategories().catch(() => {});

    const activeCat = state.categories.find((c) => c.id === filters.selectedCategory);
    const heading = activeCat ? activeCat.name : 'All Categories';

    const items = [...state.products].sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      return new Date(b.postedDate) - new Date(a.postedDate);
    });

    container.innerHTML = `
      <div id="view-category" class="view-section active py-8 bg-[#F4F7F6] min-h-screen">
        <div class="container mx-auto px-4 md:px-8">

          <div class="flex flex-col lg:flex-row gap-8">
            <!-- Sidebar -->
            <aside class="lg:w-1/4">
              <h2 class="text-xl font-bold mb-4 px-2 text-gray-900">Categories</h2>
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden py-2">
                <ul class="text-sm font-medium text-gray-700">
                  <li>
                    <button type="button" data-cat="all"
                      class="products-cat w-full text-left flex items-center gap-3 px-6 py-3 transition ${
                        !filters.selectedCategory || filters.selectedCategory === 'all'
                          ? 'bg-brand-green text-white rounded-r-lg mr-2 font-bold'
                          : 'hover:bg-gray-50'
                      }">
                      <i class="fa-solid fa-border-all w-5 text-center"></i> All Categories
                    </button>
                  </li>
                  ${state.categories.map((c) => `
                    <li>
                      <button type="button" data-cat="${c.id}"
                        class="products-cat w-full text-left flex items-center gap-3 px-6 py-3 transition ${
                          filters.selectedCategory === c.id
                            ? 'bg-brand-green text-white rounded-r-lg mr-2 font-bold'
                            : 'hover:bg-gray-50'
                        }">
                        <span class="w-5 text-center">${renderCategoryIcon(c.icon, { size: 18, alt: c.name })}</span> ${escapeHtml(c.name)}
                      </button>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </aside>

            <!-- Main Grid Area -->
            <div class="lg:w-3/4">
              <div class="flex flex-wrap gap-3 justify-between items-center mb-6 border-b border-gray-200 pb-4">
                <div>
                  <h1 class="text-2xl md:text-3xl font-bold text-brand-dark mb-1">${escapeHtml(heading)}</h1>
                  <p class="text-gray-500 text-xs">
                    Showing <span class="font-bold text-brand-orange">${items.length}</span>
                    ${items.length === 1 ? 'result' : 'results'}
                  </p>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-gray-500">Sort by:</span>
                  <select id="products-sort" class="border border-gray-300 rounded-xl px-3 py-1.5 bg-white outline-none focus:border-brand-green">
                    <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest First</option>
                    <option value="price_asc" ${sort === 'price_asc' ? 'selected' : ''}>Price: Low to High</option>
                    <option value="price_desc" ${sort === 'price_desc' ? 'selected' : ''}>Price: High to Low</option>
                  </select>
                </div>
              </div>

              ${items.length === 0 ? `
                <div class="bg-white rounded-2xl border border-gray-100 py-16 text-center shadow-sm">
                  <i class="fa-solid fa-magnifying-glass text-4xl text-gray-300 mb-3"></i>
                  <h3 class="text-base font-bold text-gray-900 mb-1">No listings match your search</h3>
                  <p class="text-xs text-gray-500">Try selecting another category or clear your filters.</p>
                </div>
              ` : `
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  ${items.map(productCard).join('')}
                </div>
              `}
            </div>
          </div>

        </div>
      </div>
    `;

    // Sidebar category selection.
    container.querySelectorAll('.products-cat').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        stateEngine.setUI({ marketplaceFilters: { ...filters, selectedCategory: cat } });
        stateEngine.loadProducts({
          search: filters.searchQuery,
          category: cat,
          district: filters.selectedDistrict,
        }).catch(() => {});
      });
    });

    container.querySelector('#products-sort')?.addEventListener('change', (e) => {
      stateEngine.setUI({ productsSort: e.target.value });
    });

    // Cards navigate to the listing detail.
    container.querySelectorAll('.products-card').forEach((card) => {
      const open = () => {
        const id = card.dataset.id;
        pushPath(pathForListing(ROUTE_PRODUCT, id));
        stateEngine.setRoute({ kind: ROUTE_PRODUCT, id });
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  // Render once per call and do NOT subscribe.
  //
  // main.js is already the single stateEngine subscriber and re-runs this on
  // every notify. Subscribing here as well meant a new listener on every
  // render, none of them ever removed - and those leaked copies kept writing
  // this page into #app after the router had moved on, so opening a listing
  // pushed the URL but the detail was immediately overwritten by a stale
  // products render.
  render();
}
