import { stateEngine } from '../../store/stateEngine.js';
import { getTranslation } from '../../store/i18n.js';
import { pushPath, pathForListing, ROUTE_PRODUCT } from '../../store/router.js';
import { renderSellerPortal } from './SellerPortal.js';
import { renderStoresPage } from './StoresPage.js';
import { renderProductsPage } from './ProductsPage.js';
import { renderCategoryIcon } from '../../utils/categoryIcon.js';
import { getLargeFooterHtml, bindLargeFooterEvents, initSlimStickyFooter } from '../../components/Footer.js';

// Grey circles, no labels. Deliberately not category-shaped placeholder
// objects: the previous version of this strip rendered invented names
// (Motorcycles, Bicycles, Land & Plots) that no category ever matched, and
// a skeleton built the same way would reintroduce exactly that - text on
// screen that stands for nothing in the database.
const SKELETON_TILES = Array.from({ length: 5 }, () => `
  <div class="flex flex-col items-center gap-1 flex-1 min-w-[64px] p-1">
      <div class="w-10 h-10 rounded-full bg-gray-100 animate-pulse"></div>
      <div class="h-2 w-10 rounded bg-gray-100 animate-pulse"></div>
  </div>
`).join('');

let flashClockTimer = null;
let totalCountdownSeconds = (2 * 3600) + (45 * 60) + 30;

export function cleanupFlashClock() {
  if (flashClockTimer) {
    clearInterval(flashClockTimer);
    flashClockTimer = null;
  }
}

function startFlashClock(container) {
  cleanupFlashClock();

  const updateCountdown = () => {
    if (totalCountdownSeconds <= 0) {
      totalCountdownSeconds = 9999;
    } else {
      totalCountdownSeconds--;
    }

    const hrs = Math.floor(totalCountdownSeconds / 3600);
    const mins = Math.floor((totalCountdownSeconds % 3600) / 60);
    const secs = totalCountdownSeconds % 60;

    const hStr = String(hrs).padStart(2, '0');
    const mStr = String(mins).padStart(2, '0');
    const sStr = String(secs).padStart(2, '0');

    // Banner Digits
    const dealHrs = container.querySelector('#deal-hours');
    const dealMins = container.querySelector('#deal-mins');
    const dealSecs = container.querySelector('#deal-secs');
    if (dealHrs) dealHrs.textContent = hStr;
    if (dealMins) dealMins.textContent = mStr;
    if (dealSecs) dealSecs.textContent = sStr;

    // Modal Digits
    const modalHrs = container.querySelector('#modal-timer-hours');
    const modalMins = container.querySelector('#modal-timer-mins');
    const modalSecs = container.querySelector('#modal-timer-secs');
    if (modalHrs) modalHrs.textContent = hStr;
    if (modalMins) modalMins.textContent = mStr;
    if (modalSecs) modalSecs.textContent = sStr;

    // Individual item countdowns
    container.querySelectorAll('.modal-item-countdown').forEach((el) => {
      el.textContent = `${hStr}:${mStr}:${sStr}`;
    });
  };

  updateCountdown();
  flashClockTimer = setInterval(updateCountdown, 1000);
}

export function renderMarketplaceView(container) {
  function render() {
    const state = stateEngine.getState();
    const currentLang = state.currentLang || 'en';
    const activeTab = state.ui.marketplaceTab || 'products';
    const filters = state.ui.marketplaceFilters || { searchQuery: '', selectedCategory: 'all', selectedDistrict: 'all' };
    const productsAttempted = state.loading.products !== undefined;
    const categoriesAttempted = state.loading.categories !== undefined;
    const productsLoading = !!state.loading.products || !productsAttempted;

    if (!productsAttempted) stateEngine.loadProducts(filters).catch(() => {});
    if (!categoriesAttempted) stateEngine.loadCategories().catch(() => {});

    // Sub-tab handling: Stores, Catalog, Seller Portal
    if (activeTab === 'stores') {
      cleanupFlashClock();
      container.innerHTML = `
        <div style="min-height: 100vh; display: flex; flex-direction: column;">
          <div style="flex: 1;" id="stores-mount"></div>
          ${getLargeFooterHtml(currentLang)}
        </div>
      `;
      bindLargeFooterEvents(container);
      const storesMount = container.querySelector('#stores-mount');
      if (storesMount) renderStoresPage(storesMount);
      return;
    }

    if (activeTab === 'catalog') {
      cleanupFlashClock();
      container.innerHTML = `
        <div style="min-height: 100vh; display: flex; flex-direction: column;">
          <div style="flex: 1;" id="products-mount"></div>
          ${getLargeFooterHtml(currentLang)}
        </div>
      `;
      bindLargeFooterEvents(container);
      const productsMount = container.querySelector('#products-mount');
      if (productsMount) renderProductsPage(productsMount);
      return;
    }

    if (activeTab === 'seller_portal') {
      cleanupFlashClock();
      container.innerHTML = `
        <div style="min-height: 100vh; display: flex; flex-direction: column;">
          <div style="flex: 1;" id="seller-portal-mount"></div>
          ${getLargeFooterHtml(currentLang)}
        </div>
      `;
      bindLargeFooterEvents(container);
      const sellerMount = container.querySelector('#seller-portal-mount');
      if (sellerMount) renderSellerPortal(sellerMount);
      return;
    }

    // Default Home View
    container.innerHTML = `
      <div id="view-home" class="view-section active h-full flex flex-col justify-between p-2">
            
            <!-- Hero Section -->
            <section class="compact-container mt-1 shrink-0">
                <div class="hero-bg flex flex-col md:flex-row items-center justify-between p-4 md:p-6 min-h-[220px] relative">
                    <div class="md:w-[60%] z-10">
                        <h1 class="text-3xl md:text-5xl font-black text-brand-dark leading-[1.1] mb-2">
                            Everything you need,<br>all in one place.
                        </h1>
                        <p class="text-sm text-gray-700 mb-4 max-w-sm">
                            Buy, sell and discover thousands of products, vehicles, properties and more.
                        </p>
                        
                        <div class="flex gap-3 mb-4">
                            <button id="hero-shop-now-btn" class="bg-brand-dark text-white font-semibold py-2 px-6 rounded-md hover:bg-gray-800 transition shadow-lg text-sm">Shop Now</button>
                            <button id="hero-explore-ads-btn" class="bg-white border-2 border-brand-dark text-brand-dark font-semibold py-2 px-6 rounded-md hover:bg-gray-50 transition shadow-sm text-sm">Explore Ads</button>
                        </div>
                        
                        <div class="flex gap-2 sm:gap-3 lg:gap-4 pt-3 border-t border-gray-300/50">
                            <div class="flex items-center gap-1.5 shrink-0">
                                <div class="text-brand-orange"><i class="fa-solid fa-shield-halved text-lg"></i></div>
                                <div class="text-[9px] leading-tight"><p class="font-bold text-brand-dark whitespace-nowrap">Secure Payments</p><p class="text-gray-500 whitespace-nowrap">100% Safe & Secure</p></div>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <div class="text-brand-green"><i class="fa-solid fa-certificate text-lg"></i></div>
                                <div class="text-[9px] leading-tight"><p class="font-bold text-brand-dark whitespace-nowrap">Verified Sellers</p><p class="text-gray-500 whitespace-nowrap">Trusted & Reliable</p></div>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <div class="text-brand-dark"><i class="fa-solid fa-truck-fast text-lg"></i></div>
                                <div class="text-[9px] leading-tight"><p class="font-bold text-brand-dark whitespace-nowrap">Fast Delivery</p><p class="text-gray-500 whitespace-nowrap">Across Rwanda</p></div>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <div class="text-brand-orange"><i class="fa-solid fa-headset text-lg"></i></div>
                                <div class="text-[9px] leading-tight"><p class="font-bold text-brand-dark whitespace-nowrap">24/7 Support</p><p class="text-gray-500 whitespace-nowrap">We're here for you</p></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="md:w-[40%] relative h-[240px] md:h-[260px] w-full flex items-center justify-end">
                         <img src="/hero-banner.png" alt="Kigali Market Showcase" class="h-full w-auto object-contain drop-shadow-lg z-10" onError="this.src='/hero-section.png'">
                    </div>
                </div>
            </section>

            <!-- Category Bar -->
            <!--
              Built from state.categories - the rows an admin actually manages.
              This strip used to be ten hardcoded tiles (Products, Cars,
              Motorcycles, Bicycles, Land & Plots, Furniture, Electronics,
              Home & Living, Fashion, More) that matched no category in the
              database. Nine of them fell through the click handler's else
              branch and just opened the unfiltered catalog, so Motorcycles,
              Bicycles and Fashion all showed the identical grid; the tenth
              filtered on the literal id 'cat_vehicles', which does not exist -
              real ids are uuids - so "Cars" reliably showed nothing at all.
            -->
            <section class="compact-container mt-[-15px] relative z-20 shrink-0">
                <div class="flex justify-between items-center bg-white rounded-2xl shadow-md p-2 overflow-x-auto no-scrollbar gap-1 border border-gray-100">

                    <div class="flex flex-col items-center gap-1 flex-1 min-w-[64px] p-1 cursor-pointer group cat-tile-btn ${filters.selectedCategory === 'all' || !filters.selectedCategory ? 'opacity-100' : 'opacity-80'}" data-cat="all">
                        <div class="w-10 h-10 rounded-full bg-brand-green text-white flex items-center justify-center text-lg shadow-inner group-hover:bg-green-800 transition">
                            <i class="fa-solid fa-border-all"></i>
                        </div>
                        <span class="text-[9px] font-bold text-center leading-tight">All<br>Categories</span>
                    </div>

                    ${state.categories.length === 0 && !categoriesAttempted ? SKELETON_TILES : state.categories.map((c) => `
                      <div class="flex flex-col items-center gap-1 flex-1 min-w-[64px] p-1 cursor-pointer group cat-tile-btn ${filters.selectedCategory === c.id ? 'opacity-100' : 'opacity-80'}" data-cat="${escapeHtml(c.id)}" title="${escapeHtml(c.name)}">
                          <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl transition transform group-hover:scale-110 ${filters.selectedCategory === c.id ? 'ring-2 ring-brand-green' : ''}">
                              ${renderCategoryIcon(c.icon, { size: 26, alt: c.name })}
                          </div>
                          <span class="text-[9px] font-semibold text-center text-gray-700 leading-tight line-clamp-2">${escapeHtml(c.name)}</span>
                      </div>
                    `).join('')}

                    <!-- Real estate is its own portal rather than a Category row,
                         so it stays hardcoded - unlike the tiles above it, this
                         one goes somewhere real. -->
                    <div class="flex flex-col items-center gap-1 flex-1 min-w-[64px] p-1 cursor-pointer group cat-tile-btn" data-cat="realestate">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl transition transform group-hover:scale-110">
                            <i class="fa-solid fa-house text-stone-600"></i>
                        </div>
                        <span class="text-[9px] font-semibold text-center text-gray-700">Real Estate</span>
                    </div>
                </div>
            </section>

            <!-- Flash Deals & Products Section -->
            <section class="compact-container mt-2 flex-1 flex flex-col justify-center min-h-0">
                <div class="flex flex-col lg:flex-row gap-3 h-[180px]">
                    
                    <!-- Flash Deals Banner -->
                    <div id="flash-deals-card" class="bg-[#0f3b25] rounded-xl p-4 text-white lg:w-1/5 flex flex-col justify-between relative overflow-hidden shadow-card shrink-0 cursor-pointer hover:opacity-95 transition">
                        <div class="absolute top-0 right-0 p-2 opacity-20 text-5xl"><i class="fa-solid fa-bolt"></i></div>
                        <div>
                            <h2 class="text-lg font-bold flex items-center gap-1 mb-1">Flash Deals <span class="flex text-yellow-400 text-xs"><i class="fa-solid fa-bolt"></i><i class="fa-solid fa-bolt -ml-1"></i></span></h2>
                            <button id="open-flash-deals-btn" class="text-[10px] text-gray-300 hover:text-white underline font-semibold">View all deals</button>
                        </div>
                        
                        <div class="flex gap-2">
                            <div class="bg-white text-brand-dark rounded w-10 h-11 flex flex-col items-center justify-center shadow-inner">
                                <span class="text-sm font-bold leading-none" id="deal-hours">02</span>
                                <span class="text-[8px] font-medium">Hours</span>
                            </div>
                            <div class="text-lg font-bold mt-1 text-white/50">:</div>
                            <div class="bg-white text-brand-dark rounded w-10 h-11 flex flex-col items-center justify-center shadow-inner">
                                <span class="text-sm font-bold leading-none" id="deal-mins">45</span>
                                <span class="text-[8px] font-medium">Mins</span>
                            </div>
                            <div class="text-lg font-bold mt-1 text-white/50">:</div>
                            <div class="bg-white text-brand-dark rounded w-10 h-11 flex flex-col items-center justify-center shadow-inner">
                                <span class="text-sm font-bold leading-none" id="deal-secs">30</span>
                                <span class="text-[8px] font-medium">Secs</span>
                            </div>
                        </div>
                    </div>

                    <!-- Products Grid -->
                    <div class="lg:w-4/5 grid grid-cols-2 md:grid-cols-5 gap-3 relative h-full">
                        ${productsLoading && state.products.length === 0 ? `
                            <div class="col-span-5 bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-100 flex items-center justify-center">
                                Loading featured items...
                            </div>
                        ` : state.products.length > 0 ? state.products.slice(0, 5).map((prod) => {
                            const was = Number(prod.originalPrice) || 0;
                            const hasDiscount = was > prod.price;
                            const pct = hasDiscount ? Math.round((1 - prod.price / was) * 100) : 20;
                            return `
                                <div class="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group flex flex-col view-item-btn" data-id="${prod.id}">
                                    <div class="absolute top-2 left-2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">-${pct}%</div>
                                    <div class="flex-1 flex items-center justify-center mb-2">
                                        <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" class="max-h-[100px] w-auto object-contain group-hover:scale-105 transition transform">
                                    </div>
                                    <div class="mt-auto">
                                        <h3 class="text-[11px] font-medium text-gray-800 mb-0.5 truncate">${escapeHtml(prod.title)}</h3>
                                        <div class="flex items-end gap-1.5 mb-1">
                                            <span class="font-bold text-sm text-brand-dark leading-none">RWF ${prod.price.toLocaleString()}</span>
                                            ${was ? `<span class="text-[9px] text-gray-400 line-through leading-none pb-[1px]">RWF ${was.toLocaleString()}</span>` : ''}
                                        </div>
                                        <div class="flex items-center text-[9px] text-yellow-400">
                                            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star text-gray-300"></i>
                                            <span class="text-gray-400 ml-1">(${prod.reviewCount || 128})</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                            <!-- Sample Mockup Product Cards from index.html -->
                            <div class="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group flex flex-col sample-item-btn">
                                <div class="absolute top-2 left-2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">-20%</div>
                                <div class="flex-1 flex items-center justify-center mb-2">
                                    <i class="fa-solid fa-headphones text-4xl text-gray-800"></i>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-[11px] font-medium text-gray-800 mb-0.5 truncate">Wireless Headphones</h3>
                                    <div class="flex items-end gap-1.5 mb-1">
                                        <span class="font-bold text-sm text-brand-dark leading-none">RWF 18,000</span>
                                        <span class="text-[9px] text-gray-400 line-through leading-none pb-[1px]">RWF 22,500</span>
                                    </div>
                                    <div class="flex items-center text-[9px] text-yellow-400">
                                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star text-gray-300"></i>
                                        <span class="text-gray-400 ml-1">(128)</span>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group flex flex-col sample-item-btn">
                                <div class="absolute top-2 left-2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">-15%</div>
                                <div class="flex-1 flex items-center justify-center mb-2">
                                    <i class="fa-solid fa-blender text-4xl text-yellow-600"></i>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-[11px] font-medium text-gray-800 mb-0.5 truncate">Blender 500W</h3>
                                    <div class="flex items-end gap-1.5 mb-1">
                                        <span class="font-bold text-sm text-brand-dark leading-none">RWF 25,000</span>
                                        <span class="text-[9px] text-gray-400 line-through leading-none pb-[1px]">RWF 30,000</span>
                                    </div>
                                    <div class="flex items-center text-[9px] text-yellow-400">
                                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i>
                                        <span class="text-gray-400 ml-1">(96)</span>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group flex flex-col sample-item-btn">
                                <div class="absolute top-2 left-2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">-25%</div>
                                <div class="flex-1 flex items-center justify-center mb-2">
                                    <i class="fa-regular fa-clock text-4xl text-gray-800"></i>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-[11px] font-medium text-gray-800 mb-0.5 truncate">Smart Watch Series 8</h3>
                                    <div class="flex items-end gap-1.5 mb-1">
                                        <span class="font-bold text-sm text-brand-dark leading-none">RWF 35,000</span>
                                        <span class="text-[9px] text-gray-400 line-through leading-none pb-[1px]">RWF 46,000</span>
                                    </div>
                                    <div class="flex items-center text-[9px] text-yellow-400">
                                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star text-gray-300"></i>
                                        <span class="text-gray-400 ml-1">(74)</span>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group hidden md:flex flex-col sample-item-btn">
                                <div class="absolute top-2 left-2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">-10%</div>
                                <div class="flex-1 flex items-center justify-center mb-2">
                                    <i class="fa-solid fa-suitcase-rolling text-4xl text-gray-900"></i>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-[11px] font-medium text-gray-800 mb-0.5 truncate">Travel Backpack</h3>
                                    <div class="flex items-end gap-1.5 mb-1">
                                        <span class="font-bold text-sm text-brand-dark leading-none">RWF 15,000</span>
                                        <span class="text-[9px] text-gray-400 line-through leading-none pb-[1px]">RWF 16,500</span>
                                    </div>
                                    <div class="flex items-center text-[9px] text-yellow-400">
                                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                                        <span class="text-gray-400 ml-1">(74)</span>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group hidden md:flex flex-col sample-item-btn">
                                <div class="absolute top-2 left-2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">-30%</div>
                                <div class="flex-1 flex items-center justify-center mb-2">
                                    <i class="fa-solid fa-shoe-prints text-4xl text-gray-300"></i>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-[11px] font-medium text-gray-800 mb-0.5 truncate">Men's Sneakers</h3>
                                    <div class="flex items-end gap-1.5 mb-1">
                                        <span class="font-bold text-sm text-brand-dark leading-none">RWF 22,000</span>
                                        <span class="text-[9px] text-gray-400 line-through leading-none pb-[1px]">RWF 31,500</span>
                                    </div>
                                    <div class="flex items-center text-[9px] text-yellow-400">
                                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star text-gray-300"></i>
                                        <span class="text-gray-400 ml-1">(113)</span>
                                    </div>
                                </div>
                            </div>
                        `}
                        
                        <!-- Scroll Arrow -->
                        <div class="absolute right-0 top-1/2 transform -translate-y-1/2 bg-brand-dark text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-gray-800 -mr-3 z-20 hidden lg:flex">
                            <i class="fa-solid fa-chevron-right text-xs"></i>
                        </div>
                    </div>
                </div>
            </section>
      </div>

      <!-- FLASH DEALS COUNTDOWN MODAL -->
      <div id="flash-deals-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">

          <button id="close-flash-deals-btn" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>

          <!-- Modal Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-6">
            <div>
              <div class="flex items-center gap-2">
                <span class="bg-yellow-400 text-brand-dark font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <i class="fa-solid fa-bolt"></i> LIMITED TIME SALE
                </span>
                <span class="text-xs text-red-600 font-bold flex items-center gap-1 animate-pulse">
                  <i class="fa-solid fa-fire"></i> Ending Soon!
                </span>
              </div>
              <h3 class="text-2xl font-black text-gray-900 mt-1">Live Countdown Flash Deals</h3>
              <p class="text-xs text-gray-500">Grab these top-discounted products before the countdown timer runs out!</p>
            </div>

            <!-- Live Timer Badge in Modal -->
            <div class="bg-brand-green text-white p-3 rounded-2xl flex items-center gap-3 shadow-md shrink-0">
              <span class="text-xs font-bold uppercase tracking-wider text-green-200">Deals Expire In:</span>
              <div class="flex items-center gap-1.5 font-mono text-sm font-black">
                <span class="bg-white text-brand-dark px-2 py-1 rounded" id="modal-timer-hours">02</span>:
                <span class="bg-white text-brand-dark px-2 py-1 rounded" id="modal-timer-mins">45</span>:
                <span class="bg-white text-brand-dark px-2 py-1 rounded" id="modal-timer-secs">30</span>
              </div>
            </div>
          </div>

          <!-- Countdown Products Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

            <!-- Item 1 -->
            <div class="bg-white border-2 border-brand-orange/30 rounded-2xl p-4 relative flex flex-col justify-between hover:shadow-lg transition cursor-pointer group modal-claim-item">
              <span class="absolute top-3 left-3 bg-brand-orange text-white text-xs font-black px-2 py-0.5 rounded-lg z-10">-20% OFF</span>
              <span class="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                <i class="fa-solid fa-clock"></i> <span class="modal-item-countdown">02:45:30</span>
              </span>
              <div class="h-32 flex items-center justify-center my-3 bg-gray-50 rounded-xl">
                <i class="fa-solid fa-headphones text-5xl text-gray-800 group-hover:scale-110 transition transform"></i>
              </div>
              <div>
                <h4 class="font-bold text-sm text-gray-900 mb-1">Wireless Noise-Canceling Headphones</h4>
                <div class="flex items-baseline gap-2 mb-2">
                  <span class="text-lg font-black text-brand-green">RWF 18,000</span>
                  <span class="text-xs text-gray-400 line-through">RWF 22,500</span>
                </div>
                <div class="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-2">
                  <div class="bg-brand-orange h-full rounded-full" style="width: 78%"></div>
                </div>
                <div class="flex items-center justify-between text-[10px] text-gray-500 mb-3">
                  <span>Stock: <strong>14/50 left</strong></span>
                  <span class="text-green-600 font-bold">Fast Selling</span>
                </div>
                <button class="w-full bg-brand-green text-white font-bold py-2 rounded-xl text-xs hover:bg-green-800 transition shadow">
                  Claim Deal <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>

            <!-- Item 2 -->
            <div class="bg-white border-2 border-brand-orange/30 rounded-2xl p-4 relative flex flex-col justify-between hover:shadow-lg transition cursor-pointer group modal-claim-item">
              <span class="absolute top-3 left-3 bg-brand-orange text-white text-xs font-black px-2 py-0.5 rounded-lg z-10">-15% OFF</span>
              <span class="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                <i class="fa-solid fa-clock"></i> <span class="modal-item-countdown">02:45:30</span>
              </span>
              <div class="h-32 flex items-center justify-center my-3 bg-gray-50 rounded-xl">
                <i class="fa-solid fa-blender text-5xl text-yellow-600 group-hover:scale-110 transition transform"></i>
              </div>
              <div>
                <h4 class="font-bold text-sm text-gray-900 mb-1">High-Power 500W Blender</h4>
                <div class="flex items-baseline gap-2 mb-2">
                  <span class="text-lg font-black text-brand-green">RWF 25,000</span>
                  <span class="text-xs text-gray-400 line-through">RWF 30,000</span>
                </div>
                <div class="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-2">
                  <div class="bg-brand-orange h-full rounded-full" style="width: 85%"></div>
                </div>
                <div class="flex items-center justify-between text-[10px] text-gray-500 mb-3">
                  <span>Stock: <strong>6/40 left</strong></span>
                  <span class="text-red-600 font-bold">Almost Sold Out</span>
                </div>
                <button class="w-full bg-brand-green text-white font-bold py-2 rounded-xl text-xs hover:bg-green-800 transition shadow">
                  Claim Deal <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>

            <!-- Item 3 -->
            <div class="bg-white border-2 border-brand-orange/30 rounded-2xl p-4 relative flex flex-col justify-between hover:shadow-lg transition cursor-pointer group modal-claim-item">
              <span class="absolute top-3 left-3 bg-brand-orange text-white text-xs font-black px-2 py-0.5 rounded-lg z-10">-25% OFF</span>
              <span class="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                <i class="fa-solid fa-clock"></i> <span class="modal-item-countdown">02:45:30</span>
              </span>
              <div class="h-32 flex items-center justify-center my-3 bg-gray-50 rounded-xl">
                <i class="fa-regular fa-clock text-5xl text-gray-800 group-hover:scale-110 transition transform"></i>
              </div>
              <div>
                <h4 class="font-bold text-sm text-gray-900 mb-1">Smart Watch Series 8</h4>
                <div class="flex items-baseline gap-2 mb-2">
                  <span class="text-lg font-black text-brand-green">RWF 35,000</span>
                  <span class="text-xs text-gray-400 line-through">RWF 46,000</span>
                </div>
                <div class="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-2">
                  <div class="bg-brand-orange h-full rounded-full" style="width: 62%"></div>
                </div>
                <div class="flex items-center justify-between text-[10px] text-gray-500 mb-3">
                  <span>Stock: <strong>19/50 left</strong></span>
                  <span class="text-green-600 font-bold">In Stock</span>
                </div>
                <button class="w-full bg-brand-green text-white font-bold py-2 rounded-xl text-xs hover:bg-green-800 transition shadow">
                  Claim Deal <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>

          </div>

          <div class="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span class="text-xs text-gray-500 font-medium"><i class="fa-solid fa-circle-info text-brand-green"></i> Prices revert to regular price when countdown expires</span>
            <button id="modal-view-catalog-btn" class="bg-brand-dark text-white font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-gray-800 transition shadow">
              View All Products Catalog <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    startFlashClock(container);

    // Event Bindings
    container.querySelector('#hero-shop-now-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ marketplaceTab: 'catalog' });
    });

    container.querySelector('#hero-explore-ads-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ marketplaceTab: 'catalog' });
    });

    container.querySelectorAll('.cat-tile-btn').forEach((tile) => {
      tile.addEventListener('click', () => {
        const cat = tile.dataset.cat;

        if (cat === 'realestate') {
          stateEngine.setPortal('realestate');
          return;
        }

        // Every other tile carries a real Category id (or 'all'), so the
        // filter it sets is one the products endpoint understands. The old
        // handler recognised three literal strings and dropped everything
        // else into an unfiltered catalog, which is why nine of the ten
        // tiles showed the same grid.
        const selectedCategory = cat === 'all' ? 'all' : cat;
        stateEngine.setUI({
          marketplaceTab: 'catalog',
          marketplaceFilters: { ...filters, selectedCategory },
        });
        stateEngine.loadProducts({
          category: cat === 'all' ? undefined : cat,
          search: filters.searchQuery || undefined,
          district: filters.selectedDistrict,
        }).catch(() => {});
      });
    });

    // Flash Deals Modal triggers
    const modal = container.querySelector('#flash-deals-modal');
    const openModal = () => modal?.classList.remove('hidden');
    const closeModal = () => modal?.classList.add('hidden');

    container.querySelector('#flash-deals-card')?.addEventListener('click', openModal);
    container.querySelector('#open-flash-deals-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal();
    });
    container.querySelector('#close-flash-deals-btn')?.addEventListener('click', closeModal);
    container.querySelector('#modal-view-catalog-btn')?.addEventListener('click', () => {
      closeModal();
      stateEngine.setUI({ marketplaceTab: 'catalog' });
    });

    container.querySelectorAll('.view-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        pushPath(pathForListing(ROUTE_PRODUCT, id));
        stateEngine.setRoute({ kind: ROUTE_PRODUCT, id });
      });
    });

    container.querySelectorAll('.sample-item-btn, .modal-claim-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeModal();
        const firstProd = state.products[0];
        if (firstProd) {
          pushPath(pathForListing(ROUTE_PRODUCT, firstProd.id));
          stateEngine.setRoute({ kind: ROUTE_PRODUCT, id: firstProd.id });
        } else {
          stateEngine.setUI({ marketplaceTab: 'catalog' });
        }
      });
    });
  }

  render();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}