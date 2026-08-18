import { stateEngine } from '../../store/stateEngine.js';
import { getTranslation } from '../../store/i18n.js';
import { pushPath, pathForListing, ROUTE_PRODUCT } from '../../store/router.js';
import { renderSellerPortal } from './SellerPortal.js';
import { getLargeFooterHtml, bindLargeFooterEvents, initSlimStickyFooter } from '../../components/Footer.js';


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

    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column;">
        ${activeTab === 'seller_portal' ? `
          <!-- No padding here: the signed-out state renders the full-bleed glass
               sign-up card (hillside background edge-to-edge), and the signed-in
               dashboard applies its own padding around its content instead. -->
          <div style="flex: 1; display: flex; flex-direction: column;" id="seller-portal-mount"></div>
        ` : `
          <div style="flex: 1;">

          <!-- HERO (high-fidelity spec).
               Replaces the previous "cinematic" hero wholesale: a looping
               video background, a GSAP timeline that animated the headline in
               and out forever, a SplitType per-character stagger, and a
               prev/next promo carousel underneath.

               The spec draws a still hero - headline, one line of support
               copy, two buttons, and a product collage against a gold arc.
               Nothing moves. Perpetual motion behind the first thing a
               visitor reads competes with the headline it is meant to carry,
               and the endless in/out loop meant the copy was absent from the
               page for part of every cycle.

               The district/category pill search that used to float over the
               bottom edge of this section is gone too - the header now owns
               search, and two search bars a scroll apart is a choice the
               reader has to make for no reason. -->
          <section class="km-hero">
            <div class="km-hero-inner">
              <div class="km-hero-copy">
                <h1 class="km-hero-title">
                  <span>Everything you need,</span>
                  <span>all in one place.</span>
                </h1>
                <p class="km-hero-sub">
                  Buy, sell and discover thousands of products, vehicles, properties and more.
                </p>
                <div class="km-hero-actions">
                  <button type="button" class="km-hero-btn km-hero-btn-primary" id="hero-browse-btn">
                    Shop Now
                  </button>
                  <button type="button" class="km-hero-btn km-hero-btn-ghost" id="hero-start-selling-btn">
                    Explore Ads
                  </button>
                </div>
              </div>

              <div class="km-hero-art" aria-hidden="true">
                <img src="/hero-section.png" alt="">
              </div>
            </div>
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
      // The hero timeline and promo-carousel interval that used to be torn
      // down here are gone with the old hero; the Flash Deals clock is the
      // only timer left, and it stops itself when its element is absent.
      cleanupFlashClock();
      const sellerMount = container.querySelector('#seller-portal-mount');
      if (sellerMount) renderSellerPortal(sellerMount);
      return;
    }

    startFlashClock(container);

    // The hero's own search inputs went with the pill bar - the header owns
    // search now. What remains are the two hero buttons.
    container.querySelector('#hero-browse-btn')?.addEventListener('click', () => {
      container.querySelector('.cat-rail-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    container.querySelector('#hero-start-selling-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ marketplaceTab: 'seller_portal' });
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
