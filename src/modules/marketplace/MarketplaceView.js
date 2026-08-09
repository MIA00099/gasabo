import gsap from 'gsap';
import SplitType from 'split-type';
import { stateEngine } from '../../store/stateEngine.js';
import { getTranslation } from '../../store/i18n.js';
import { renderProductDetailModal } from './ProductDetailModal.js';
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

function setupBannerCarousel(container, activeBanners) {
  cleanupBannerRotation();
  if (activeBanners.length === 0) return;

  const slides = container.querySelectorAll('.promo-banner-slide');
  const dots = container.querySelectorAll('.promo-banner-dot');

  function showSlide(idx) {
    currentBannerIndex = idx;
    slides.forEach((slide, i) => {
      const isActive = i === idx;
      slide.style.opacity = isActive ? '1' : '0';
      slide.style.pointerEvents = isActive ? 'auto' : 'none';
    });
    dots.forEach((dot, i) => {
      dot.style.background = i === idx ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.45)';
    });
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => showSlide(i));
  });

  if (activeBanners.length > 1) {
    bannerRotationTimer = setInterval(() => {
      showSlide((currentBannerIndex + 1) % activeBanners.length);
    }, 5000);
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

          <!-- HERO BANNER (GSAP & SplitType Staggered Text Bounce Entrance) -->
          <section style="background: #034B04; padding: 5.5rem 2rem 7rem 2rem; position: relative; overflow: hidden;">
            <div style="max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr 1fr; gap: 3rem; align-items: center;">
              <div>
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
                  <button id="hero-browse-btn" style="height: 50px; background: rgba(255,255,255,0.08); backdrop-filter: blur(12px); border: 2px solid #00C814; color: #FFFFFF; font-weight: 800; font-size: 1.02rem; border-radius: 12px; padding: 0 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 6px 20px rgba(0, 200, 20, 0.25);">
                    ${t('browse_products')}
                  </button>

                  <button id="hero-start-selling-btn" style="height: 50px; background: #F59E0B; border: none; color: #000000; font-weight: 800; font-size: 1.02rem; border-radius: 12px; padding: 0 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);">
                    ${t('start_selling')}
                  </button>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end;">
                <video
                  src="/hero-section-video.mp4"
                  autoplay
                  muted
                  loop
                  playsinline
                  style="max-width: 100%; height: auto; max-height: 420px; border-radius: 16px; box-shadow: 0 20px 30px rgba(0,0,0,0.2);"
                ></video>
              </div>
            </div>
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

          ${activeBanners.length > 0 ? `
            <!-- PROMOTIONAL BANNER STRIP - stacked slides, only one visible at a time
                 via opacity (toggled directly by setupBannerCarousel, not re-render) -->
            <div style="max-width: 1280px; margin: 0 auto 4rem auto; padding: 0 1.5rem;">
              <div style="position: relative; border-radius: 20px; overflow: hidden; height: 220px; box-shadow: 0 10px 30px rgba(0,0,0,0.12);">
                ${activeBanners.map((b, i) => `
                  <a href="${b.targetUrl ? escapeHtml(b.targetUrl) : '#'}" class="promo-banner-slide" data-slide-index="${i}" style="position: absolute; inset: 0; display: block; text-decoration: none; opacity: ${i === (currentBannerIndex % activeBanners.length) ? '1' : '0'}; transition: opacity 0.6s ease; pointer-events: ${i === (currentBannerIndex % activeBanners.length) ? 'auto' : 'none'};">
                    <img src="${b.image}" alt="${escapeHtml(b.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(3,34,2,0.75) 0%, rgba(3,34,2,0.15) 60%, rgba(3,34,2,0) 100%); display: flex; align-items: center; padding: 0 2.5rem;">
                      <h3 style="color: #fff; font-size: 1.5rem; font-weight: 800; max-width: 60%;">${escapeHtml(b.title)}</h3>
                    </div>
                  </a>
                `).join('')}

                ${activeBanners.length > 1 ? `
                  <div style="position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 5;">
                    ${activeBanners.map((_, i) => `
                      <button class="promo-banner-dot" data-dot-index="${i}" aria-label="Show promotion ${i + 1}" style="width: 9px; height: 9px; border-radius: 50%; border: none; cursor: pointer; padding: 0; background: rgba(255,255,255,${i === (currentBannerIndex % activeBanners.length) ? '1' : '0.45'}); transition: background 0.3s ease;"></button>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- CATEGORY CARDS SECTION -->
          <div style="max-width: 1280px; margin: 0 auto 4rem auto; padding: 0 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem;">
              <div>
                <h2 style="font-size: 1.8rem; font-weight: 800; color: #032202;">${t('browse_categories')}</h2>
                <p style="font-size: 0.95rem; color: #64748B;">Explore Rwanda's top commercial sectors</p>
              </div>
            </div>

            ${categoriesLoading && state.categories.length === 0 ? `
              <div style="text-align: center; padding: 2rem; color: #94A3B8;">Loading categories...</div>
            ` : `
              <div class="grid-3" style="grid-template-columns: repeat(6, 1fr); gap: 1rem;">
                ${state.categories.map(c => `
                  <div class="category-card-item ${filters.selectedCategory===c.id?'active':''}" data-cat="${c.id}" style="background: #FFFFFF; border: 1.5px solid ${filters.selectedCategory===c.id?'#034B04':'#E2E8F0'}; padding: 1.25rem 1rem; border-radius: 16px; text-align: center; cursor: pointer; transition: all 0.25s ease;">
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
                <h2 style="font-size: 1.8rem; font-weight: 800; color: #032202;">${t('featured_products')}</h2>
                <p style="font-size: 0.95rem; color: #64748B;">Verified listings from trusted sellers across Rwanda</p>
              </div>
              <div style="font-size: 0.9rem; font-weight: 700; color: #034B04;">
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
                ${state.products.map(prod => `
                  <div class="main-prod-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s ease;">
                    <div>
                      <div class="product-card-image-wrap">
                        <img src="${prod.images[0]}" alt="${escapeHtml(prod.title)}">
                        ${prod.isFeatured ? `<span style="position: absolute; top: 12px; left: 12px; background: #EDA203; color: #000; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 6px;">⭐ FEATURED</span>` : ''}
                      </div>

                      <div style="padding: 1.25rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; gap: 0.5rem;">
                          <span style="font-size: 0.78rem; font-weight: 700; color: #034B04; background: #E6F4EA; padding: 2px 8px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">
                            📍 ${escapeHtml(prod.district)}
                          </span>
                          <span style="font-size: 0.78rem; color: #64748B; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(prod.condition)}
                          </span>
                        </div>

                        <h3 class="product-card-title" style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin-bottom: 0.5rem; line-height: 1.35; height: 2.7em;">
                          ${escapeHtml(prod.title)}
                        </h3>

                        <div style="font-size: 1.35rem; font-weight: 800; color: #034B04; margin-bottom: 0.75rem;">
                          ${prod.price.toLocaleString()} ${prod.currency}
                        </div>

                        <div style="font-size: 0.8rem; color: #64748B; margin-bottom: 1rem; display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden;">
                          <span style="flex-shrink: 0;">👤 Seller:</span>
                          <strong style="color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(prod.sellerName)}</strong>
                        </div>
                      </div>
                    </div>

                    <div style="padding: 0 1.25rem 1.25rem 1.25rem; display: flex; gap: 0.5rem;">
                      <button class="view-prod-card-btn view-details-btn" data-id="${prod.id}" style="flex: 1; height: 42px; background: #EDA203; border: none; color: #000; font-weight: 800; font-size: 0.88rem; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        👁️ View Details
                      </button>
                      <button class="contact-seller-card-btn contact-seller-btn" data-id="${prod.id}" style="flex: 1; height: 42px; background: #034B04; border: none; color: #FFF; font-weight: 800; font-size: 0.88rem; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        💬 Contact
                      </button>
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

    setupBannerCarousel(container, activeBanners);

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

    container.querySelectorAll('.view-details-btn, .contact-seller-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = state.products.find(p => p.id === btn.dataset.id);
        if (prod) {
          renderProductDetailModal(prod, () => render());
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
