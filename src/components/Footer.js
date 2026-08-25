/**
 * Shared Footer & Slim Sticky Bar Component
 * 1. Large Footer matching image_b894f7.png at the absolute bottom of webpage.
 * 2. Slim Sticky Footer Bar remaining at bottom of viewport while scrolling.
 */
import { stateEngine } from '../store/stateEngine.js';
import { getTranslation } from '../store/i18n.js';
import { pushHome, ROUTE_HOME } from '../store/router.js';

export function getLargeFooterHtml(currentLang = 'en') {
  return `
    <footer class="large-footer" id="large-footer">
      <div class="large-footer-container">
        
        <!-- Column 1: Our Platforms -->
        <div class="footer-col">
          <h4 class="footer-col-title">Our Platforms</h4>
          <ul class="footer-links-list">
            <li><a href="#" id="foot-brand-home" class="foot-nav-link">Kigali Market</a></li>
            <li><a href="#" id="foot-link-re" class="foot-nav-link">Gasabo Real Estate</a></li>
            <li><a href="#" class="foot-nav-link">Kigali Job</a></li>
            <li><a href="#" class="foot-nav-link">Clickrwanda TV</a></li>
          </ul>
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
              <a href="mailto:info@gasaborealestate.com" class="foot-nav-link">Email: info@gasaborealestate.com</a>
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

        <!-- Column 4: Support Links -->
        <div class="footer-col">
          <h4 class="footer-col-title">Support Links</h4>
          <ul class="footer-links-list">
            <li><a href="#" class="foot-nav-link">Help Center</a></li>
            <li><a href="#" class="foot-nav-link">Contact Us</a></li>
            <li><a href="#" class="foot-nav-link">FAQs</a></li>
            <li><a href="#" class="foot-nav-link">Become an Agent</a></li>
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
          <a href="#" class="foot-bottom-link">About Us</a>
          <a href="#" class="foot-bottom-link">Terms &amp; Conditions</a>
          <a href="#" class="foot-bottom-link">Privacy Policy</a>
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
