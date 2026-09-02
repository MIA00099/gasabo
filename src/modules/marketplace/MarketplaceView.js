import { stateEngine } from '../../store/stateEngine.js';
import { getTranslation } from '../../store/i18n.js';
import { pushPath, pathForListing, pathForRoute, ROUTE_POST_AD, ROUTE_PRODUCT, ROUTE_PRODUCTS } from '../../store/router.js';
import { renderSellerPortal } from './SellerPortal.js';
import { renderStoresPage } from './StoresPage.js';
import { renderProductsPage } from './ProductsPage.js';
import { renderCategoryIcon, formatCategoryName } from '../../utils/categoryIcon.js';
import { starsHtml } from '../../utils/stars.js';
import { openCategoryDropdown } from '../../components/dropdownMenu.js';
import { openShareModal } from '../../components/ShareModal.js';
import { getHomeProductSections, isSpotlightProduct } from './homeProductSections.js';

// Beyond this the homepage stops being a homepage. The catalog is what the
// "View all" button below the grid is for.
const HOME_MAX_MORE = 15;

function groupProductsBySection(products, categories) {
  if (!Array.isArray(products) || products.length === 0) return [];

  const catMap = new Map();
  (categories || []).forEach((c) => {
    if (c && c.id) catMap.set(c.id, formatCategoryName(c.name));
  });

  const sectionsMap = new Map();
  products.forEach((p) => {
    let catName = 'Featured Market Listings';
    if (p.category && typeof p.category === 'object' && p.category.name) {
      catName = formatCategoryName(p.category.name);
    } else if (p.categoryId && catMap.has(p.categoryId)) {
      catName = catMap.get(p.categoryId);
    } else if (typeof p.category === 'string') {
      catName = formatCategoryName(p.category);
    }
    if (!sectionsMap.has(catName)) {
      sectionsMap.set(catName, []);
    }
    sectionsMap.get(catName).push(p);
  });

  const getPriority = (name) => {
    const n = String(name || '').toLowerCase().trim();
    if (/electronics/i.test(n)) return 1;
    if (/vehicle|car|auto/i.test(n)) return 2;
    if (/house|estate|property/i.test(n)) return 3;
    if (/land|plot/i.test(n)) return 4;
    if (/motorcycle|moto|bike/i.test(n)) return 5;
    return 10;
  };

  const result = [];
  sectionsMap.forEach((prods, name) => {
    result.push({ name, products: prods });
  });
  result.sort((a, b) => getPriority(a.name) - getPriority(b.name));
  return result;
}

/**
 * One product tile.
 *
 * Used by every product row on the homepage - the Featured & Trending
 * section, each category section, and the "more products" grid - which is
 * the point of it existing: the tile carries the discount badge, the price,
 * the strikethrough, the stars and the like count, and a second pasted copy
 * would drift from this one the first time any of those changed.
 */
function productCardHtml(prod) {
  const was = Number(prod.originalPrice) || 0;
  const hasDiscount = was > prod.price;
  const pct = hasDiscount ? Math.round((1 - prod.price / was) * 100) : 20;

  return `
    <div class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group flex flex-col view-item-btn" data-id="${prod.id}">
        <div class="relative w-full h-48 sm:h-52 max-h-[240px] bg-gray-100 overflow-hidden flex items-center justify-center">
            ${hasDiscount ? `<div class="absolute top-2 left-2 bg-brand-orange text-white text-[9px] font-bold px-2 py-0.5 rounded-md z-10 shadow-sm">-${pct}%</div>` : ''}
            ${isSpotlightProduct(prod) ? `
              <div class="absolute top-2 right-2 z-10 ${prod.isFeatured ? 'bg-amber-400 text-amber-900' : 'bg-brand-green text-white'} text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                ${prod.isFeatured ? '⭐ Featured' : '🔥 Trending'}
              </div>
            ` : ''}
            <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition transform">
        </div>
        <div class="p-2.5 flex-1 flex flex-col justify-between">
            <div class="flex items-start justify-between gap-1 mb-0.5">
              <h3 class="text-[11px] font-medium text-gray-800 truncate flex-1">${escapeHtml(prod.title)}</h3>
              <button type="button" class="home-card-share-btn p-1 text-gray-400 hover:text-brand-green rounded-full transition shrink-0"
                data-id="${prod.id}" aria-label="Share ${escapeHtml(prod.title)}" title="Share listing">
                <i class="fa-solid fa-share-nodes text-[10px]"></i>
              </button>
            </div>
            <div class="flex items-end gap-1.5 mb-1">
                <span class="font-bold text-sm text-brand-dark leading-none">RWF ${prod.price.toLocaleString()}</span>
                ${was ? `<span class="text-[9px] text-gray-400 line-through leading-none pb-[1px]">RWF ${was.toLocaleString()}</span>` : ''}
            </div>
            ${prod.rating ? `
              <div class="flex flex-wrap items-center gap-1 text-[9px] text-yellow-400 min-w-0">
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
}

const CATEGORY_TILE_CLASS = 'flex flex-col items-center gap-2 flex-1 min-w-[92px] px-2 py-1.5 cursor-pointer group cat-tile-btn';
const CATEGORY_ICON_FRAME_CLASS = 'w-[72px] h-[72px] rounded-full flex items-center justify-center overflow-hidden shrink-0 transition transform group-hover:scale-105';
const CATEGORY_ICON_SIZE = 72;

// Grey circles, no labels. Deliberately not category-shaped placeholder
// objects: the previous version of this strip rendered invented names
// (Motorcycles, Bicycles, Land & Plots) that no category ever matched, and
// a skeleton built the same way would reintroduce exactly that - text on
// screen that stands for nothing in the database.
const SKELETON_TILES = Array.from({ length: 5 }, () => `
  <div class="flex flex-col items-center gap-2 flex-1 min-w-[92px] px-2 py-1.5">
      <div class="w-[72px] h-[72px] rounded-full bg-gray-100 animate-pulse"></div>
      <div class="h-2.5 w-14 rounded bg-gray-100 animate-pulse"></div>
  </div>
`).join('');

const JOBS_CATEGORY_PATTERN = /\b(job|jobs|employ|career|vacanc|worker)\b/i;

function flashPromoCardHtml(item, duplicate = false) {
  const hidden = duplicate ? ' aria-hidden="true"' : '';
  if (item.image) {
    return `
      <div class="flash-promo-card flash-promo-banner-card"${hidden}>
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.title)}</strong>
        </div>
      </div>
    `;
  }

  return `
    <div class="flash-promo-card"${hidden}>
      <span class="flash-promo-icon"><i class="fa-solid ${escapeHtml(item.icon)}"></i></span>
      <span class="flash-promo-card-copy">
        <em>${escapeHtml(item.label)}</em>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.text)}</span>
      </span>
    </div>
  `;
}

function renderFlashPromoCards(heroAds = []) {
  const bannerCards = heroAds
    .filter((ad) => ad && ad.image)
    .slice(0, 3)
    .map((ad) => ({
      image: ad.image,
      label: 'Sponsored',
      title: ad.title || 'Kigali Market ad',
    }));

  const fallbackCards = [
    {
      icon: 'fa-bullhorn',
      label: 'Promoted ads',
      title: 'Show products here',
      text: 'Feature listings where buyers are already looking.',
    },
    {
      icon: 'fa-briefcase',
      label: 'Jobs',
      title: 'Workers and employers',
      text: 'Post jobs or browse current work opportunities.',
    },
    {
      icon: 'fa-bolt',
      label: 'Flash sales',
      title: 'Timed offers stand out',
      text: 'Countdown deals get a stronger homepage position.',
    },
    {
      icon: 'fa-store',
      label: 'Seller tools',
      title: 'Manage your listings',
      text: 'Keep products, prices and photos fresh.',
    },
  ];

  const items = [...bannerCards, ...fallbackCards];
  return items.map((item) => flashPromoCardHtml(item)).join('') +
    items.map((item) => flashPromoCardHtml(item, true)).join('');
}

let flashClockTimer = null;

export function cleanupFlashClock() {
  if (flashClockTimer) {
    clearInterval(flashClockTimer);
    flashClockTimer = null;
  }
}


// Kept for the app-wide cleanup hook. The hero used to auto-advance on an
// interval, but that movement read like the page was refreshing/shaking while
// people were trying to browse. Slides are now changed only by a deliberate
// dot click.
let heroSlideTimer = null;
const reloadedFlashDealKeys = new Set();

export function cleanupHeroSlider() {
  if (heroSlideTimer) {
    clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }
}

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

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      show(Number(dot.dataset.dot));
    });
  });
}

function startFlashClock(container) {
  cleanupFlashClock();

  // Real deadline, not a made-up loop. The card carries the featured deal's
  // end time as an epoch-ms attribute; every tick shows the true remaining
  // time, so all viewers see the same finish and it stops at zero instead of
  // resetting to 9999 the way the placeholder used to.
  const card = container.querySelector('#flash-deals-card');
  const endsAt = card ? Number(card.getAttribute('data-flash-ends-at')) : 0;
  if (!endsAt) return;

  const initialRemainingMs = endsAt ? endsAt - Date.now() : 0;

  const updateCountdown = () => {
    const remainingMs = endsAt ? endsAt - Date.now() : 0;
    const remaining = Math.max(0, Math.floor(remainingMs / 1000));

    // The moment a live deal hits zero, refresh the list once so the expired
    // one drops off and the next deal (if any) takes the card.
    if (endsAt && remaining === 0 && initialRemainingMs > 0 && !reloadedFlashDealKeys.has(endsAt)) {
      reloadedFlashDealKeys.add(endsAt);
      stateEngine.loadFlashDeals().catch(() => {});
    }

    const hrs = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;

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

    // Each modal item counts to its own deal's end time, not the featured
    // card's - the "View all deals" list holds several deals ending at
    // different moments.
    container.querySelectorAll('.modal-item-countdown').forEach((el) => {
      const itemEndsAt = Number(el.getAttribute('data-flash-ends-at'));
      const left = Math.max(0, Math.floor((itemEndsAt - Date.now()) / 1000));
      el.textContent = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60]
        .map((n) => String(n).padStart(2, '0'))
        .join(':');
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

    if (!productsAttempted || !categoriesAttempted || state.loading.flashDeals === undefined || state.loading.banners === undefined) {
      stateEngine.loadMarketplaceHomeData(filters).catch(() => {});
    }

    const {
      spotlightProducts,
      visibleFlashDeals,
      featuredDeal,
      moreProducts,
    } = getHomeProductSections({
      products: state.products,
      flashDeals: state.flashDeals,
      moreLimit: HOME_MAX_MORE,
    });

    // Hero slider images an admin uploaded in the ads section - these are the
    // whole slider. Delete them all and the panel is empty, which is the point:
    // an admin who removes every ad should see every ad gone. Only ACTIVE ads
    // still inside their date window.
    const now = Date.now();
    const heroAds = (state.banners || []).filter(
      (b) => b.type === 'HERO_SLIDER' && b.status === 'ACTIVE' && (!b.endDate || new Date(b.endDate).getTime() > now),
    );
    const dotCount = heroAds.length;
    const flashPromoCards = renderFlashPromoCards(heroAds);

    // Sub-tab handling: Stores, Catalog, Seller Portal
    if (activeTab === 'stores') {
      cleanupFlashClock();
      cleanupHeroSlider();
      container.innerHTML = `
        <div style="min-height: 100vh;" id="stores-mount"></div>
      `;
      const storesMount = container.querySelector('#stores-mount');
      if (storesMount) renderStoresPage(storesMount);
      return;
    }

    if (activeTab === 'catalog') {
      cleanupFlashClock();
      cleanupHeroSlider();
      container.innerHTML = `
        <div style="min-height: 100vh;" id="products-mount"></div>
      `;
      const productsMount = container.querySelector('#products-mount');
      if (productsMount) renderProductsPage(productsMount);
      return;
    }

    if (activeTab === 'seller_portal') {
      cleanupFlashClock();
      cleanupHeroSlider();
      container.innerHTML = `
        <div style="min-height: 100vh;" id="seller-portal-mount"></div>
      `;
      const sellerMount = container.querySelector('#seller-portal-mount');
      if (sellerMount) renderSellerPortal(sellerMount);
      return;
    }

    // Default Home View
    container.innerHTML = `
      <div id="view-home" class="view-section active h-full flex flex-col justify-between py-2">
            
            <!-- Hero Section -->
            <section class="compact-container px-3 sm:px-4 lg:px-6 mt-1 shrink-0">
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

                    <!-- Hero Image Slider Container, over the dark blue right
                         side. Everything in here is an ad an admin uploaded
                         (Admin -> Marketplace -> Ad Banners, type "Hero
                         Slider"). Six built-in slides - the all-in-one banner,
                         a Real Estate text panel and four product photos - used
                         to stand in whenever there were none, so deleting every
                         ad brought back a set of promotions that no longer
                         appeared anywhere in the admin and so could not be
                         removed. With no ads the panel is now just the empty
                         navy arc. -->
                    <div class="slider-container" id="heroSlider">

                        ${heroAds.map((ad, i) => `
                          <!-- Admin-uploaded slide (ads section). These are full
                               photos and banners of any shape, so the slide is
                               a "cover-slide": the sharp image is shown whole
                               (never cropped) over a blurred, zoomed copy of
                               itself, which fills the panel edge to edge
                               instead of leaving flat navy bars. Works for a
                               wide banner and a tall phone panel alike.
                               Wrapped in a link when the ad carries a target. -->
                          <div class="slide cover-slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
                            <img class="slide-bg" src="${escapeHtml(ad.image)}" alt="" aria-hidden="true">
                            ${ad.targetUrl ? `<a href="${escapeHtml(ad.targetUrl)}" style="display:contents">` : ''}
                            <img class="slide-fg" src="${escapeHtml(ad.image)}" alt="${escapeHtml(ad.title || 'Promotion')}">
                            ${ad.targetUrl ? `</a>` : ''}
                          </div>
                        `).join('')}

                    </div>

                    <!-- Slider Navigation Dots. One per ad - the driver reads
                         .dot straight from the DOM, so parity here is what keeps
                         every slide reachable. One ad has nothing to switch
                         between and none has nothing to point at, so the dots
                         only appear from two ads up. -->
                    ${dotCount > 1 ? `
                    <div class="slider-dots" id="sliderDots">
                        ${Array.from({ length: dotCount }, (_, i) => `
                          <button type="button" class="dot ${i === 0 ? 'active' : ''}" data-dot="${i}" aria-label="Show slide ${i + 1}"></button>
                        `).join('')}
                    </div>
                    ` : ''}

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
            <section class="compact-container px-3 sm:px-4 lg:px-6 mt-[-15px] relative z-20 shrink-0">
                <div class="home-category-rail-shell">
                  <button type="button" class="section-scroll-btn home-cat-scroll-btn home-cat-scroll-btn-left" data-target="home-category-rail" data-dir="-1" aria-label="Scroll categories left">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <div class="home-cat-scroll-fade home-cat-scroll-fade-left" aria-hidden="true"></div>
                  <div id="home-category-rail" class="home-category-rail flex justify-between items-center bg-white rounded-2xl shadow-md p-2 overflow-x-auto no-scrollbar gap-1 border border-gray-100">

                    <div class="${CATEGORY_TILE_CLASS} ${filters.selectedCategory === 'all' || !filters.selectedCategory ? 'opacity-100' : 'opacity-80'}" data-cat="all">
                        <div class="${CATEGORY_ICON_FRAME_CLASS} bg-brand-green text-white text-3xl shadow-inner group-hover:bg-green-800">
                            <i class="fa-solid fa-border-all"></i>
                        </div>
                        <span class="text-xs font-extrabold text-center leading-tight text-gray-900">All<br>Categories</span>
                    </div>

                    ${state.categories.length === 0 && !categoriesAttempted ? SKELETON_TILES : (() => {
                      const getCatPriority = (c) => {
                        const n = String(c.name || '').toLowerCase().trim();
                        if (/electronics/i.test(n)) return 1;
                        if (/vehicle|car|auto/i.test(n)) return 2;
                        if (/house/i.test(n)) return 3;
                        if (/land|plot/i.test(n)) return 4;
                        if (/motorcycle|moto|bike/i.test(n)) return 5;
                        return 100 + (c.order || 0);
                      };
                      const sortedCats = [...state.categories].sort((a, b) => getCatPriority(a) - getCatPriority(b));
                      return sortedCats.map((c) => `
                        <div class="${CATEGORY_TILE_CLASS} ${filters.selectedCategory === c.id ? 'opacity-100' : 'opacity-80'}" data-cat="${escapeHtml(c.id)}" title="${escapeHtml(formatCategoryName(c.name))}">
                            <div class="${CATEGORY_ICON_FRAME_CLASS} text-2xl ${filters.selectedCategory === c.id ? 'ring-2 ring-brand-green' : ''}">
                                ${renderCategoryIcon(c.icon, { size: CATEGORY_ICON_SIZE, alt: formatCategoryName(c.name) })}
                            </div>
                            <span class="text-xs font-extrabold text-center text-gray-900 leading-tight line-clamp-2">${escapeHtml(formatCategoryName(c.name))}</span>
                        </div>
                      `).join('');
                    })()}
                  </div>
                  <div class="home-cat-scroll-fade home-cat-scroll-fade-right" aria-hidden="true"></div>
                  <button type="button" class="section-scroll-btn home-cat-scroll-btn home-cat-scroll-btn-right" data-target="home-category-rail" data-dir="1" aria-label="Scroll categories right">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
            </section>

            <!-- Featured & Trending - a real section now, styled exactly like
                 the category sections below (colored bar, bold title, count
                 badge, scroll arrows, one horizontally-scrolling row). Every
                 flagged listing shows here, not just the first five, and (see
                 moreProducts above, which excludes these ids) it does not
                 also show again under its own category further down - each
                 listing appears in exactly one section. Absent entirely when
                 there is nothing flagged, the same as any category section
                 with nothing in it. -->
            ${productsLoading && state.products.length === 0 ? `
              <section class="compact-container px-3 sm:px-4 lg:px-6 mt-5 shrink-0">
                  <div class="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-100">
                      ${t('ui_loading_items')}
                  </div>
              </section>
            ` : spotlightProducts.length > 0 ? `
              <section class="compact-container px-3 sm:px-4 lg:px-6 mt-5 shrink-0">
                  <div class="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                      <div class="flex items-center gap-2">
                          <span class="w-2.5 h-5 bg-brand-orange rounded-full inline-block"></span>
                          <h3 class="text-sm sm:text-base font-black text-gray-900 tracking-tight">${t('ui_spotlight_section_title')}</h3>
                          <span class="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">${spotlightProducts.length}</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                          <button type="button" class="section-scroll-btn w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green flex items-center justify-center transition" data-target="spotlight-row" data-dir="-1" aria-label="Scroll ${t('ui_spotlight_section_title')} left">
                              <i class="fa-solid fa-chevron-left text-xs"></i>
                          </button>
                          <button type="button" class="section-scroll-btn w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green flex items-center justify-center transition" data-target="spotlight-row" data-dir="1" aria-label="Scroll ${t('ui_spotlight_section_title')} right">
                              <i class="fa-solid fa-chevron-right text-xs"></i>
                          </button>
                      </div>
                  </div>

                  <!-- One row that scrolls horizontally (swipe on touch, arrows
                       on desktop), same as the category sections below. -->
                  <div id="spotlight-row" class="section-row flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1">
                      ${spotlightProducts.map((prod) => `<div class="shrink-0 w-40 sm:w-44 md:w-48">${productCardHtml(prod)}</div>`).join('')}
                  </div>
              </section>
            ` : ''}

            <!-- Flash Deals - the delivered markup, class for class. Two
                 adjustments so it works inside the app: the countdown keeps
                 the ids the existing clock drives (it also feeds the modal),
                 and the "View all deals" anchor has its click prevented,
                 since href="#" would otherwise push a hash the router strips
                 straight back off.

                 Flash Deals remains independent from Featured / Trending:
                 an admin setting a countdown should still make the deal
                 visible, while regular category rows below stay filtered. -->
            <section class="compact-container px-3 sm:px-4 lg:px-6 mt-2 shrink-0">
              <div class="flash-home-row">
                <section id="flash-deals-card" class="flash-deals rounded-2xl shadow-card ${featuredDeal ? 'cursor-pointer hover:opacity-95' : ''} transition"
                  ${featuredDeal ? `data-flash-ends-at="${new Date(featuredDeal.flashDealEndsAt).getTime()}"` : ''}>

                  <div class="flash-head">
                    <h2>${t('ui_flash_deals')} <span>&#9889;</span></h2>
                    ${featuredDeal ? `<a href="#" class="view-deals" id="open-flash-deals-btn" role="button">${t('ui_view_all_deals')}</a>` : ''}
                  </div>

                  ${featuredDeal ? `
                    <!-- The real product the deal is on: an admin picks the
                         listing and the end time, and the card shows both. -->
                    <div class="flash-product view-item-btn" data-id="${escapeHtml(featuredDeal.id)}" role="button" tabindex="0">
                      <div class="flash-product-img">
                        <img src="${escapeHtml((featuredDeal.images && featuredDeal.images[0]) || '')}" alt="${escapeHtml(featuredDeal.title)}" loading="lazy">
                      </div>
                      <div class="flash-product-info">
                        <h3>${escapeHtml(featuredDeal.title)}</h3>
                        <span class="flash-product-price">RWF ${Number(featuredDeal.price).toLocaleString()}</span>
                      </div>
                    </div>
                  ` : `
                    <p class="flash-empty">${t('ui_flash_none')}</p>
                  `}

                  ${featuredDeal ? `
                  <div class="countdown" aria-label="Flash deal countdown">

                    <div class="time-box">
                      <div class="number" id="deal-hours">00</div>
                      <div class="label">${t('ui_hours')}</div>
                    </div>

                    <div class="separator">:</div>

                    <div class="time-box">
                      <div class="number" id="deal-mins">00</div>
                      <div class="label">${t('ui_mins')}</div>
                    </div>

                    <div class="separator">:</div>

                    <div class="time-box">
                      <div class="number" id="deal-secs">00</div>
                      <div class="label">${t('ui_secs')}</div>
                    </div>

                  </div>
                  ` : ''}

                </section>
                <aside class="flash-promo-panel" aria-label="Kigali Market promotions">
                  <div class="flash-promo-copy">
                    <span class="flash-promo-eyebrow">Kigali Market Ads</span>
                    <h3>Promote, hire and sell faster</h3>
                    <p>Featured listings, timed deals and jobs stay visible where buyers are already browsing.</p>
                  </div>

                  <div class="flash-promo-marquee" aria-label="Promotional highlights">
                    <div class="flash-promo-track">
                      ${flashPromoCards}
                    </div>
                  </div>

                  <div class="flash-promo-actions">
                    <button type="button" id="flash-promo-post-ad-btn" class="flash-promo-action flash-promo-action-primary">
                      <i class="fa-solid fa-plus"></i>
                      <span>Post an Ad</span>
                    </button>
                    <button type="button" id="flash-promo-worker-btn" class="flash-promo-action flash-promo-action-dark">
                      <i class="fa-solid fa-briefcase"></i>
                      <span>Become a Worker</span>
                    </button>
                  </div>
                </aside>
              </div>
            </section>

            <!-- Everything not in the Featured & Trending section above:
                 grouped by category (Electronics, Vehicles, ...), each its
                 own horizontally-scrolling section, with whatever is left
                 over after that in a plain wrapping grid underneath.

                 The homepage used to render products.slice(0, 5) and stop.
                 With eight products in the database that left three with
                 nowhere to appear, and anything a seller posted after the
                 fifth was invisible from the front page. -->
             ${moreProducts.length > 0 ? (() => {
               const catSections = groupProductsBySection(moreProducts, state.categories);

               const catSectionsHtml = catSections.map((sec, i) => `
                 <section class="compact-container px-3 sm:px-4 lg:px-6 mt-5 shrink-0">
                     <div class="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                         <div class="flex items-center gap-2">
                             <span class="w-2.5 h-5 bg-brand-green rounded-full inline-block"></span>
                             <h3 class="text-sm sm:text-base font-black text-gray-900 tracking-tight">${escapeHtml(sec.name)}</h3>
                             <span class="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">${sec.products.length}</span>
                         </div>
                         <div class="flex items-center gap-1.5">
                             <button type="button" class="section-scroll-btn w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green flex items-center justify-center transition" data-target="home-sec-${i}" data-dir="-1" aria-label="Scroll ${escapeHtml(sec.name)} left">
                                 <i class="fa-solid fa-chevron-left text-xs"></i>
                             </button>
                             <button type="button" class="section-scroll-btn w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green flex items-center justify-center transition" data-target="home-sec-${i}" data-dir="1" aria-label="Scroll ${escapeHtml(sec.name)} right">
                                 <i class="fa-solid fa-chevron-right text-xs"></i>
                             </button>
                         </div>
                     </div>

                     <!-- One row that scrolls horizontally (swipe on touch, arrows on
                          desktop) instead of wrapping into a multi-row grid. -->
                     <div id="home-sec-${i}" class="section-row flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1">
                         ${sec.products.map((prod) => `<div class="shrink-0 w-40 sm:w-44 md:w-48">${productCardHtml(prod)}</div>`).join('')}
                     </div>
                 </section>
               `).join('');

               return `
                 ${catSectionsHtml}

                 <section class="compact-container px-3 sm:px-4 lg:px-6 mt-6 shrink-0">
                     <div class="flex items-baseline justify-between mb-2">
                         <h2 class="text-base font-black text-gray-900">${t('ui_more_products')}</h2>
                         <button type="button" id="home-view-all-btn"
                           class="text-xs font-bold text-brand-green hover:underline">
                             ${t('ui_view_all')} (${state.products.length})
                         </button>
                     </div>

                     <div class="home-more-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                         ${moreProducts.map((prod) => productCardHtml(prod)).join('')}
                     </div>

                     ${state.products.length > spotlightProducts.length + moreProducts.length ? `
                       <div class="flex justify-center mt-3">
                           <button type="button" id="home-view-all-btn-2"
                             class="bg-brand-dark text-white text-xs font-bold px-5 py-2 rounded-full hover:bg-gray-800 transition">
                               ${t('ui_view_all')} (${state.products.length})
                           </button>
                       </div>
                     ` : ''}
                 </section>
               `;
             })() : ''}
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
          ${visibleFlashDeals.length === 0 ? `
            <p class="text-center text-gray-500 text-sm py-10">${t('ui_flash_none')}</p>
          ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            ${visibleFlashDeals.map((deal) => {
              const was = Number(deal.originalPrice) || 0;
              const pct = was > deal.price ? Math.round((1 - deal.price / was) * 100) : 0;
              return `
              <div class="bg-white border-2 border-brand-orange/30 rounded-2xl p-4 relative flex flex-col justify-between hover:shadow-lg transition cursor-pointer group view-item-btn" data-id="${escapeHtml(deal.id)}">
                ${pct ? `<span class="absolute top-3 left-3 bg-brand-orange text-white text-xs font-black px-2 py-0.5 rounded-lg z-10">-${pct}% OFF</span>` : ''}
                <span class="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <i class="fa-solid fa-clock"></i> <span class="modal-item-countdown" data-flash-ends-at="${new Date(deal.flashDealEndsAt).getTime()}">00:00:00</span>
                </span>
                <div class="h-32 flex items-center justify-center my-3 bg-gray-50 rounded-xl overflow-hidden">
                  <img src="${escapeHtml((deal.images && deal.images[0]) || '')}" alt="${escapeHtml(deal.title)}" loading="lazy" class="max-h-full w-auto object-contain group-hover:scale-110 transition transform">
                </div>
                <div>
                  <h4 class="font-bold text-sm text-gray-900 mb-1 line-clamp-2">${escapeHtml(deal.title)}</h4>
                  <div class="flex items-baseline gap-2 mb-3">
                    <span class="text-lg font-black text-brand-green">RWF ${Number(deal.price).toLocaleString()}</span>
                    ${was > deal.price ? `<span class="text-xs text-gray-400 line-through">RWF ${was.toLocaleString()}</span>` : ''}
                  </div>
                  <button class="w-full bg-brand-green text-white font-bold py-2 rounded-xl text-xs hover:bg-green-800 transition shadow">
                    ${t('ui_view_deal')} <i class="fa-solid fa-arrow-right ml-1"></i>
                  </button>
                </div>
              </div>
              `;
            }).join('')}
          </div>
          `}

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

    // Both "View all" buttons on the more-products section - the one in its
    // header, and the one under the grid that only appears when the homepage
    // is holding back more than it shows.
    container.querySelectorAll('#home-view-all-btn, #home-view-all-btn-2').forEach((btn) => {
      btn.addEventListener('click', () => {
        stateEngine.setUI({ marketplaceTab: 'catalog' });
      });
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

    container.querySelector('#flash-promo-post-ad-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ authIntent: '', sellerDashboardTab: 'new_product', productAdType: 'product' });
      pushPath(pathForRoute(ROUTE_POST_AD));
      stateEngine.setRoute({ kind: ROUTE_POST_AD, id: null });
    });

    container.querySelector('#flash-promo-worker-btn')?.addEventListener('click', () => {
      const latestState = stateEngine.getState();
      const latestFilters = latestState.ui.marketplaceFilters || {};
      const jobsCategory = (latestState.categories || []).find((c) => JOBS_CATEGORY_PATTERN.test(c.name || ''));
      const nextFilters = {
        ...latestFilters,
        selectedCategory: jobsCategory ? jobsCategory.id : 'all',
        searchQuery: jobsCategory ? '' : 'jobs',
      };

      pushPath(pathForRoute(ROUTE_PRODUCTS));
      stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
      stateEngine.setUI({ marketplaceTab: 'catalog', marketplaceFilters: nextFilters, jobsNotice: '' });
      stateEngine.loadProducts({
        category: jobsCategory ? jobsCategory.id : undefined,
        search: jobsCategory ? undefined : 'jobs',
        district: latestFilters.selectedDistrict,
      }).catch(() => {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    container.querySelectorAll('.view-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        pushPath(pathForListing(ROUTE_PRODUCT, id));
        stateEngine.setRoute({ kind: ROUTE_PRODUCT, id });
      });
    });

    // Left/right arrows scroll a category row by roughly a screen-width of
    // cards. The row itself also scrolls by touch/swipe.
    container.querySelectorAll('.section-scroll-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = container.querySelector('#' + btn.dataset.target);
        if (!row) return;
        row.scrollBy({ left: Number(btn.dataset.dir) * Math.max(260, row.clientWidth * 0.85), behavior: 'smooth' });
      });
    });

    container.querySelectorAll('.home-card-share-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const id = btn.dataset.id;
        const prod = (stateEngine.getState().products || []).find((p) => p.id === id);
        if (!prod) return;
        openShareModal({
          title: prod.title,
          text: `Check out "${prod.title}" (${prod.currency || 'RWF'} ${prod.price.toLocaleString()}) on Kigali Market!`,
          url: pathForListing(ROUTE_PRODUCT, prod.id),
          image: prod.images && prod.images[0] ? prod.images[0] : null,
          price: prod.price,
          currency: prod.currency || 'RWF',
          location: prod.district,
        });
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
