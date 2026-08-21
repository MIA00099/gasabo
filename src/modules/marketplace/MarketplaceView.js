import { stateEngine } from '../../store/stateEngine.js';
import { getTranslation } from '../../store/i18n.js';
import { pushPath, pathForListing, ROUTE_PRODUCT } from '../../store/router.js';
import { renderSellerPortal } from './SellerPortal.js';
import { renderStoresPage } from './StoresPage.js';
import { renderProductsPage } from './ProductsPage.js';
import { renderCategoryIcon } from '../../utils/categoryIcon.js';
import { starsHtml } from '../../utils/stars.js';
import { openCategoryDropdown } from '../../components/dropdownMenu.js';
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


// The hero slider's interval, tracked the same way the flash clock is. Every
// stateEngine notify re-renders this view, so an interval left running would
// point at slides that have been thrown away - and a new one would be started
// on top of it on every render, so they would stack up.
let heroSlideTimer = null;

export function cleanupHeroSlider() {
  if (heroSlideTimer) {
    clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }
}

const SLIDE_DURATION = 4000;

function startHeroSlider(container) {
  cleanupHeroSlider();

  const slider = container.querySelector('#heroSlider');
  const slides = [...container.querySelectorAll('.slide')];
  const dots = [...container.querySelectorAll('.dot')];
  if (!slider || slides.length < 2) return;

  let current = 0;

  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', String(i === current));
    });
  }

  function start() {
    cleanupHeroSlider();
    heroSlideTimer = setInterval(() => show(current + 1), SLIDE_DURATION);
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      show(Number(dot.dataset.dot));
      start(); // restart the clock so a chosen slide gets its full turn
    });
  });

  // Pause while the reader is looking at or interacting with it - rotating a
  // slide out from under someone mid-read is the usual complaint about
  // carousels.
  slider.addEventListener('mouseenter', cleanupHeroSlider);
  slider.addEventListener('mouseleave', start);
  slider.addEventListener('focusin', cleanupHeroSlider);
  slider.addEventListener('focusout', start);

  // Nothing to animate for someone who asked for less motion; they still get
  // the dots to move through the slides by hand.
  const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (stillness.matches) return;

  start();
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
    const t = (key) => getTranslation(currentLang, key);
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
      cleanupHeroSlider();
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
      cleanupHeroSlider();
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
      cleanupHeroSlider();
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
                <!-- Markup from preview(2).html. Two changes it needs to work
                     inside the app rather than as a standalone page:
                       - the dots are <button data-dot> instead of
                         <div onclick="goToSlide(n)">, because that global does
                         not exist in a bundled module (and a div cannot be
                         reached by keyboard);
                       - the buttons carry ids so the existing handlers can wire
                         Shop Now / Explore Ads to the catalog. -->
                <div class="hero-section-wrapper flex flex-col md:flex-row items-center justify-between p-4 md:p-6 min-h-[280px]">

                    <!-- Hero Text Content - Make sure it stays on the white/left side -->
                    <div class="w-full md:w-[45%] lg:w-[43%] z-20 relative">
                        <!-- Added a subtle background for text readability if the curve overlaps slightly on smaller screens -->
                        <div class="bg-white/80 md:bg-transparent p-4 md:p-0 rounded-xl backdrop-blur-sm md:backdrop-blur-none">
                            <h1 class="text-3xl md:text-4xl lg:text-5xl font-black text-brand-dark leading-[1.05] mb-3">
                                ${t('ui_hero_line1')}<br>${t('ui_hero_line2')}
                            </h1>
                            <p class="text-sm md:text-[13px] text-gray-700 mb-4 max-w-md font-medium leading-relaxed">
                                ${t('ui_hero_sub')}
                            </p>

                            <div class="flex gap-3 mb-4">
                                <button type="button" id="hero-shop-now-btn" class="bg-brand-dark text-white font-semibold py-2 px-6 rounded-md hover:bg-gray-800 transition shadow-lg text-sm">${t('ui_shop_now')}</button>
                                <button type="button" id="hero-explore-ads-btn" class="bg-white border-2 border-brand-dark text-brand-dark font-semibold py-2 px-6 rounded-md hover:bg-gray-50 transition shadow-sm text-sm">${t('ui_explore_ads')}</button>
                            </div>

                            <!-- Was the Secure Payments / Verified Sellers /
                                 Fast Delivery badge row. Same shape as the
                                 header search so the two read as one control
                                 in two places, and submitting either lands on
                                 the same filtered catalog. -->
                            <form id="hero-search-form" role="search"
                              class="flex rounded-full border-2 border-brand-green overflow-hidden h-11 bg-white shadow-sm mt-1 w-full max-w-xl">
                                <button type="button" id="hero-search-cat" aria-haspopup="menu" aria-expanded="false"
                                  class="bg-gray-50 px-3 text-xs text-gray-600 border-r border-gray-200 items-center gap-1 hover:bg-gray-100 hidden sm:flex whitespace-nowrap shrink-0">
                                    ${t('ui_all_categories')} <i class="fa-solid fa-chevron-down text-[10px]"></i>
                                </button>
                                <label class="sr-only" for="hero-search-input">Search listings</label>
                                <input id="hero-search-input" type="text" autocomplete="off"
                                  placeholder="${t('ui_search_placeholder')}"
                                  class="flex-1 px-3 outline-none text-xs min-w-0 bg-transparent">
                                <button type="submit" aria-label="Search"
                                  class="bg-brand-green text-white px-6 hover:bg-green-800 transition-colors shrink-0">
                                    <i class="fa-solid fa-search text-sm"></i>
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- Hero Image Slider Container positioned over the dark blue right side -->
                    <div class="slider-container" id="heroSlider">

                        <!-- Slide 1: Original Image Focus -->
                        <div class="slide active" data-slide="0">
                            <img src="/hero-banner.png" alt="All in one place showcase"
                              onerror="this.onerror=null;this.src='/hero-section.png'">
                        </div>

                        <!-- Slide 2: Real Estate. Still a text panel - the
                             houses photo is the one piece of artwork not
                             supplied yet. -->
                        <div class="slide" data-slide="1">
                            <div class="text-center text-white">
                                <h2 class="text-4xl font-bold mb-2 tracking-wide text-white">${t('ui_real_estate')}</h2>
                                <h3 class="text-3xl font-medium text-white">${t('ui_slide_houses')}</h3>
                            </div>
                        </div>

                        <!-- Slides 3-6: the supplied product photos. These
                             replace the text-only panels that stood in while
                             there was no artwork.

                             All four are cut out, so all four need an
                             alpha channel - the mobile arc puts white behind
                             the top of the slider column, and a rectangle
                             would show there. That means WebP or PNG, and on
                             photographs PNG is ten times the bytes: 115KB for
                             the set against 1.2MB. The PNGs ship too, as the
                             onerror fallback for anything too old to decode
                             WebP.

                             The car and the laptop arrived with studio
                             backgrounds baked in and were keyed out here;
                             the headphones and the sweatshirt came already
                             cut out. -->
                        <div class="slide has-caption" data-slide="2">
                            <img src="/slide-vehicles.webp" alt=""
                              onerror="this.onerror=null;this.src='/slide-vehicles.png'">
                            <div class="slide-caption text-center text-white">
                                <h2>${t('ui_vehicles')}</h2>
                                <h3>${t('ui_slide_cars_bikes')}</h3>
                            </div>
                        </div>

                        <div class="slide has-caption" data-slide="3">
                            <img src="/slide-laptops.webp" alt=""
                              onerror="this.onerror=null;this.src='/slide-laptops.png'">
                            <div class="slide-caption text-center text-white">
                                <h2>${t('ui_slide_electronics')}</h2>
                                <h3>${t('ui_slide_laptops')}</h3>
                            </div>
                        </div>

                        <div class="slide has-caption" data-slide="4">
                            <img src="/slide-headphones.webp" alt=""
                              onerror="this.onerror=null;this.src='/slide-headphones.png'">
                            <div class="slide-caption text-center text-white">
                                <h2>${t('ui_slide_electronics')}</h2>
                                <h3>${t('ui_slide_audio')}</h3>
                            </div>
                        </div>

                        <div class="slide has-caption" data-slide="5">
                            <img src="/slide-fashion.webp" alt=""
                              onerror="this.onerror=null;this.src='/slide-fashion.png'">
                            <div class="slide-caption text-center text-white">
                                <h2>${t('ui_slide_fashion')}</h2>
                                <h3>${t('ui_slide_clothing')}</h3>
                            </div>
                        </div>

                    </div>

                    <!-- Slider Navigation Dots -->
                    <div class="slider-dots" id="sliderDots">
                        <button type="button" class="dot active" data-dot="0" aria-label="Show slide 1"></button>
                        <button type="button" class="dot" data-dot="1" aria-label="Show slide 2"></button>
                        <button type="button" class="dot" data-dot="2" aria-label="Show slide 3"></button>
                        <button type="button" class="dot" data-dot="3" aria-label="Show slide 4"></button>
                        <button type="button" class="dot" data-dot="4" aria-label="Show slide 5"></button>
                        <button type="button" class="dot" data-dot="5" aria-label="Show slide 6"></button>
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
                        <span class="text-[11px] font-bold text-center leading-tight text-gray-900">All<br>Categories</span>
                    </div>

                    ${state.categories.length === 0 && !categoriesAttempted ? SKELETON_TILES : state.categories.map((c) => `
                      <div class="flex flex-col items-center gap-1 flex-1 min-w-[64px] p-1 cursor-pointer group cat-tile-btn ${filters.selectedCategory === c.id ? 'opacity-100' : 'opacity-80'}" data-cat="${escapeHtml(c.id)}" title="${escapeHtml(c.name)}">
                          <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl transition transform group-hover:scale-110 ${filters.selectedCategory === c.id ? 'ring-2 ring-brand-green' : ''}">
                              ${renderCategoryIcon(c.icon, { size: 26, alt: c.name })}
                          </div>
                          <span class="text-[11px] font-bold text-center text-gray-900 leading-tight line-clamp-2">${escapeHtml(c.name)}</span>
                      </div>
                    `).join('')}

                    <!-- Real estate is its own portal rather than a Category row,
                         so it stays hardcoded - unlike the tiles above it, this
                         one goes somewhere real. -->
                    <div class="flex flex-col items-center gap-1 flex-1 min-w-[64px] p-1 cursor-pointer group cat-tile-btn" data-cat="realestate">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl transition transform group-hover:scale-110">
                            <i class="fa-solid fa-house text-stone-600"></i>
                        </div>
                        <span class="text-[11px] font-bold text-center text-gray-900">${t('ui_real_estate')}</span>
                    </div>
                </div>
            </section>

            <!-- Flash Deals & Products Section -->
            <section class="compact-container mt-2 flex-1 flex flex-col justify-center min-h-0">
                <!-- No fixed height here: the card asks for min-height 230px,
                     and a 180px row would simply clip it - which is the whole
                     complaint. The row takes its height from the card and the
                     product grid stretches to match. -->
                <div class="flex flex-col lg:flex-row gap-3 lg:items-stretch">
                    
                    <!-- Flash Deals - the delivered markup, class for class.
                         Two adjustments so it works inside the app: the
                         countdown keeps the ids the existing clock drives
                         (it also feeds the modal), and the "View all deals"
                         anchor has its click prevented, since href="#" would
                         otherwise push a hash the router strips straight back
                         off. -->
                    <section id="flash-deals-card" class="flash-deals rounded-2xl shadow-card cursor-pointer hover:opacity-95 transition lg:shrink-0">

                      <div class="flash-head">
                        <h2>${t('ui_flash_deals')} <span>&#9889;</span></h2>
                        <a href="#" class="view-deals" id="open-flash-deals-btn" role="button">${t('ui_view_all_deals')}</a>
                      </div>

                      <div class="countdown">

                        <div class="time-box">
                          <div class="number" id="deal-hours">02</div>
                          <div class="label">${t('ui_hours')}</div>
                        </div>

                        <div class="separator">:</div>

                        <div class="time-box">
                          <div class="number" id="deal-mins">44</div>
                          <div class="label">${t('ui_mins')}</div>
                        </div>

                        <div class="separator">:</div>

                        <div class="time-box">
                          <div class="number" id="deal-secs">54</div>
                          <div class="label">${t('ui_secs')}</div>
                        </div>

                      </div>

                    </section>



                    <!-- Products Grid -->
                    <div class="lg:flex-1 min-w-0 grid grid-cols-2 md:grid-cols-5 gap-3 relative">
                        ${productsLoading && state.products.length === 0 ? `
                            <div class="col-span-5 bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-100 flex items-center justify-center">
                                ${t('ui_loading_items')}
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
                                        ${prod.rating ? `
                                          <div class="flex items-center gap-1 text-[9px] text-yellow-400">
                                            ${starsHtml(prod.rating)}
                                            <span class="text-gray-600 font-semibold ml-0.5">${Number(prod.rating).toFixed(1)}</span>
                                            ${prod.likeCount ? `<span class="text-gray-400 ml-1"><i class="fa-solid fa-heart text-red-400"></i> ${prod.likeCount}</span>` : ''}
                                          </div>
                                        ` : prod.likeCount ? `
                                          <div class="flex items-center gap-1 text-[9px] text-gray-500">
                                            <i class="fa-solid fa-heart text-red-400"></i> ${prod.likeCount}
                                          </div>
                                        ` : ''}
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
                        <!-- Sits flush with the container edge rather than
                             overhanging it by -mr-3. The page is edge-to-edge
                             now, so that overhang had nothing to hang into and
                             poked 4px off the right of the screen. -->
                        <div class="absolute right-0 top-1/2 transform -translate-y-1/2 bg-brand-dark text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-gray-800 z-20 hidden lg:flex">
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
    startHeroSlider(container);

    // Event Bindings
    // Submitting the hero search does what the header search does: put the
    // query in the shared filter, switch to the catalog and refetch. Both
    // read the same state, so whichever one is used the other shows the query
    // afterwards rather than the two disagreeing.
    container.querySelector('#hero-search-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = container.querySelector('#hero-search-input')?.value.trim() || '';
      const current = stateEngine.getState().ui.marketplaceFilters || {};

      stateEngine.setUI({
        marketplaceTab: 'catalog',
        marketplaceFilters: { ...current, searchQuery: query },
      });
      stateEngine.loadProducts({
        search: query || undefined,
        category: current.selectedCategory,
        district: current.selectedDistrict,
      }).catch(() => {});
    });

    // The chevron on this chip promises a menu; it used to just open the
    // catalog. Now it lists the real categories and filters by the one picked.
    container.querySelector('#hero-search-cat')?.addEventListener('click', (e) => {
      const anchor = e.currentTarget;
      const s = stateEngine.getState();

      openCategoryDropdown(anchor, {
        categories: s.categories || [],
        selectedId: s.ui.marketplaceFilters?.selectedCategory || 'all',
        onSelect: (id) => {
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({
            marketplaceTab: 'catalog',
            marketplaceFilters: { ...filters, selectedCategory: id },
          });
          stateEngine.loadProducts({
            category: id === 'all' ? undefined : id,
            search: filters.searchQuery || undefined,
            district: filters.selectedDistrict,
          }).catch(() => {});
        },
      });
    });

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
      // href="#" comes from the delivered markup.
      e.preventDefault();
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