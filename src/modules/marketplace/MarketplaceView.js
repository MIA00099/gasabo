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

// Rotating backdrop palette for the product image "mat" - one color per card,
// cycling by grid position, echoing the reference layout's alternating
// orange/indigo/green card backdrops instead of every card sharing one flat
// gray placeholder background.
const PRODUCT_CARD_ACCENTS = ['#F3D9B1', '#D9D6F5', '#CFEAD9', '#F6D3DC', '#CFE4F5', '#F5E3B3'];

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

          <!-- CATEGORY CARDS SECTION -->
          <div style="max-width: 1280px; margin: 0 auto 4rem auto; padding: 0 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem;">
              <div>
                <h2 style="font-size: 1.8rem; font-weight: 800; color: #004B00;">${t('browse_categories')}</h2>
                <p style="font-size: 0.95rem; color: #64748B;">Explore Rwanda's top commercial sectors</p>
              </div>
            </div>

            ${categoriesLoading && state.categories.length === 0 ? `
              <div style="text-align: center; padding: 2rem; color: #94A3B8;">Loading categories...</div>
            ` : `
              <div class="grid-3" style="grid-template-columns: repeat(6, 1fr); gap: 1rem;">
                ${state.categories.map(c => `
                  <div class="category-card-item ${filters.selectedCategory===c.id?'active':''}" data-cat="${c.id}" style="background: #FFFFFF; border: 1.5px solid ${filters.selectedCategory===c.id?'#004B00':'#E2E8F0'}; padding: 1.25rem 1rem; border-radius: 16px; text-align: center; cursor: pointer; transition: all 0.25s ease;">
                    <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">${c.icon}</div>
                    <div style="font-weight: 700; font-size: 0.9rem; color: #0F172A; margin-bottom: 0.2rem;">${escapeHtml(c.name)}</div>
                    <div style="font-size: 0.78rem; color: #64748B;">${c.count} items</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

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
                ${state.products.map((prod, i) => `
                  <div class="main-prod-card" data-id="${prod.id}">
                    <div>
                      <div class="product-card-image-wrap" style="--card-mat: ${PRODUCT_CARD_ACCENTS[i % PRODUCT_CARD_ACCENTS.length]};">
                        <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}">

                        <!-- Floating circular action icons, overlaid on the product photo -
                             expand opens full product details, chat opens contact -
                             instead of the two full-width buttons this replaced. Sized up
                             to match the bigger .product-card-fab circles (see main.css). -->
                        <button class="product-card-fab view-details-btn" data-id="${prod.id}" title="View full details" aria-label="View full details">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                          </svg>
                        </button>
                        <button class="product-card-fab product-card-fab-right contact-seller-btn" data-id="${prod.id}" title="Contact seller" aria-label="Contact seller">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </button>

                        ${prod.isFeatured ? `<span class="product-card-featured-badge">⭐ FEATURED</span>` : ''}
                        ${prod.isTrending ? `<span class="product-card-trending-badge">🔥 TRENDING</span>` : ''}
                      </div>

                      <!-- Trimmed padding/font-sizes throughout this block on purpose -
                           the photo above (now 1:1, edge-to-edge) is meant to dominate the
                           card; this text is supporting detail, not a second focal point. -->
                      <div style="padding: 0.85rem 1.1rem 0.15rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; gap: 0.5rem;">
                          <span style="font-size: 0.7rem; font-weight: 700; color: #004B00; background: #E6F4EA; padding: 2px 7px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">
                            📍 ${escapeHtml(prod.district)}
                          </span>
                          <span style="font-size: 0.7rem; color: #64748B; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(prod.condition)}
                          </span>
                        </div>

                        <h3 class="product-card-title view-details-btn" data-id="${prod.id}">
                          ${escapeHtml(prod.title)}
                        </h3>

                        <div style="font-size: 1.15rem; font-weight: 800; color: #004B00; margin-bottom: 0.4rem;">
                          ${prod.price.toLocaleString()} ${prod.currency}
                        </div>
                      </div>
                    </div>

                    <div style="padding: 0 1.1rem 0.6rem; display: flex; align-items: center; gap: 4px; font-size: 0.76rem; color: #64748B; white-space: nowrap; overflow: hidden;">
                      <span style="flex-shrink: 0;">👤</span>
                      <strong style="color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(prod.sellerName)}</strong>
                    </div>

                    <!-- Labelled actions. The circular icons over the photo do
                         the same two things, but an expand glyph and a speech
                         bubble are not self-explanatory - these spell it out.
                         Blue and gold are the flag palette already used in the
                         nav. Gold takes near-black text: white on #FAD201 is
                         unreadable. -->

                    <div style="padding: 0 1.1rem 1rem; display: flex; gap: 0.5rem;">
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
                  </div>
                `).join('')}
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

    container.querySelectorAll('.category-card-item').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.cat;
        const nextCategory = filters.selectedCategory === cat ? 'all' : cat;
        stateEngine.setUI({ marketplaceFilters: { ...filters, selectedCategory: nextCategory } });
        stateEngine.loadProducts({ search: filters.searchQuery, category: nextCategory, district: filters.selectedDistrict }).catch(() => {});
      });
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
