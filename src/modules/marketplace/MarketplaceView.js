import gsap from 'gsap';
import SplitType from 'split-type';
import { stateEngine } from '../../store/stateEngine.js';
import { getTranslation } from '../../store/i18n.js';
import { pushPath, pathForListing, ROUTE_PRODUCT } from '../../store/router.js';
import { renderSellerPortal } from './SellerPortal.js';
import { getLargeFooterHtml, bindLargeFooterEvents, initSlimStickyFooter } from '../../components/Footer.js';

let currentTimeline = null;
let splitLine1Instance = null;
let splitLine2Instance = null;

// Module-scope (not a render() closure var) for the same reason as the
// hero animation instances above: renderMarketplaceView's render() rebuilds
// the whole DOM tree on every stateEngine notify (a search keystroke, a
// filter change, anything) - a closure-local "which slide is showing" would
// snap back to slide 0 on every unrelated re-render. Rotation runs via a
// plain setInterval directly toggling DOM/opacity, not through notify(), so
// an unrelated re-render elsewhere in the app doesn't reset or restart it.
let currentBannerIndex = 0;
let bannerRotationTimer = null;

// The rotating coloured "mat" behind each product photo went with the card
// restyle - the spec puts every product on plain white so the grid reads as
// one surface. ProductDetailModal.js keeps its own copy for the modal.

// Flash Deals countdown. Module scope for the same reason as the banner
// rotation above: render() rebuilds the DOM on every state change, and the
// interval must be cleared rather than left ticking against a detached node.
let flashClockTimer = null;

export function cleanupFlashClock() {
  if (flashClockTimer) {
    clearInterval(flashClockTimer);
    flashClockTimer = null;
  }
}

/**
 * Count down to the next midnight.
 *
 * A real deadline rather than a decorative number that resets on reload -
 * a clock claiming "02:45:30 left" that says the same thing tomorrow is
 * telling the shopper something untrue about how long they have.
 */
function startFlashClock(container) {
  cleanupFlashClock();
  const clock = container.querySelector('#flash-clock');
  if (!clock) return;

  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    const left = Math.max(0, Math.floor((end - now) / 1000));
    const set = (unit, val) => {
      const el = clock.querySelector(`[data-unit="${unit}"]`);
      if (el) el.textContent = pad(val);
    };
    set('h', Math.floor(left / 3600));
    set('m', Math.floor((left % 3600) / 60));
    set('s', left % 60);
  };

  tick();
  flashClockTimer = setInterval(tick, 1000);
}

export function cleanupBannerRotation() {
  if (bannerRotationTimer) {
    clearInterval(bannerRotationTimer);
    bannerRotationTimer = null;
  }
}

export function cleanupHeroAnimation() {
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }
  if (splitLine1Instance) {
    try { splitLine1Instance.revert(); } catch (e) {}
    splitLine1Instance = null;
  }
  if (splitLine2Instance) {
    try { splitLine2Instance.revert(); } catch (e) {}
    splitLine2Instance = null;
  }
}

// Writes the prev/current/next banner frame directly into the already-mounted
// hero-bottom-carousel DOM (img src / text content / link href), instead of
// going through a full re-render - same reasoning as the module-scope index
// above: this needs to survive unrelated stateEngine notifies without
// resetting, and a setInterval-driven rotation must not fight a full re-render
// wiping out mid-animation state.
function paintHeroCarouselFrame(container, banners) {
  const len = banners.length;
  const idx = ((currentBannerIndex % len) + len) % len;
  const prev = banners[(idx - 1 + len) % len];
  const current = banners[idx];
  const next = banners[(idx + 1) % len];

  const prevImg = container.querySelector('#hero-prev-preview img');
  const prevTitle = container.querySelector('#hero-prev-preview .hero-carousel-side-title');
  const nextImg = container.querySelector('#hero-next-preview img');
  const nextTitle = container.querySelector('#hero-next-preview .hero-carousel-side-title');
  const currentTitle = container.querySelector('.hero-carousel-current-title');
  const currentLink = container.querySelector('.hero-carousel-cta');

  if (prevImg) prevImg.src = prev.image;
  if (prevTitle) prevTitle.textContent = prev.title;
  if (nextImg) nextImg.src = next.image;
  if (nextTitle) nextTitle.textContent = next.title;
  if (currentTitle) currentTitle.textContent = current.title;
  if (currentLink) currentLink.href = current.targetUrl || '#';
}

function setupHeroCarousel(container, activeBanners) {
  cleanupBannerRotation();
  if (activeBanners.length === 0) return;

  function goTo(idx) {
    currentBannerIndex = ((idx % activeBanners.length) + activeBanners.length) % activeBanners.length;
    paintHeroCarouselFrame(container, activeBanners);
  }

  container.querySelector('#hero-carousel-prev-btn')?.addEventListener('click', () => goTo(currentBannerIndex - 1));
  container.querySelector('#hero-carousel-next-btn')?.addEventListener('click', () => goTo(currentBannerIndex + 1));
  container.querySelector('#hero-prev-preview')?.addEventListener('click', () => goTo(currentBannerIndex - 1));
  container.querySelector('#hero-next-preview')?.addEventListener('click', () => goTo(currentBannerIndex + 1));

  if (activeBanners.length > 1) {
    bannerRotationTimer = setInterval(() => goTo(currentBannerIndex + 1), 5000);
  }
}

function triggerHeroAnimation(container) {
  cleanupHeroAnimation();

  const line1El = container.querySelector('.hero-title-line1');
  const line2El = container.querySelector('.hero-title-line2');
  const subtitleEl = container.querySelector('.hero-subtitle');
  const ctaBtns = container.querySelectorAll('#hero-browse-btn, #hero-start-selling-btn');

  if (!line1El || !line2El) return;

  // 1. Split Line 1 and Line 2 into individual characters and words using SplitType
  splitLine1Instance = new SplitType(line1El, { types: 'chars,words' });
  splitLine2Instance = new SplitType(line2El, { types: 'chars,words' });

  const line1Chars = Array.from(line1El.querySelectorAll('.char'));
  const line2Chars = Array.from(line2El.querySelectorAll('.char'));
  const allElements = [...line1Chars, ...line2Chars, subtitleEl, ...ctaBtns].filter(Boolean);

  // 2. Continuous repeating timeline (repeat: -1) with bounce sequence
  currentTimeline = gsap.timeline({
    repeat: -1,
    repeatDelay: 1.0
  });

  currentTimeline
    // Initial State Set
    .set([line1Chars, line2Chars], { opacity: 0, y: 60, scale: 0.2 })
    .set(subtitleEl, { opacity: 0, y: 30 })
    .set(ctaBtns, { opacity: 0, y: 30, scale: 0.85 })

    // Step 1: Line 1 character staggered bounce entrance with back.out(2.4)
    .to(line1Chars, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.65,
      stagger: 0.04,
      ease: "back.out(2.4)"
    })

    // Step 2: Line 2 character staggered bounce entrance
    .to(line2Chars, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.65,
      stagger: 0.04,
      ease: "back.out(2.4)"
    }, "-=0.35")

    // Step 3: Subtitle slide-up bounce
    .to(subtitleEl, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "back.out(1.6)"
    }, "-=0.2")

    // Step 4: CTA buttons pop-in bounce
    .to(ctaBtns, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.45,
      stagger: 0.12,
      ease: "back.out(2)"
    }, "-=0.2")

    // Step 5: Continuous character wave bounce effect while visible
    .to(line1Chars, {
      y: -14,
      duration: 0.35,
      stagger: {
        each: 0.04,
        yoyo: true,
        repeat: 3
      },
      ease: "sine.inOut"
    }, "+=0.3")
    .to(line2Chars, {
      y: -14,
      duration: 0.35,
      stagger: {
        each: 0.04,
        yoyo: true,
        repeat: 3
      },
      ease: "sine.inOut"
    }, "-=1.2")
    .to(ctaBtns, {
      y: -8,
      duration: 0.4,
      yoyo: true,
      repeat: 3,
      stagger: 0.15,
      ease: "sine.inOut"
    }, "-=1.0")

    // Step 6: Smooth bounce exit before repeating full entrance loop
    .to(allElements, {
      opacity: 0,
      y: -25,
      duration: 0.45,
      stagger: 0.015,
      ease: "power2.in"
    }, "+=0.6");
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
    const bannersAttempted = state.loading.banners !== undefined;
    const productsLoading = !!state.loading.products || !productsAttempted;
    const categoriesLoading = !!state.loading.categories || !categoriesAttempted;

    // Kick off the initial data fetch once. Read straight off state.loading rather
    // than a separate stateEngine.setUI() flag - setUI() notifies synchronously,
    // which would otherwise re-enter this render function mid-call, before the
    // fetch below even starts.
    if (!productsAttempted) stateEngine.loadProducts(filters).catch(() => {});
    if (!categoriesAttempted) stateEngine.loadCategories().catch(() => {});
    if (!bannersAttempted) stateEngine.loadBanners().catch(() => {});

    // The admin panel needs to see banners of every status to manage them,
    // but shoppers should only ever see ones actually live right now.
    const activeBanners = (state.banners || []).filter(b => b.status === 'ACTIVE');

    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column;">
        ${activeTab === 'seller_portal' ? `
          <!-- No padding here: the signed-out state renders the full-bleed glass
               sign-up card (hillside background edge-to-edge), and the signed-in
               dashboard applies its own padding around its content instead. -->
          <div style="flex: 1; display: flex; flex-direction: column;" id="seller-portal-mount"></div>
        ` : `
          <div style="flex: 1;">

          <!-- CINEMATIC HERO: full-bleed video background with a dark gradient
               scrim (guarantees text legibility regardless of the video's own
               brightness), headline/CTA floating on top, and the promo
               banners merged into a bottom prev/next bar instead of living in
               their own separate section further down the page. -->
          <section class="cinematic-hero">
            <video
              class="cinematic-hero-bg"
              src="/hero-section-video.mp4"
              autoplay
              muted
              loop
              playsinline
            ></video>
            <div class="cinematic-hero-scrim"></div>

            <div class="cinematic-hero-content">
              <div style="max-width: 640px;">
                <h1 class="hero-title-line1" aria-label="${escapeHtml(t('hero_title1'))}">
                  ${t('hero_title1')}
                </h1>
                <h1 class="hero-title-line2" aria-label="${escapeHtml(t('hero_title2'))}">
                  ${t('hero_title2')}
                </h1>

                <p class="hero-subtitle">
                  <strong class="hero-highlight">kigalimarket.com</strong> ${t('hero_sub')}
                </p>

                <div style="display: flex; gap: 1.25rem; flex-wrap: wrap;">
                  <button id="hero-browse-btn" style="height: 50px; background: #003DA5; border: none; color: #FFFFFF; font-weight: 800; font-size: 1.02rem; border-radius: 12px; padding: 0 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 25px rgba(0, 61, 165, 0.4);">
                    ${t('browse_products')}
                  </button>

                  <button id="hero-start-selling-btn" style="height: 50px; background: #FAD201; border: none; color: #000000; font-weight: 800; font-size: 1.02rem; border-radius: 12px; padding: 0 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 25px rgba(250, 210, 1, 0.4);">
                    ${t('start_selling')}
                  </button>
                </div>
              </div>
            </div>

            ${activeBanners.length > 0 ? (() => {
              const len = activeBanners.length;
              const idx = ((currentBannerIndex % len) + len) % len;
              const prevB = activeBanners[(idx - 1 + len) % len];
              const currentB = activeBanners[idx];
              const nextB = activeBanners[(idx + 1) % len];
              return `
                <!-- Bottom prev/next promo bar, styled after the reference's
                     "Barry / Last Week" adjacent-content strip - prev/next
                     previews are clickable, not just the arrow buttons. -->
                <div class="hero-bottom-carousel">
                  <button class="hero-carousel-arrow" id="hero-carousel-prev-btn" aria-label="Previous promotion">‹</button>

                  <div class="hero-carousel-side-preview" id="hero-prev-preview">
                    <img src="${prevB.image}" alt="${escapeHtml(prevB.title)}">
                    <div>
                      <div class="hero-carousel-side-label">Prev</div>
                      <div class="hero-carousel-side-title">${escapeHtml(prevB.title)}</div>
                    </div>
                  </div>

                  <div class="hero-carousel-current">
                    <div>
                      <div class="hero-carousel-current-label">Featured Promotion</div>
                      <div class="hero-carousel-current-title">${escapeHtml(currentB.title)}</div>
                    </div>
                    <a href="${currentB.targetUrl ? escapeHtml(currentB.targetUrl) : '#'}" class="hero-carousel-cta">View Offer →</a>
                  </div>

                  <div class="hero-carousel-side-preview hero-carousel-side-preview--right" id="hero-next-preview">
                    <div>
                      <div class="hero-carousel-side-label">Next</div>
                      <div class="hero-carousel-side-title">${escapeHtml(nextB.title)}</div>
                    </div>
                    <img src="${nextB.image}" alt="${escapeHtml(nextB.title)}">
                  </div>

                  <button class="hero-carousel-arrow" id="hero-carousel-next-btn" aria-label="Next promotion">›</button>
                </div>
              `;
            })() : ''}
          </section>

          <!-- TRUST BAR (high-fidelity spec).
               The spec's four badges are Secure Payments / Verified Sellers /
               Fast Delivery / 24/7 Support. Two of those describe a
               transactional marketplace: this platform takes no payment and
               arranges no delivery - buyers contact sellers directly - so
               claiming either would be false on the storefront. Kept the two
               that hold, replaced the two that do not with what the platform
               actually offers. -->
          <div class="trust-bar">
            <div class="trust-bar-inner">
              <div class="trust-item">
                <span class="trust-icon" aria-hidden="true">🛡️</span>
                <span class="trust-text">
                  <strong>Verified Sellers</strong>
                  <small>Trusted &amp; reliable</small>
                </span>
              </div>
              <div class="trust-item">
                <span class="trust-icon" aria-hidden="true">💬</span>
                <span class="trust-text">
                  <strong>Direct Contact</strong>
                  <small>Call or WhatsApp the seller</small>
                </span>
              </div>
              <div class="trust-item">
                <span class="trust-icon" aria-hidden="true">📍</span>
                <span class="trust-text">
                  <strong>All 30 Districts</strong>
                  <small>Nationwide coverage</small>
                </span>
              </div>
              <div class="trust-item">
                <span class="trust-icon" aria-hidden="true">🕐</span>
                <span class="trust-text">
                  <strong>24/7 Support</strong>
                  <small>We're here for you</small>
                </span>
              </div>
            </div>
          </div>

          <!-- FLOATING PILL SEARCH BAR: one seamless rounded pill, borderless segments,
               each segment picks up a green "active" highlight once it has a value -->
          <div style="max-width: 1100px; margin: -90px auto 5rem auto; padding: 0 1.25rem; position: relative; z-index: 20;">
            <div class="search-pill-bar">

              <!-- Search input + CTA button are grouped so they always stay
                   physically joined as one pill, even when the bar wraps on
                   narrow screens - only category/district reflow independently. -->
              <div class="search-pill-input-group">
                <div class="search-pill-segment ${filters.searchQuery ? 'active' : ''}" style="flex: 1;">
                  <input type="text" id="hero-search-input" value="${escapeHtml(filters.searchQuery)}" placeholder="${t('search_placeholder')}" class="search-pill-input">
                  ${filters.searchQuery ? `<button id="clear-search-btn" class="search-pill-clear-btn">&times;</button>` : ''}
                </div>

                <!-- Search CTA - a circular icon-only button flush with the
                     pill's rounded end, the single search icon for the whole bar. -->
                <button id="hero-search-btn" class="search-pill-cta" title="${t('search_button')}" aria-label="${t('search_button')}">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="7"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </div>

              <div class="search-pill-divider"></div>

              <!-- Segment 2: Category Filter -->
              <div class="search-pill-segment ${filters.selectedCategory !== 'all' ? 'active' : ''}" style="flex: 1;">
                <span class="search-pill-icon">📁</span>
                <select id="hero-cat-select" class="search-pill-select">
                  <option value="all">${t('all_categories')}</option>
                  ${state.categories.map(c => `<option value="${c.id}" ${filters.selectedCategory===c.id?'selected':''}>${c.icon} ${escapeHtml(c.name)}</option>`).join('')}
                </select>
              </div>

              <div class="search-pill-divider"></div>

              <!-- Segment 3: District Location -->
              <div class="search-pill-segment ${filters.selectedDistrict !== 'all' ? 'active' : ''}" style="flex: 1;">
                <span class="search-pill-icon">📍</span>
                <select id="hero-district-select" class="search-pill-select">
                  <option value="all">${t('all_districts')}</option>
                  ${state.districts.map(d => `<option value="${d}" ${filters.selectedDistrict===d?'selected':''}>${d} District</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- CATEGORY ICON RAIL (high-fidelity spec).
               One white panel holding a single row of icon-over-label tiles,
               led by a filled green "All Categories" tile and closed by a
               grey "More" disc. Replaced the six-across grid of bordered
               cards: the spec treats categories as a compact navigation rail
               above the listings, not as content cards competing with them.
               Scrolls horizontally rather than wrapping, so the row reads as
               one rail on any width. -->
          <div class="cat-rail-wrap">
            ${categoriesLoading && state.categories.length === 0 ? `
              <div class="cat-rail-loading">Loading categories...</div>
            ` : `
              <div class="cat-rail" role="list">
                <button type="button" role="listitem"
                  class="cat-rail-item ${filters.selectedCategory === 'all' || !filters.selectedCategory ? 'is-active' : ''}"
                  data-cat="all">
                  <span class="cat-rail-icon cat-rail-icon-all" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="7" height="7" rx="1.6"></rect>
                      <rect x="14" y="3" width="7" height="7" rx="1.6"></rect>
                      <rect x="3" y="14" width="7" height="7" rx="1.6"></rect>
                      <rect x="14" y="14" width="7" height="7" rx="1.6"></rect>
                    </svg>
                  </span>
                  <span class="cat-rail-label">All Categories</span>
                </button>

                ${state.categories.map(c => `
                  <button type="button" role="listitem"
                    class="cat-rail-item ${filters.selectedCategory === c.id ? 'is-active' : ''}"
                    data-cat="${c.id}"
                    aria-label="${escapeHtml(c.name)}, ${c.count} ${c.count === 1 ? 'listing' : 'listings'}">
                    <span class="cat-rail-icon" aria-hidden="true">${c.icon}</span>
                    <span class="cat-rail-label">${escapeHtml(c.name)}</span>
                  </button>
                `).join('')}

                <button type="button" role="listitem" class="cat-rail-item" id="cat-rail-more">
                  <span class="cat-rail-icon cat-rail-icon-more" aria-hidden="true">•••</span>
                  <span class="cat-rail-label">More</span>
                </button>
              </div>
            `}
          </div>

          <!-- FLASH DEALS (high-fidelity spec).
               Dark green panel with a live countdown on the left, a scrolling
               row of discounted listings on the right.

               Gated on listings that actually carry a reduced price. The
               section is built to the design in full, but a "Flash Deals"
               banner and a ticking clock over items at their normal price is
               a promotion that does not exist - so with no discounted stock
               the block stays out of the page rather than dressing up regular
               listings. Give any listing an originalPrice above its price and
               this appears exactly as drawn. -->
          ${(() => {
            const deals = state.products.filter(p => (Number(p.originalPrice) || 0) > p.price);
            if (deals.length === 0) return '';
            return `
              <div class="flash-wrap">
                <section class="flash-deals" aria-labelledby="flash-deals-heading">
                  <div class="flash-panel">
                    <h2 id="flash-deals-heading">Flash Deals</h2>
                    <p class="flash-panel-sub">Ends in</p>
                    <div class="flash-clock" id="flash-clock" role="timer" aria-live="off">
                      <span class="flash-unit"><strong data-unit="h">--</strong><small>Hours</small></span>
                      <span class="flash-unit"><strong data-unit="m">--</strong><small>Mins</small></span>
                      <span class="flash-unit"><strong data-unit="s">--</strong><small>Secs</small></span>
                    </div>
                  </div>

                  <div class="flash-rail">
                    ${deals.map(p => {
                      const was = Number(p.originalPrice);
                      const pct = Math.round((1 - p.price / was) * 100);
                      return `
                        <article class="flash-card view-details-btn" data-id="${p.id}" role="button" tabindex="0">
                          <div class="flash-card-media">
                            <img src="${p.images[0]}" alt="${escapeHtml(p.title)}" loading="lazy">
                            <span class="prod-card-discount">-${pct}%</span>
                          </div>
                          <h3>${escapeHtml(p.title)}</h3>
                          <p class="flash-card-price">
                            <strong>${p.price.toLocaleString()} ${p.currency}</strong>
                            <s>${was.toLocaleString()} ${p.currency}</s>
                          </p>
                        </article>
                      `;
                    }).join('')}
                  </div>
                </section>
              </div>
            `;
          })()}

          <!-- MAIN PRODUCTS GRID SECTION -->
          <div style="max-width: 1280px; margin: 0 auto 5rem auto; padding: 0 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.75rem;">
              <div>
                <h2 style="font-size: 1.8rem; font-weight: 800; color: #004B00;">${t('featured_products')}</h2>
                <p style="font-size: 0.95rem; color: #64748B;">Verified listings from trusted sellers across Rwanda</p>
              </div>
              <div style="font-size: 0.9rem; font-weight: 700; color: #004B00;">
                ${productsLoading ? 'Loading...' : `Showing ${state.products.length} listings`}
              </div>
            </div>

            ${state.error ? `
              <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
                ⚠️ ${escapeHtml(state.error)}
              </div>
            ` : ''}

            ${productsLoading && state.products.length === 0 ? `
              <div style="text-align: center; padding: 4rem 2rem; background: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; color: #64748B;">
                Loading products...
              </div>
            ` : state.products.length === 0 ? `
              <div style="text-align: center; padding: 4rem 2rem; background: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <h3 style="font-size: 1.4rem; color: #0F172A; margin-bottom: 0.5rem;">No products match your search criteria</h3>
                <p style="color: #64748B; font-size: 0.95rem;">Try selecting a different district or clearing your category filters.</p>
              </div>
            ` : `
              <div class="grid-4" style="gap: 1.5rem; align-items: stretch;">
                ${state.products.map((prod) => {
                  // Discount ornament from the spec. Rendered only when the
                  // listing genuinely carries a higher original price. There
                  // is no such field today, so no badge appears - a "-20%"
                  // over an undiscounted price is a fabricated saving, which
                  // is exactly the sort of pricing claim a marketplace must
                  // not invent on a seller's behalf.
                  const wasPrice = Number(prod.originalPrice) || 0;
                  const hasDiscount = wasPrice > prod.price;
                  const pctOff = hasDiscount ? Math.round((1 - prod.price / wasPrice) * 100) : 0;
                  // Same rule for the star row: shown only with real ratings.
                  const rating = Number(prod.rating) || 0;
                  const reviews = Number(prod.reviewCount) || 0;
                  return `
                  <article class="prod-card" data-id="${prod.id}">
                    <div class="prod-card-media">
                      <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}" loading="lazy">
                      ${hasDiscount ? `<span class="prod-card-discount">-${pctOff}%</span>` : ''}
                      ${prod.isFeatured ? `<span class="prod-card-flag prod-card-flag-featured"><span aria-hidden="true">⭐</span> FEATURED</span>` : ''}
                      ${prod.isTrending && !prod.isFeatured ? `<span class="prod-card-flag prod-card-flag-trending"><span aria-hidden="true">🔥</span> TRENDING</span>` : ''}
                    </div>

                    <div class="prod-card-body">
                      <div class="prod-card-meta">
                        <span class="prod-card-district">
                          <span aria-hidden="true">📍</span><span class="sr-only">District: </span>${escapeHtml(prod.district)}
                        </span>
                        <span class="prod-card-condition" title="Condition: ${escapeHtml(prod.condition)}">
                          ${escapeHtml(prod.condition)}
                        </span>
                      </div>

                      <h3 class="prod-card-title view-details-btn" data-id="${prod.id}">${escapeHtml(prod.title)}</h3>

                      <p class="prod-card-price">
                        <strong>${prod.price.toLocaleString()} ${prod.currency}</strong>
                        ${hasDiscount ? `<s>${wasPrice.toLocaleString()} ${prod.currency}</s>` : ''}
                      </p>

                      ${rating > 0 ? `
                        <p class="prod-card-rating">
                          <span class="prod-card-stars" aria-hidden="true">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</span>
                          <span class="sr-only">Rated ${rating} out of 5</span>
                          ${reviews > 0 ? `<span class="prod-card-reviews">(${reviews})</span>` : ''}
                        </p>
                      ` : ''}

                      <p class="prod-card-seller">
                        <span aria-hidden="true">👤</span><span class="sr-only">Seller: </span>
                        <strong>${escapeHtml(prod.sellerName)}</strong>
                      </p>
                    </div>

                    <div class="prod-card-actions">
                      <button class="product-card-action view-details-btn" data-id="${prod.id}"
                        style="flex: 1; background: #003DA5; color: #fff; border: none; border-radius: 10px; padding: 0.55rem 0.5rem; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
                        View
                      </button>
                      ${prod.sellerPhone ? `
                        <a class="product-card-action" target="_blank" rel="noopener"
                          href="https://wa.me/${prod.sellerPhone.replace(/[^0-9+]/g, '').replace('+', '')}?text=${encodeURIComponent(`Hello ${prod.sellerName}, I found your product "${prod.title}" (${prod.price.toLocaleString()} ${prod.currency}) on Kigali Marketplace (kigalimarket.com). Is it still available?`)}"
                          style="flex: 1; background: #FAD201; color: #0F172A; border: none; border-radius: 10px; padding: 0.55rem 0.5rem; font-size: 0.82rem; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                          Contact
                        </a>
                      ` : `
                        <button class="product-card-action contact-seller-btn" data-id="${prod.id}"
                          style="flex: 1; background: #FAD201; color: #0F172A; border: none; border-radius: 10px; padding: 0.55rem 0.5rem; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
                          Contact
                        </button>
                      `}
                    </div>
                  </article>
                `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- FOOTER -->
          ${getLargeFooterHtml(currentLang)}
        `}
      </div>
    `;

    bindLargeFooterEvents(container);
    initSlimStickyFooter();

    if (activeTab === 'seller_portal') {
      cleanupHeroAnimation();
      cleanupBannerRotation();
      const sellerMount = container.querySelector('#seller-portal-mount');
      if (sellerMount) renderSellerPortal(sellerMount);
      return;
    }

    // Trigger GSAP + SplitType entrance animation for Hero section
    requestAnimationFrame(() => {
      triggerHeroAnimation(container);
    });

    setupHeroCarousel(container, activeBanners);
    startFlashClock(container);

    container.querySelector('#hero-browse-btn')?.addEventListener('click', () => {
      const el = container.querySelector('h2');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });

    container.querySelector('#hero-start-selling-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ marketplaceTab: 'seller_portal' });
    });

    const searchInput = container.querySelector('#hero-search-input');
    const catSelect = container.querySelector('#hero-cat-select');
    const districtSelect = container.querySelector('#hero-district-select');
    const searchBtn = container.querySelector('#hero-search-btn');

    function runSearch() {
      const newFilters = {
        searchQuery: searchInput.value,
        selectedCategory: catSelect.value,
        selectedDistrict: districtSelect.value,
      };
      stateEngine.setUI({ marketplaceFilters: newFilters });
      stateEngine.loadProducts({
        search: newFilters.searchQuery,
        category: newFilters.selectedCategory,
        district: newFilters.selectedDistrict,
      }).catch(() => {});
    }

    searchBtn?.addEventListener('click', runSearch);
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runSearch();
    });

    container.querySelector('#clear-search-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ marketplaceFilters: { ...filters, searchQuery: '' } });
      stateEngine.loadProducts({ search: '', category: filters.selectedCategory, district: filters.selectedDistrict }).catch(() => {});
    });

    // Category rail. "All Categories" clears the filter outright; any other
    // tile toggles, so a second click on the active one also clears it.
    container.querySelectorAll('.cat-rail-item[data-cat]').forEach(tile => {
      tile.addEventListener('click', () => {
        const cat = tile.dataset.cat;
        const nextCategory = cat === 'all' || filters.selectedCategory === cat ? 'all' : cat;
        stateEngine.setUI({ marketplaceFilters: { ...filters, selectedCategory: nextCategory } });
        stateEngine.loadProducts({ search: filters.searchQuery, category: nextCategory, district: filters.selectedDistrict }).catch(() => {});
      });
    });

    // "More" is the spec's overflow affordance for a category list longer than
    // the rail. Every category already fits here, so it scrolls the rail to
    // the end rather than pretending there is a hidden menu.
    container.querySelector('#cat-rail-more')?.addEventListener('click', () => {
      const rail = container.querySelector('.cat-rail');
      rail?.scrollTo({ left: rail.scrollWidth, behavior: 'smooth' });
    });

    // Navigate rather than opening the modal directly: the URL becomes
    // /product/<id>, and main.js opens the detail in response. One code path
    // serves clicks, shared links, and Back/Forward alike.
    container.querySelectorAll('.view-details-btn, .contact-seller-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!state.products.some(p => p.id === id)) return;
        pushPath(pathForListing(ROUTE_PRODUCT, id));
        stateEngine.setRoute({ kind: ROUTE_PRODUCT, id });
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
