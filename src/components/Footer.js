/**
 * Shared Footer & Slim Sticky Bar Component
 * 1. Large Footer matching image_b894f7.png at the absolute bottom of webpage.
 * 2. Slim Sticky Footer Bar remaining at bottom of viewport while scrolling.
 */
import { stateEngine } from '../store/stateEngine.js';
import { getTranslation } from '../store/i18n.js';
import { pushHome, ROUTE_HOME } from '../store/router.js';
import { CONTACT_EMAIL } from '../config/site.js';

export function getLargeFooterHtml(currentLang = 'en') {
  return `
    <footer class="large-footer" id="large-footer">
      <div class="large-footer-container">
        
        <!-- Column 1: Gasabo Real Estate Brand Block -->
        <div class="footer-col brand-col">
          <div class="footer-brand-title cursor-pointer" id="foot-brand-home" role="button" tabindex="0" title="Gasabo Real Estate" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem;">
            <img src="/real-estate-logo.png" alt="Gasabo Real Estate" style="height: 40px; width: 40px; border-radius: 50%; object-fit: contain; background: #fff;">
            <span style="font-weight: 800; font-size: 1.25rem; color: #ffffff;">Gasabo Real Estate</span>
          </div>
          <p class="footer-brand-desc" style="color: #D0E1ED; font-size: 0.92rem; line-height: 1.6; max-width: 32ch;">
            Plots, houses and property services across Gasabo District and greater Kigali.
          </p>
        </div>

        <!-- Column 2: Contact Us -->
        <div class="footer-col">
          <h4 class="footer-col-title">Contact Us</h4>
          <ul class="footer-links-list">
            <li class="footer-contact-item">
              <i class="fa-solid fa-location-dot contact-icon location-icon"></i>
              <span class="foot-nav-link">Gasabo District, Kacyiru, Kigali</span>
            </li>
            <li class="footer-contact-item">
              <i class="fa-solid fa-phone contact-icon phone-icon"></i>
              <a href="tel:+250788350555" class="footer-phone-link foot-nav-link">Call/Whatsapp: +250 788 350 555</a>
            </li>
            <li class="footer-contact-item">
              <i class="fa-solid fa-envelope contact-icon email-icon"></i>
              <a href="mailto:gasaboestaterwanda@gmail.com" class="foot-nav-link">Email: gasaboestaterwanda@gmail.com</a>
            </li>
            <li style="margin-top: 0.6rem;">
              <div style="font-size: 0.85rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.4rem;">Follow Us:</div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <a href="https://www.instagram.com/gasabo_real_estate/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"
                  style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; text-decoration: none; transition: transform 0.2s ease;">
                  <i class="fa-brands fa-instagram"></i>
                </a>
                <a href="https://www.youtube.com/@GasaboRealEstate" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube"
                  style="width: 32px; height: 32px; border-radius: 8px; background: #FF0000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; text-decoration: none; transition: transform 0.2s ease;">
                  <i class="fa-brands fa-youtube"></i>
                </a>
                <a href="https://www.facebook.com/profile.php?id=100063657936349" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook"
                  style="width: 32px; height: 32px; border-radius: 8px; background: #1877F2; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; text-decoration: none; transition: transform 0.2s ease;">
                  <i class="fa-brands fa-facebook-f"></i>
                </a>
                <a href="https://www.tiktok.com/@gasaborealestate" target="_blank" rel="noopener noreferrer" aria-label="TikTok" title="TikTok"
                  style="width: 32px; height: 32px; border-radius: 8px; background: #000000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; text-decoration: none; transition: transform 0.2s ease;">
                  <i class="fa-brands fa-tiktok"></i>
                </a>
              </div>
            </li>
          </ul>
        </div>

        <!-- Column 3: Advertise -->
        <div class="footer-col">
          <h4 class="footer-col-title">Advertise</h4>
          <ul class="footer-links-list">
            <li><a href="#" id="foot-link-sell" class="foot-nav-link">Get Started</a></li>
            <li><a href="#" class="foot-nav-link">Our Plans</a></li>
          </ul>
        </div>

        <!-- Column 4: Browse -->
        <div class="footer-col">
          <h4 class="footer-col-title">Browse</h4>
          <ul class="footer-links-list">
            <li><a href="#" id="foot-link-re" class="foot-nav-link">Plots</a></li>
            <li><a href="#" class="foot-nav-link">Houses</a></li>
            <li><a href="#" class="foot-nav-link">Services</a></li>
            <li><a href="#" class="foot-nav-link">About</a></li>
          </ul>
        </div>


      </div>

      <!-- Divider line -->
      <div class="footer-divider-line"></div>

      <!-- Bottom Bar -->
      <div class="footer-bottom-bar">
        <div class="footer-copyright">
          All rights reserved &copy; 2026
        </div>
        <div class="footer-bottom-links">
          <a href="/about" class="foot-bottom-link">About Us</a>
          <a href="/terms" class="foot-bottom-link">Terms &amp; Conditions</a>
          <a href="/privacy" class="foot-bottom-link">Privacy Policy</a>
        </div>
      </div>
    </footer>
  `;
}

// The marketplace footer. The large footer above is Gasabo Real Estate's; the
// shop needs its own Kigali Market branding, links and contact. Reuses the same
// .large-footer styles so it inherits the layout and responsive behaviour.
export function getMarketplaceFooterHtml() {
  return `
    <footer class="large-footer" id="market-footer">
      <div class="large-footer-container">

        <div class="footer-col brand-col">
          <div class="footer-brand-title cursor-pointer" id="mfoot-brand-home" role="button" tabindex="0" title="Kigali Market home" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem;">
            <img src="/logo-kigali-market.jpg" alt="Kigali Market" style="height: 40px; width: 40px; border-radius: 10px; object-fit: cover;">
            <span style="font-weight: 800; font-size: 1.25rem; color: #ffffff;">KIGALI MARKET</span>
          </div>
          <p class="footer-brand-desc" style="color: #D0E1ED; font-size: 0.92rem; line-height: 1.6; max-width: 34ch;">
            Buy and sell products, vehicles and property across Rwanda &mdash; all in one place.
          </p>
        </div>

        <div class="footer-col">
          <h4 class="footer-col-title">Browse</h4>
          <ul class="footer-links-list">
            <li><a href="#" id="mfoot-all" class="foot-nav-link">All Listings</a></li>
            <li><a href="#" id="mfoot-vehicles" class="foot-nav-link">Vehicles</a></li>
            <li><a href="#" id="mfoot-realestate" class="foot-nav-link">Real Estate</a></li>
            <li><a href="#" id="mfoot-stores" class="foot-nav-link">Stores</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-col-title">Help</h4>
          <ul class="footer-links-list">
            <li><a href="/help-center" id="mfoot-help" class="foot-nav-link">Help Center</a></li>
            <li><a href="/faqs" id="mfoot-faqs" class="foot-nav-link">FAQs</a></li>
            <li><a href="/contact" id="mfoot-contact" class="foot-nav-link">Contact Us</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-col-title">Sell</h4>
          <ul class="footer-links-list">
            <li><a href="#" id="mfoot-postad" class="foot-nav-link">Post an Ad</a></li>
            <li><a href="#" id="mfoot-seller" class="foot-nav-link">Seller Dashboard</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-col-title">Contact</h4>
          <ul class="footer-links-list">
            <li class="footer-contact-item">
              <i class="fa-solid fa-location-dot contact-icon location-icon"></i>
              <span class="foot-nav-link">Kigali, Rwanda</span>
            </li>
            <li class="footer-contact-item">
              <i class="fa-solid fa-envelope contact-icon email-icon"></i>
              <a href="mailto:${CONTACT_EMAIL}" class="foot-nav-link">${CONTACT_EMAIL}</a>
            </li>
            <li class="footer-contact-item">
              <i class="fa-solid fa-phone contact-icon phone-icon"></i>
              <a href="tel:+250788350555" class="footer-phone-link foot-nav-link">+250 788 350 555</a>
            </li>
            <li class="footer-contact-item">
              <i class="fa-brands fa-whatsapp contact-icon" style="color: #25D366;"></i>
              <a href="https://wa.me/250788350555" target="_blank" rel="noopener noreferrer" class="foot-nav-link">WhatsApp: +250 788 350 555</a>
            </li>
          </ul>
        </div>

      </div>

      <div class="footer-divider-line"></div>

      <div class="footer-bottom-bar">
        <div class="footer-copyright">All rights reserved &copy; 2026 Kigali Market</div>
        <div class="footer-bottom-links">
          <a href="/about" id="mfoot-about" class="foot-bottom-link">About Us</a>
          <a href="/terms" id="mfoot-terms" class="foot-bottom-link">Terms &amp; Conditions</a>
          <a href="/privacy" id="mfoot-privacy" class="foot-bottom-link">Privacy Policy</a>
        </div>
      </div>
    </footer>
  `;
}

// Wires the marketplace footer's links. Falls back to going home for anything a
// specific handler was not supplied for.
export function bindMarketplaceFooterEvents(container, handlers = {}) {
  if (!container) return;
  const goHome = handlers.goHome || defaultGoHome;
  const on = (sel, fn) =>
    container.querySelector(sel)?.addEventListener('click', (e) => {
      e.preventDefault();
      fn();
    });

  on('#mfoot-brand-home', goHome);
  on('#mfoot-all', goHome);
  on('#mfoot-vehicles', () => (handlers.goVehicles ? handlers.goVehicles() : goHome()));
  on('#mfoot-realestate', () => {
    stateEngine.setPortal('realestate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  on('#mfoot-stores', () => {
    stateEngine.setUI({ marketplaceTab: 'stores' });
    stateEngine.setPortal('marketplace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  on('#mfoot-postad', () => (handlers.postAd ? handlers.postAd() : goHome()));
  on('#mfoot-seller', () => (handlers.goSeller ? handlers.goSeller() : goHome()));
  on('#mfoot-help', () => (handlers.goHelp ? handlers.goHelp() : goHome()));
  on('#mfoot-faqs', () => (handlers.goFaqs ? handlers.goFaqs() : goHome()));
  on('#mfoot-contact', () => (handlers.goContact ? handlers.goContact() : goHome()));
  on('#mfoot-about', () => (handlers.goAbout ? handlers.goAbout() : goHome()));
  on('#mfoot-terms', () => (handlers.goTerms ? handlers.goTerms() : goHome()));
  on('#mfoot-privacy', () => (handlers.goPrivacy ? handlers.goPrivacy() : goHome()));
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
