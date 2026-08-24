/**
 * Shared Footer & Slim Sticky Bar Component
 * 1. Large Footer matching image_b894f7.png at the absolute bottom of webpage.
 * 2. Slim Sticky Footer Bar remaining at bottom of viewport while scrolling.
 */
import { stateEngine } from '../store/stateEngine.js';
import { getTranslation } from '../store/i18n.js';
import { pushHome, ROUTE_HOME } from '../store/router.js';

export function getLargeFooterHtml(currentLang = 'en') {
  const t = (key) => getTranslation(currentLang, key);
  return `
    <footer class="large-footer" id="large-footer">
      <div class="large-footer-container">
        <!-- Brand Column -->
        <div class="footer-col brand-col">
          <div class="footer-brand-title cursor-pointer" id="foot-brand-home" role="button" tabindex="0" title="Back to Kigali Market Home">
            <img src="/logo-kigali-market.jpg" alt="Kigali Market Logo" class="footer-logo-img">
            <span>KIGALI MARKET</span>
          </div>
          <p class="footer-brand-desc">
            ${t('footer_desc') || "Rwanda's Premier Official Direct Marketplace & Gasabo Real Estate Corporate Portal. Enabling direct peer-to-peer trade across all 30 districts."}
          </p>
        </div>

        <!-- Quick Links Column -->
        <div class="footer-col">
          <h4 class="footer-col-title">${t('quick_links') || 'Quick Links'}</h4>
          <ul class="footer-links-list">
            <li><a href="#" id="foot-link-mkt" class="foot-nav-link">${t('link_catalog') || 'Marketplace Catalog'}</a></li>
            <li><a href="#" id="foot-link-re" class="foot-nav-link">${t('link_re') || 'Gasabo Real Estate'}</a></li>
            <li><a href="#" id="foot-link-sell" class="foot-nav-link">${t('link_sell') || 'Start Selling'}</a></li>
          </ul>
        </div>

        <!-- Districts Column -->
        <div class="footer-col">
          <h4 class="footer-col-title">${t('districts') || 'Districts'}</h4>
          <ul class="footer-links-list">
            <li>Gasabo District</li>
            <li>Nyarugenge District</li>
            <li>Kicukiro District</li>
            <li>Musanze & Rubavu</li>
          </ul>
        </div>

        <!-- Headquarters Column -->
        <div class="footer-col">
          <h4 class="footer-col-title">${t('headquarters') || 'Headquarters'}</h4>
          <p class="footer-address">
            Gasabo Tower, 4th Floor<br>
            KG 7 Ave, Kacyiru<br>
            Kigali, Rwanda<br>
            <a href="tel:+250788350555" class="footer-phone-link">📞 0788350555</a>
          </p>
        </div>
      </div>
    </footer>
  `;
}

function defaultGoHome() {
  pushHome();
  stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
  const filters = stateEngine.getState().ui.marketplaceFilters || {};
  stateEngine.setUI({
    marketplaceTab: 'products',
    marketplaceFilters: { ...filters, searchQuery: '', selectedCategory: 'all', selectedDistrict: 'all' },
  });
  stateEngine.setPortal('marketplace');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function bindLargeFooterEvents(container, handlers = {}) {
  if (!container) return;
  const goHome = handlers.goHome || defaultGoHome;

  const triggerGoHome = (e) => {
    if (e) e.preventDefault();
    goHome();
  };

  container.querySelector('#foot-brand-home')?.addEventListener('click', triggerGoHome);
  container.querySelector('#foot-link-mkt')?.addEventListener('click', triggerGoHome);
  container.querySelector('#foot-link-re')?.addEventListener('click', (e) => {
    e.preventDefault();
    stateEngine.setPortal('realestate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  container.querySelector('#foot-link-sell')?.addEventListener('click', (e) => {
    e.preventDefault();
    stateEngine.setPortal('marketplace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

let observerInstance = null;

export function initSlimStickyFooter(handlers = {}) {
  let stickyBar = document.getElementById('sticky-footer-bar');
  if (!stickyBar) {
    stickyBar = document.createElement('div');
    stickyBar.id = 'sticky-footer-bar';
    stickyBar.className = 'slim-sticky-bar';
    document.body.appendChild(stickyBar);
  }

  stickyBar.innerHTML = `
    <div class="slim-sticky-inner">
      <!-- Brand -->
      <div class="sticky-item sticky-brand cursor-pointer" id="sticky-brand-action" title="Back to Kigali Market Home">
        <img src="/logo-kigali-market.jpg" alt="Logo" class="sticky-brand-logo">
        <span class="sticky-brand-text">KIGALI MARKET</span>
      </div>

      <div class="sticky-divider"></div>

      <!-- Quick Contact Item -->
      <a href="tel:+250788350555" class="sticky-item sticky-contact-link">
        <span class="sticky-icon">📞</span>
        <span class="sticky-label">Support:</span>
        <span class="sticky-val">0788350555</span>
      </a>

      <div class="sticky-divider"></div>

      <!-- Real Estate Direct Action -->
      <a href="#" id="sticky-re-action" class="sticky-item sticky-contact-link">
        <span class="sticky-icon">🏢</span>
        <span class="sticky-label">Gasabo CMS:</span>
        <span class="sticky-val">Real Estate</span>
      </a>
    </div>
  `;

  const goHome = handlers.goHome || defaultGoHome;

  // Attach event handlers
  stickyBar.querySelector('#sticky-brand-action')?.addEventListener('click', () => {
    goHome();
  });

  stickyBar.querySelector('#sticky-re-action')?.addEventListener('click', (e) => {
    e.preventDefault();
    stateEngine.setPortal('realestate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // IntersectionObserver to auto-hide sticky bar when large footer is visible
  if (observerInstance) observerInstance.disconnect();
  const largeFooterEl = document.getElementById('large-footer');
  if (largeFooterEl) {
    observerInstance = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          stickyBar.classList.add('at-large-footer');
        } else {
          stickyBar.classList.remove('at-large-footer');
        }
      });
    }, { threshold: 0.05 });
    observerInstance.observe(largeFooterEl);
  }
}
