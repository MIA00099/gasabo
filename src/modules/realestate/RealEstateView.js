/**
 * GASABO REAL ESTATE - Property Listings Site
 * Rebuilt to match the "gasabo_real_estate" reference mockup: a property
 * listings agency (Plots/Houses/Services/About), not a developer portfolio.
 * Ported into this app's own design system (inline styles + main.css, emoji
 * icons) rather than the mockup's Tailwind CDN + Lucide - keeps one bundled
 * CSS system instead of loading a second framework at runtime.
 */
import { openDropdownMenu } from '../../components/dropdownMenu.js';
import { stateEngine } from '../../store/stateEngine.js';
import { pushPath, pushHome, pathForListing, ROUTE_PROPERTY, ROUTE_HOME } from '../../store/router.js';
import { makeAccessibleModal } from '../../components/modalA11y.js';
import { openShareModal, showShareToast } from '../../components/ShareModal.js';

// Mockup's own brand palette (Gasabo Real Estate's tailwind.config), kept
// as its own identity separate from the marketplace's green/gold/flag-blue
// scheme - Real Estate has always been a visually distinct portal.
const RE_BLUE = '#003DA5';
const RE_GREEN = '#004B00';
const RE_GOLD = '#dca73a';
const RE_DARK = '#0f172a';

const TYPE_BADGE = {
  house: { bg: RE_BLUE, color: '#fff', label: 'House' },
  plot: { bg: RE_GREEN, color: '#fff', label: 'Plot' },
  commercial: { bg: RE_GOLD, color: RE_DARK, label: 'Commercial' },
};

const TESTIMONIALS = [
  { quote: 'Gasabo Real Estate made buying a plot in Nyamata so incredibly easy. Their investment advice gave me full confidence.', name: 'Eric N. - Investor' },
  { quote: 'Their property management services are top tier. I live abroad and they collect rent and maintain my apartments perfectly.', name: 'Jean Claude - Property Owner' },
];


/**
 * Gasabo's own footer.
 *
 * The page used to end with the Kigali Market footer - KIGALI MARKET branding,
 * Quick Links to the marketplace catalog and Start Selling, the 30-districts
 * blurb. All of it belongs to the other half of the business and pulled the
 * reader straight back out of the portal.
 *
 * This is built from the real-estate content the CMS already holds, so there
 * is nothing invented in it: the address, phone and email are the ones an
 * admin maintains under Real Estate CMS.
 */
function gasaboFooterHtml(contact) {
  const c = contact || {};
  const phone = c.phone || '0788350555';
  const phoneDigits = String(phone).replace(/\s+/g, '');
  // International format for wa.me (no "+", no spaces, "07..." -> "2507...").
  const waDigits = String(phone).replace(/[^\d]/g, '').replace(/^0/, '250');
  const email = c.email || 'gasaboestaterwanda@gmail.com';
  const address = c.address || 'Kacyiru, Gasabo, Kigali';

  return `
    <footer class="large-footer" style="background: linear-gradient(to right, #00568e 0%, #004b7c 35%, #08344e 70%, #0c2b3e 100%); color: #ffffff; padding: 3.5rem 2rem 1.75rem;">
      <div style="max-width: var(--page-max); margin: 0 auto 2.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2.5rem;">
        
        <!-- Column 1: Gasabo Real Estate Brand Block -->
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem;">
            <img src="/real-estate-logo.png" alt="Gasabo Real Estate" style="height: 40px; width: 40px; border-radius: 50%; object-fit: contain; background: #fff;">
            <span style="font-weight: 800; font-size: 1.25rem; color: #ffffff;">Gasabo Real Estate</span>
          </div>
          <p style="color: #D0E1ED; font-size: 0.92rem; line-height: 1.6; max-width: 32ch;">
            Plots, houses and property services across Gasabo District and greater Kigali.
          </p>
        </div>


        <!-- Column 2: Contact Us -->
        <div>
          <h4 style="color: #ffffff; font-size: 1.15rem; font-weight: 700; margin-bottom: 1.2rem;">Contact Us</h4>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.94rem; color: #D0E1ED;">
            <li style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-location-dot" style="color: #94A3B8; font-size: 0.95rem; width: 16px;"></i>
              <span>${escapeHtml(address)}</span>
            </li>
            <li style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-phone" style="color: #22C55E; font-size: 0.95rem; width: 16px;"></i>
              <a href="tel:${escapeHtml(phoneDigits)}" style="color: #ffffff; font-weight: 700; text-decoration: none;">${escapeHtml(phone)}</a>
            </li>
            <li style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-brands fa-whatsapp" style="color: #25D366; font-size: 0.95rem; width: 16px;"></i>
              <a href="https://wa.me/${escapeHtml(waDigits)}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; font-weight: 700; text-decoration: none;">WhatsApp: ${escapeHtml(phone)}</a>
            </li>
            <li style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-envelope" style="color: #94A3B8; font-size: 0.95rem; width: 16px;"></i>
              <a href="mailto:${escapeHtml(email)}" style="color: #D0E1ED; text-decoration: none;">${escapeHtml(email)}</a>
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
        <div>
          <h4 style="color: #ffffff; font-size: 1.15rem; font-weight: 700; margin-bottom: 1.2rem;">Advertise</h4>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.94rem; color: #D0E1ED;">
            <li><button class="re-foot-link" data-tab="about" style="background: none; border: none; padding: 0; text-align: left; color: inherit; font-size: inherit; cursor: pointer;">Get Started</button></li>
            <li><button class="re-foot-link" data-tab="services" style="background: none; border: none; padding: 0; text-align: left; color: inherit; font-size: inherit; cursor: pointer;">Our Plans</button></li>
          </ul>
        </div>

        <!-- Column 4: Browse -->
        <div>
          <h4 style="color: #ffffff; font-size: 1.15rem; font-weight: 700; margin-bottom: 1.2rem;">Browse</h4>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.94rem; color: #D0E1ED;">
            <li><button class="re-foot-link" data-tab="properties" data-type="plot" style="background: none; border: none; padding: 0; text-align: left; color: inherit; font-size: inherit; cursor: pointer;">Plots</button></li>
            <li><button class="re-foot-link" data-tab="properties" data-type="house" style="background: none; border: none; padding: 0; text-align: left; color: inherit; font-size: inherit; cursor: pointer;">Houses</button></li>
            <li><button class="re-foot-link" data-tab="services" style="background: none; border: none; padding: 0; text-align: left; color: inherit; font-size: inherit; cursor: pointer;">Services</button></li>
            <li><button class="re-foot-link" data-tab="about" style="background: none; border: none; padding: 0; text-align: left; color: inherit; font-size: inherit; cursor: pointer;">About</button></li>
          </ul>
        </div>


      </div>

      <!-- Divider line -->
      <div style="max-width: var(--page-max); margin: 0 auto 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.18);"></div>

      <!-- Bottom Bar -->
      <div style="max-width: var(--page-max); margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; color: #CBD5E1; font-size: 0.9rem;">
        <div>
          All rights reserved &copy; 2026
        </div>
        <div style="display: flex; align-items: center; gap: 1.75rem;">
          <button class="re-foot-link" data-tab="about" style="background: none; border: none; padding: 0; color: #CBD5E1; font-size: inherit; cursor: pointer;">About Us</button>
          <button class="re-foot-link" data-tab="about" style="background: none; border: none; padding: 0; color: #CBD5E1; font-size: inherit; cursor: pointer;">Terms &amp; Conditions</button>
          <button class="re-foot-link" data-tab="about" style="background: none; border: none; padding: 0; color: #CBD5E1; font-size: inherit; cursor: pointer;">Privacy Policy</button>
        </div>
      </div>
    </footer>
  `;
}



/**
 * The price bands the search offers, worked out from the listings on the site.
 *
 * They used to be three fixed numbers - under 50M, 50-100M, over 100M -
 * written into the markup. Whether those matched anything depended entirely on
 * what happened to be listed: with the seven properties currently live, every
 * one of them falls in the first band, so two of the three choices return an
 * empty page and the third returns everything. A filter that cannot divide
 * what it is filtering is decoration.
 *
 * Terciles instead: split the actual prices into three, and label the bands
 * with the amounts that fall there. Below four listings there is nothing
 * meaningful to divide, so the search offers "Any Price" alone rather than
 * inventing distinctions.
 */
function priceBands(properties) {
  const prices = (properties || [])
    .map((p) => Number(p.priceNum) || 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  if (prices.length < 4) return [];

  const at = (fraction) => prices[Math.floor((prices.length - 1) * fraction)];
  const low = at(1 / 3);
  const high = at(2 / 3);

  // Terciles can collapse when most listings share a price; two identical
  // edges would produce a band that cannot match anything.
  if (!(low < high)) return [];

  // Half-open, so a property sitting exactly on a boundary belongs to one
  // band and not two. The first version used closed ranges and a listing
  // priced at the tercile showed up under both "Under 12.5M" and
  // "12.5M - 25M", which makes the counts add up to more than the catalogue.
  return [
    { id: 'band1', label: `Under ${money(low)}`, below: low },
    { id: 'band2', label: `${money(low)} - ${money(high)}`, from: low, below: high },
    { id: 'band3', label: `${money(high)} and above`, from: high },
  ];
}

/** 150000000 -> "150M Rwf", 12500000 -> "12.5M Rwf", 850000 -> "850,000 Rwf". */
function money(n) {
  if (n >= 1000000) {
    // One decimal, dropped when it is a whole number. Rounding 12.5 to 13
    // put a label on the band that did not match the boundary it filtered
    // on - "Under 13M" excluding a property priced 12.5M reads as a bug.
    const m = Math.round((n / 1000000) * 10) / 10;
    return `${m}M Rwf`;
  }
  return `${n.toLocaleString()} Rwf`;
}

export function renderRealEstateView(container) {
  function render() {
    const state = stateEngine.getState();
    const reData = state.realEstate;
    const hasAttempted = state.loading.realEstate !== undefined;
    const loading = !!state.loading.realEstate;

    // Kick off the fetch on first render only - must NOT be gated behind a
    // separate stateEngine.setUI() call, since setUI() notifies synchronously
    // and would re-enter this render function before the fetch even starts.
    if (!hasAttempted && !loading) {
      stateEngine.loadRealEstate().catch(() => {});
    }

    if (!hasAttempted || (loading && !reData.hero)) {
      container.innerHTML = `
        <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 1.1rem;">
          Loading Gasabo Real Estate...
        </div>
      `;
      return;
    }

    if (state.error && !reData.hero) {
      container.innerHTML = `
        <div style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: #991B1B;">
          <div>⚠️ ${escapeHtml(state.error)}</div>
          <button id="re-retry-btn" class="btn btn-primary">Retry</button>
        </div>
      `;
      container.querySelector('#re-retry-btn')?.addEventListener('click', () => stateEngine.loadRealEstate().catch(() => {}));
      return;
    }

    const activeTab = state.ui.realEstateTab || 'home'; // 'home' | 'properties' | 'services' | 'about'
    const filters = state.ui.realEstateFilters || { type: 'all', location: 'all', price: 'all' };
    const properties = reData.properties || [];

    let filteredProperties = properties;
    if (filters.type !== 'all') filteredProperties = filteredProperties.filter(p => p.type === filters.type);
    if (filters.location !== 'all') filteredProperties = filteredProperties.filter(p => p.location === filters.location);
    const bands = priceBands(properties);
    const band = bands.find((b) => b.id === filters.price);
    if (band) {
      filteredProperties = filteredProperties.filter((p) => {
        const n = Number(p.priceNum) || 0;
        // from is inclusive, below is exclusive - see priceBands.
        if (band.from !== undefined && n < band.from) return false;
        if (band.below !== undefined && n >= band.below) return false;
        return true;
      });
    }

    const propertiesTitle = filters.type === 'plot' ? 'Plots & Land'
      : filters.type === 'house' ? 'Houses & Villas'
      : filters.type === 'commercial' ? 'Commercial Properties'
      : 'All Properties';

    // Unique locations from real listings, not a hardcoded list - the
    // search/filter dropdown only ever offers places something is actually
    // listed in.
    const availableLocations = [...new Set(properties.map(p => p.location))].sort();

    container.innerHTML = `
      <div>
        <!-- NAVBAR - the delivered markup, class for class. Three changes it
             needs to work inside the app rather than as a standalone page:
             the logo points at the asset in public/, the anchors carry ids so
             they can be wired, and their clicks are prevented so href="#" does
             not push a hash the router would then have to strip.

             Plots, Houses and Services keep their chevrons and open the real
             lists the CMS holds. -->
        <nav class="top-nav">

          <!-- LEFT SIDE -->
          <div class="nav-left">

            <!-- BRAND -->
            <a href="#" class="brand" id="re-logo-home">
              <img src="/real-estate-logo.png" alt="Gasabo Logo">
              <span class="brand-name">
                Gasabo Real Estate
              </span>
            </a>

            <!-- DIVIDER -->
            <div class="nav-divider"></div>

            <!-- NAVIGATION -->
            <div class="nav-links">

              <!-- PLOTS -->
              <a href="#" class="nav-item re-nav-item" data-nav="plot" aria-haspopup="menu" aria-expanded="false">
                <span class="icon"><i class="fa-solid fa-map-location-dot" style="font-size: 0.95rem;"></i></span>
                <span>Plots</span>
                <span class="arrow">&#8964;</span>
              </a>

              <!-- HOUSES -->
              <a href="#" class="nav-item re-nav-item" data-nav="house" aria-haspopup="menu" aria-expanded="false">
                <span class="icon"><i class="fa-solid fa-house" style="font-size: 0.95rem;"></i></span>
                <span>Houses</span>
                <span class="arrow">&#8964;</span>
              </a>

              <!-- SERVICES -->
              <a href="#" class="nav-item re-nav-item" data-nav="services" aria-haspopup="menu" aria-expanded="false">
                <span class="icon"><i class="fa-solid fa-briefcase" style="font-size: 0.95rem;"></i></span>
                <span>Services</span>
                <span class="arrow">&#8964;</span>
              </a>

              <!-- ABOUT -->
              <a href="#" class="nav-item re-nav-item" data-nav="about">
                <span class="info-icon" style="font-size: 0.85rem; font-weight: 700; border: 1.5px solid currentColor; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; line-height: 1;">i</span>
                <span>About</span>
              </a>


            </div>

          </div>

          <!-- RIGHT SIDE: SOCIAL ICONS & KIGALI MARKET -->
          <div class="re-header-actions" style="display: flex; align-items: center; gap: 0.85rem;">
            <div class="re-header-social" style="display: flex; align-items: center; gap: 0.45rem;">
              <a href="https://www.instagram.com/gasabo_real_estate/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"
                style="width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; text-decoration: none; transition: transform 0.2s ease;">
                <i class="fa-brands fa-instagram"></i>
              </a>
              <a href="https://www.youtube.com/@GasaboRealEstate" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube"
                style="width: 30px; height: 30px; border-radius: 8px; background: #FF0000; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; text-decoration: none; transition: transform 0.2s ease;">
                <i class="fa-brands fa-youtube"></i>
              </a>
              <a href="https://www.facebook.com/profile.php?id=100063657936349" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook"
                style="width: 30px; height: 30px; border-radius: 8px; background: #1877F2; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; text-decoration: none; transition: transform 0.2s ease;">
                <i class="fa-brands fa-facebook-f"></i>
              </a>
              <a href="https://www.tiktok.com/@gasaborealestate" target="_blank" rel="noopener noreferrer" aria-label="TikTok" title="TikTok"
                style="width: 30px; height: 30px; border-radius: 8px; background: #000000; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; text-decoration: none; transition: transform 0.2s ease;">
                <i class="fa-brands fa-tiktok"></i>
              </a>
            </div>

            <div class="re-header-divider" style="width: 1px; height: 22px; background: #E2E8F0; margin: 0 0.15rem;"></div>

            <!-- KIGALI MARKET -->
            <a href="#" class="market-link" id="re-back-to-market-nav">
              <span class="back-arrow">&#8592;</span>
              <span>Kigali Market</span>
            </a>
          </div>

        </nav>



        ${activeTab === 'home' ? renderHomeView(reData, properties) : ''}
        ${activeTab === 'properties' ? renderPropertiesView(propertiesTitle, filteredProperties, filters, availableLocations) : ''}
        ${activeTab === 'services' ? renderServicesView(reData.services || []) : ''}
        ${activeTab === 'about' ? renderAboutView(reData) : ''}
      </div>
      ${gasaboFooterHtml(reData.contact)}
    `;

    // The marketplace footer bindings and its slim sticky bar go with it.

    // Event Handlers
    container.querySelector('#re-logo-home')?.addEventListener('click', (e) => {
      e.preventDefault();
      stateEngine.setUI({ realEstateTab: 'home' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Nav items. Plots, Houses and Services carry a chevron and so must open
    // something; the lists are built from the properties and services the CMS
    // actually holds, not from a fixed menu that could go stale.
    const goProperties = (type, location = 'all') => {
      stateEngine.setUI({
        realEstateTab: 'properties',
        realEstateFilters: { type, location, price: 'all' },
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const locationsFor = (type) => {
      const seen = new Set();
      (properties || []).forEach((p) => {
        if (p.type === type && p.location) seen.add(p.location);
      });
      return [...seen].sort();
    };

    container.querySelectorAll('.re-nav-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        // href="#" comes from the delivered markup; without this every click
        // pushes a hash the router then has to strip back off.
        e.preventDefault();
        const nav = btn.dataset.nav;

        if (nav === 'about') {
          stateEngine.setUI({ realEstateTab: 'about' });
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        if (nav === 'services') {
          const services = reData.services || [];
          openDropdownMenu(btn, {
            label: 'Gasabo services',
            items: [
              { id: '__all', label: 'All services', iconHtml: '<i class="fa-solid fa-briefcase" style="color:#1D4ED8"></i>' },
              ...services.map((s, i) => ({
                id: String(i),
                label: s.title || s.name || `Service ${i + 1}`,
                iconHtml: '<i class="fa-regular fa-circle-check" style="color:#1D4ED8"></i>',
              })),
            ],
            // Every entry lands on the services page - there are no per-service
            // pages to send anyone to, and inventing routes that 404 would be
            // worse than a menu that scrolls you to the list.
            onSelect: () => {
              stateEngine.setUI({ realEstateTab: 'services' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          });
          return;
        }

        // plot | house
        const locs = locationsFor(nav);
        openDropdownMenu(btn, {
          label: nav === 'plot' ? 'Plots by location' : 'Houses by location',
          selectedId: activeTab === 'properties' && filters.type === nav ? (filters.location || 'all') : null,
          items: [
            {
              id: 'all',
              label: nav === 'plot' ? 'All plots' : 'All houses',
              iconHtml: `<i class="fa-solid ${nav === 'plot' ? 'fa-location-dot' : 'fa-house'}" style="color:#1D4ED8"></i>`,
              meta: String((properties || []).filter((p) => p.type === nav).length),
            },
            ...locs.map((loc) => ({
              id: loc,
              label: loc,
              iconHtml: '<i class="fa-solid fa-location-dot" style="color:#94A3B8"></i>',
              meta: String((properties || []).filter((p) => p.type === nav && p.location === loc).length),
            })),
          ],
          onSelect: (id) => goProperties(nav, id === 'all' ? 'all' : id),
        });
      });
    });

    container.querySelector('#re-back-to-market-nav')?.addEventListener('click', (e) => {
      e.preventDefault();
      pushHome();
      stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
      const filters = stateEngine.getState().ui.marketplaceFilters || {};
      stateEngine.setUI({
        marketplaceTab: 'products',
        marketplaceFilters: { ...filters, searchQuery: '', selectedCategory: 'all', selectedDistrict: 'all' },
      });
      stateEngine.setPortal('marketplace');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Footer Browse column - same destinations, simpler markup.
    container.querySelectorAll('.re-foot-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === 'properties' && btn.dataset.type) {
          stateEngine.setUI({ realEstateTab: 'properties', realEstateFilters: { type: btn.dataset.type, location: 'all', price: 'all' } });
        } else {
          stateEngine.setUI({ realEstateTab: tab });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    container.querySelector('#re-search-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = container.querySelector('#re-search-type').value;
      const location = container.querySelector('#re-search-location').value;
      const price = container.querySelector('#re-search-price').value;
      stateEngine.setUI({ realEstateTab: 'properties', realEstateFilters: { type, location, price } });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Navigate rather than opening the modal directly: the URL becomes
    // /property/<id>, and main.js opens the detail in response. One code path
    // serves clicks, shared links, and Back/Forward alike.
    container.querySelectorAll('.re-property-card').forEach(card => {
      const open = () => {
        const id = card.dataset.id;
        if (!properties.some(p => p.id === id)) return;
        pushPath(pathForListing(ROUTE_PROPERTY, id));
        stateEngine.setRoute({ kind: ROUTE_PROPERTY, id });
      };
      card.addEventListener('click', open);
      // The card is a div with role="button", so Enter and Space have to be
      // wired by hand - a real button would handle both natively.
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Space would otherwise scroll the page
          open();
        }
      });
    });

    container.querySelectorAll('.re-card-share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const id = btn.dataset.id;
        const prop = properties.find(p => p.id === id);
        if (!prop) return;
        openShareModal({
          title: prop.title,
          text: `Check out "${prop.title}" (${formatPropPrice(prop.price)}) in ${prop.location} on Gasabo Real Estate!`,
          url: pathForListing(ROUTE_PROPERTY, prop.id),
          image: Array.isArray(prop.images) && prop.images[0] ? prop.images[0] : prop.image,
          price: prop.priceNum || prop.price,
          currency: 'Rwf',
          location: prop.location,
        });
      });
    });

    container.querySelector('#re-explore-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ realEstateTab: 'properties', realEstateFilters: { type: 'all', location: 'all', price: 'all' } });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    container.querySelector('#re-inquiry-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const status = form.querySelector('#re-inquiry-status');
      const submit = form.querySelector('button[type="submit"]');
      const payload = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        message: form.message.value.trim(),
      };
      submit.disabled = true;
      status.textContent = '';
      try {
        await stateEngine.submitRealEstateInquiry(payload);
        status.textContent = 'Thank you. Gasabo Real Estate has received your inquiry.';
        status.style.color = '#047857';
        form.reset();
      } catch (err) {
        status.textContent = err.message || 'Could not send your inquiry. Please call us directly.';
        status.style.color = '#B91C1C';
      } finally {
        submit.disabled = false;
      }
    });
  }

  render();
}

function renderHomeView(reData, properties) {
  // Worked out here rather than passed in: this is a separate top-level
  // function from render(), so a variable computed there is not in scope.
  const bands = priceBands(properties);
  return `
    <!-- HERO SECTION -->
    <section style="position: relative; overflow: hidden; background: ${RE_DARK};">
      <div style="position: absolute; inset: 0;">
        <img src="${escapeHtml(reData.hero.bgImage)}" alt="Gasabo Real Estate" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.55;">
        <div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15,23,42,0.96), ${RE_BLUE}CC);"></div>
      </div>

      <div style="position: relative; z-index: 1; max-width: var(--page-max); margin: 0 auto; padding: 3.5rem 1.5rem; display: flex; flex-wrap: wrap; align-items: center; gap: 2.5rem;">
        <div style="flex: 1 1 420px;">
          <span style="display: inline-block; padding: 4px 14px; border-radius: 9999px; background: rgba(220,167,58,0.18); color: ${RE_GOLD}; border: 1px solid rgba(220,167,58,0.35); font-weight: 700; font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 1rem;">
            Opening doors to extraordinary spaces
          </span>
          <h1 style="font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; color: #fff; line-height: 1.15; margin-bottom: 1.25rem;">
            ${escapeHtml(reData.hero.title)}
          </h1>
          <p style="font-size: 1.1rem; color: #cbd5e1; line-height: 1.6; max-width: 560px;">
            ${escapeHtml(reData.hero.subtitle)}
          </p>
        </div>

        <!-- QUICK SEARCH WIDGET -->
        <div style="flex: 1 1 360px; max-width: 420px;">
          <div style="background: #fff; border-radius: 20px; box-shadow: 0 20px 45px rgba(0,0,0,0.3); padding: 1.75rem; border-top: 4px solid ${RE_GREEN};">
            <h3 style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-bottom: 1.25rem;">🔍 Quick Search</h3>
            <form id="re-search-form" style="display: flex; flex-direction: column; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.3rem;">Property Type</label>
                <select id="re-search-type" style="width: 100%; padding: 0.7rem 0.9rem; border: 1px solid #E2E8F0; border-radius: 10px; background: #F8FAFC; font-size: 0.92rem;">
                  <option value="all">Any Type</option>
                  <option value="house">Houses & Villas</option>
                  <option value="plot">Plots / Land</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.3rem;">Location</label>
                <select id="re-search-location" style="width: 100%; padding: 0.7rem 0.9rem; border: 1px solid #E2E8F0; border-radius: 10px; background: #F8FAFC; font-size: 0.92rem;">
                  <option value="all">Any Location</option>
                  ${[...new Set(properties.map(p => p.location))].sort().map(loc => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.3rem;">Price Range</label>
                <select id="re-search-price" style="width: 100%; padding: 0.7rem 0.9rem; border: 1px solid #E2E8F0; border-radius: 10px; background: #F8FAFC; font-size: 0.92rem;">
                  <option value="all">Any Price</option>
                  ${bands.map((b) => `<option value="${b.id}">${b.label}</option>`).join('')}
                </select>
              </div>
              <button type="submit" style="width: 100%; background: ${RE_BLUE}; color: #fff; font-weight: 700; padding: 0.85rem; border: none; border-radius: 10px; font-size: 0.95rem; cursor: pointer; margin-top: 0.25rem;">
                Search Properties
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURED LISTINGS -->
    <section style="padding: 3.5rem 1.5rem; background: #F8FAFC;">
      <div style="max-width: var(--page-max); margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.9rem; font-weight: 800; color: #0F172A;">Featured Listings</h2>
          <p style="color: #64748B; margin-top: 0.3rem;">Explore all our available plots and houses.</p>
        </div>
        ${renderPropertyGrid(properties)}
      </div>
    </section>
  `;
}

function renderPropertiesView(title, filteredProperties, filters, availableLocations) {
  return `
    <div style="background: #ffffff; padding: 2.5rem 1.5rem; border-bottom: 1px solid #E2E8F0; text-align: center;">
      <h1 style="font-size: 2.2rem; font-weight: 800; color: #0F172A; margin-bottom: 0.5rem;">${escapeHtml(title)}</h1>
      <p style="color: #64748B; max-width: 600px; margin: 0 auto;">Browse our exclusive selection tailored to your needs.</p>
    </div>

    <div style="padding: 2.5rem 1.5rem; background: #F8FAFC;">
      <div style="max-width: var(--page-max); margin: 0 auto;">
        ${filteredProperties.length === 0 ? `
          <div style="text-align: center; padding: 4rem 1.5rem;">
            <div style="width: 96px; height: 96px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; font-size: 2.5rem;">🔍</div>
            <h3 style="font-size: 1.4rem; font-weight: 700; color: #0F172A; margin-bottom: 0.5rem;">No properties found</h3>
            <p style="color: #64748B;">We couldn't find any properties matching your current criteria.</p>
          </div>
        ` : renderPropertyGrid(filteredProperties)}
      </div>
    </div>
  `;
}

function renderServicesView(services) {
  const featured = services.filter(s => s.featured);
  const standard = services.filter(s => !s.featured);

  return `
    <section style="padding: 3.5rem 1.5rem; background: #ffffff;">
      <div style="max-width: var(--page-max); margin: 0 auto;">
        <div style="text-align: center; max-width: 700px; margin: 0 auto 3rem auto;">
          <span style="color: ${RE_GOLD}; font-weight: 800; text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.15em;">Our Expertise</span>
          <h2 style="font-size: 2.2rem; font-weight: 700; color: #0F172A; margin: 0.5rem 0;">Tailored <strong style="color: ${RE_BLUE};">Real Estate</strong> Solutions</h2>
          <p style="color: #64748B; font-size: 1.05rem;">
            Beyond simply buying and selling, Gasabo Real Estate offers a holistic suite of services designed to manage, enhance, and protect your property investments in Rwanda.
          </p>
        </div>

        ${featured.length > 0 ? `
          <div class="grid-2" style="gap: 1.5rem; margin-bottom: 2rem;">
            ${featured.map(s => `
              <div style="position: relative; height: 240px; border-radius: 20px; overflow: hidden; background: ${RE_DARK}; display: flex; flex-direction: column; justify-content: flex-end; padding: 1.75rem;">
                <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(15,23,42,0.85));"></div>
                <div style="position: relative; z-index: 1;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 0.85rem;">${s.icon}</div>
                  <h4 style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 0.4rem;">${escapeHtml(s.title)}</h4>
                  <p style="color: #cbd5e1; font-size: 0.88rem;">${escapeHtml(s.description)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="background: #F8FAFC; border-radius: 20px; padding: 1rem; border: 1px solid #E2E8F0;">
          ${standard.map(s => `
            <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border-radius: 14px;">
              <div style="width: 48px; height: 48px; border-radius: 14px; background: #fff; border: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; color: ${RE_BLUE};">${s.icon}</div>
              <div>
                <h4 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin-bottom: 0.2rem;">${escapeHtml(s.title)}</h4>
                <p style="color: #64748B; font-size: 0.9rem;">${escapeHtml(s.description)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderAboutView(reData) {
  const contact = reData.contact || {};
  return `
    <!-- ABOUT HERO -->
    <section style="padding: 5rem 1.5rem 6rem; background: ${RE_BLUE}; color: #fff; text-align: center;">
      <div style="max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem;">${escapeHtml(reData.about.heading)}</h1>
        <p style="font-size: 1.2rem; color: #cbd5e1; line-height: 1.7;">${escapeHtml(reData.about.text)}</p>
      </div>
    </section>
    <section style="padding: 3rem 1.5rem; background: #F8FAFC;">
      <div style="max-width: var(--page-max); margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 2rem; align-items: start;">
        <div>
          <span style="color: ${RE_GOLD}; font-weight: 800; text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.12em;">Contact</span>
          <h2 style="font-size: 1.9rem; font-weight: 800; color: #0F172A; margin: 0.45rem 0 1rem;">Talk To Gasabo Real Estate</h2>
          <p style="color: #475569; line-height: 1.7; margin-bottom: 1rem;">${escapeHtml(contact.address || 'Kigali, Rwanda')}</p>
          <p style="color: #0F172A; font-weight: 700; margin-bottom: 0.35rem;">${escapeHtml(contact.phone || '0788350555')}</p>
          <p style="color: #475569;">${escapeHtml(contact.email || 'gasaboestaterwanda@gmail.com')}</p>
        </div>
        <form id="re-inquiry-form" style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: 16px; padding: 1.25rem; display: grid; gap: 0.85rem;">
          <label style="display: grid; gap: 0.35rem; color: #0F172A; font-weight: 700; font-size: 0.85rem;">
            Name
            <input name="name" required minlength="2" style="border: 1px solid #CBD5E1; border-radius: 10px; padding: 0.75rem; font: inherit; font-weight: 500;" placeholder="Your name">
          </label>
          <label style="display: grid; gap: 0.35rem; color: #0F172A; font-weight: 700; font-size: 0.85rem;">
            Phone
            <input name="phone" required minlength="6" style="border: 1px solid #CBD5E1; border-radius: 10px; padding: 0.75rem; font: inherit; font-weight: 500;" placeholder="0788 000 000">
          </label>
          <label style="display: grid; gap: 0.35rem; color: #0F172A; font-weight: 700; font-size: 0.85rem;">
            Message
            <textarea name="message" rows="4" maxlength="1000" style="border: 1px solid #CBD5E1; border-radius: 10px; padding: 0.75rem; font: inherit; font-weight: 500; resize: vertical;" placeholder="Tell us what you are looking for"></textarea>
          </label>
          <div id="re-inquiry-status" style="min-height: 1.1rem; font-size: 0.84rem; font-weight: 700;"></div>
          <button type="submit" style="background: ${RE_GREEN}; color: #ffffff; border: 0; border-radius: 10px; padding: 0.85rem 1rem; font-weight: 800; cursor: pointer;">Send Inquiry</button>
        </form>
      </div>
    </section>
  `;
}


function renderPropertyGrid(list) {
  if (list.length === 0) {
    return `<div style="text-align: center; padding: 3rem; color: #64748B;">No properties listed yet.</div>`;
  }
  return `
    <div class="grid-3" style="gap: 1.75rem;">
      ${list.map(prop => {
        const badge = TYPE_BADGE[prop.type] || TYPE_BADGE.house;
        const photoCount = Array.isArray(prop.images) ? prop.images.length : (prop.image ? 1 : 0);
        return `
          <!-- role/tabindex because this is a clickable div: without them a
               keyboard user cannot reach a property at all, and a screen
               reader announces it as plain content rather than something
               activatable. The keydown handler below restores Enter/Space,
               which a real <button> would give for free. -->
          <div class="re-property-card" data-id="${prop.id}" role="button" tabindex="0"
            aria-label="View details for ${escapeHtml(prop.title)}, ${escapeHtml(prop.location)}, ${escapeHtml(prop.price)}"
            style="background: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; cursor: pointer; transition: all 0.25s ease;">
            <div style="position: relative; height: 220px; overflow: hidden;">
              <img src="${escapeHtml(prop.image)}" alt="${escapeHtml(prop.title)}" style="width: 100%; height: 100%; object-fit: cover;">
              <span style="position: absolute; top: 14px; left: 14px; background: ${badge.bg}; color: ${badge.color}; font-size: 0.7rem; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.04em;">
                ${badge.label}
              </span>
              ${photoCount > 1 ? `
                <span style="position: absolute; top: 14px; right: 14px; background: rgba(2,6,23,0.7); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: flex; align-items: center; gap: 4px;">📷 ${photoCount}</span>
              ` : ''}
            </div>
            <div style="padding: 1.5rem;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 0.4rem;">
                <h4 style="font-size: 1.15rem; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.3;">${escapeHtml(prop.title)}</h4>
                <button type="button" class="re-card-share-btn" data-id="${prop.id}" aria-label="Share ${escapeHtml(prop.title)}"
                  style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s ease;"
                  title="Share property link">
                  <i class="fa-solid fa-share-nodes" style="font-size: 0.9rem;"></i>
                </button>
              </div>
              <p style="color: #64748B; font-size: 0.88rem; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 4px;">📍 ${escapeHtml(prop.location)}</p>
              <p style="font-size: 1.4rem; font-weight: 800; color: ${RE_GREEN}; margin-bottom: 1rem;">${escapeHtml(prop.price)}</p>
              <div style="display: flex; gap: 1rem; border-top: 1px solid #F1F5F9; padding-top: 1rem; color: #475569; font-size: 0.85rem; font-weight: 600;">
                📐 ${escapeHtml(prop.area)}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function formatPropPrice(val) {
  if (!val) return 'Negotiable';
  const str = String(val).trim();
  const digitsOnly = str.replace(/[^\d]/g, '');
  if (digitsOnly.length > 0 && !str.toLowerCase().includes('rwf')) {
    const num = Number(digitsOnly);
    return `${num.toLocaleString()} RWF`;
  }
  return str;
}

function formatPropArea(val) {
  if (!val) return 'N/A';
  const str = String(val).trim();
  if (/^\d+$/.test(str)) {
    return `${Number(str).toLocaleString()} Sqm`;
  }
  return str;
}

export function shareUrlLink({ title, text, url }) {
  openShareModal({ title, text, url });
}

export function showToastNotification(msg) {
  let toast = document.getElementById('km-global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'km-global-toast';
    toast.style.cssText = 'position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: #0F172A; color: #FFFFFF; font-weight: 700; font-size: 0.92rem; padding: 12px 24px; border-radius: 9999px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 99999; transition: all 0.3s ease; opacity: 0; pointer-events: none; border: 1px solid rgba(255,255,255,0.15);';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translate(-50%, -8px)';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, 0px)';
  }, 2600);
}

// Exported so main.js can open it in response to a /property/:id URL, not
// only from a card click - a visitor landing on that link directly must get
// the same detail view.
export function openPropertyModal(prop, contact, onClose, returnFocusTo) {
  const badge = TYPE_BADGE[prop.type] || TYPE_BADGE.house;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; width: 100vw; height: 100vh; background: #FFFFFF; z-index: 9999; overflow-y: auto; display: flex; flex-direction: column;';

  const phoneDigits = (contact?.phone || '').replace(/[^\d+]/g, '');

  const galleryImages = Array.isArray(prop.images) && prop.images.length ? prop.images : [prop.image];
  let activeIndex = 0;

  const allProps = stateEngine.data.realEstate?.properties || [];
  let sameTypeProps = allProps.filter((p) => p.id !== prop.id && (p.type === prop.type || (!p.type && prop.type === 'house')));
  if (sameTypeProps.length < 3) {
    const others = allProps.filter((p) => p.id !== prop.id && !sameTypeProps.some((s) => s.id === p.id));
    sameTypeProps = [...sameTypeProps, ...others];
  }

  const formattedPrice = formatPropPrice(prop.price);
  const formattedArea = formatPropArea(prop.area);

  overlay.innerHTML = `
    <!-- FULL PAGE STICKY HEADER -->
    <header style="position: sticky; top: 0; z-index: 100; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #E2E8F0; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; row-gap: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
      <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
        <a href="/" id="re-detail-logo-home" title="Gasabo Real Estate home page" aria-label="Gasabo Real Estate home page"
          style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; text-decoration: none;">
          <img src="/real-estate-logo.png" alt="Gasabo Real Estate"
            style="height: 38px; width: 38px; border-radius: 50%; object-fit: contain; background: #fff; border: 1px solid #E2E8F0;">
          <span style="font-weight: 800; color: #0F172A; font-size: 0.82rem; line-height: 1.1; white-space: nowrap;">Home Page</span>
        </a>
        <button id="re-modal-close" data-modal-close aria-label="Back to properties"
          style="display: flex; align-items: center; gap: 8px; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 0.55rem 1.2rem; border-radius: 9999px; font-weight: 700; color: #0F172A; cursor: pointer; font-size: 0.9rem; transition: all 0.2s ease; white-space: nowrap;">
          ← Back to Properties
        </button>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <button type="button" id="re-share-head-btn" aria-label="Share property link"
          style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; font-weight: 700; padding: 0.5rem 1.1rem; border-radius: 9999px; cursor: pointer; font-size: 0.88rem; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">
          <i class="fa-solid fa-share-nodes"></i> Share Link
        </button>
        <a href="tel:${phoneDigits}" style="background: ${RE_BLUE}; color: #fff; font-weight: 700; padding: 0.5rem 1.1rem; border-radius: 9999px; text-decoration: none; font-size: 0.88rem; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(15,23,42,0.15);">
          📞 Call Agent
        </a>
        <a href="https://wa.me/${phoneDigits.replace('+', '')}" target="_blank" rel="noopener" style="background: #25D366; color: #fff; font-weight: 700; padding: 0.5rem 1.1rem; border-radius: 9999px; text-decoration: none; font-size: 0.88rem; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(37,211,102,0.2);">
          💬 WhatsApp
        </a>
      </div>
    </header>

    <!-- FULL PAGE MAIN CONTENT -->
    <main style="flex: 1; width: 100%; background: #FFFFFF;">

      <!-- HERO IMAGE SHOWCASE (UNCROPPED DARK SHOWCASE) -->
      <div id="re-gallery-frame" style="position: relative; width: 100%; max-height: 65vh; min-height: 340px; background: #0B132B; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none;">
        <img id="re-gallery-main" src="${escapeHtml(galleryImages[0])}" alt="${escapeHtml(prop.title)}" style="max-width: 100%; max-height: 65vh; object-fit: contain; width: auto; height: auto; display: block; margin: auto;">

        ${galleryImages.length > 1 ? `
          <!-- Left/Right Navigation Arrows -->
          <button type="button" id="re-prev-btn" aria-label="Previous photo"
            style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); z-index: 20; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.9); border: none; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">❮</button>
          <button type="button" id="re-next-btn" aria-label="Next photo"
            style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); z-index: 20; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.9); border: none; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">❯</button>

          <!-- Photo Counter -->
          <span id="re-photo-counter" style="position: absolute; bottom: 16px; left: 20px; z-index: 20; background: rgba(0,0,0,0.75); color: #fff; font-size: 0.85rem; font-weight: 700; padding: 6px 14px; border-radius: 9999px; backdrop-filter: blur(4px);">📷 1 / ${galleryImages.length} Photos</span>
        ` : ''}

        ${prop.videoId ? `
          <!-- Play badge for the admin's YouTube tour. Centred so it doesn't
               cover the left/right photo arrows. Opens the embedded video. -->
          <button type="button" id="re-play-video-btn" aria-label="Play video tour"
            style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:22; width:74px; height:74px; border-radius:50%; background:#FF0000; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(0,0,0,0.45);">
            <i class="fa-solid fa-play" style="font-size:1.7rem; margin-left:4px;"></i>
          </button>
        ` : ''}
      </div>

      ${galleryImages.length > 1 ? `
        <!-- Thumbnail Strip -->
        <div style="background: #0F172A; padding: 12px 1.5rem; border-bottom: 1px solid #1E293B;">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; gap: 10px; overflow-x: auto;">
            ${galleryImages.map((u, i) => `
              <button type="button" class="re-gallery-thumb" data-index="${i}" aria-label="View photo ${i + 1} of ${galleryImages.length}"
                style="width: 72px; height: 72px; border-radius: 12px; overflow: hidden; border: 3px solid ${i === 0 ? RE_GREEN : 'transparent'}; padding: 0; cursor: pointer; background: #0B132B; flex-shrink: 0; transition: all 0.2s ease;">
                <img src="${escapeHtml(u)}" alt="" style="width: 100%; height: 100%; object-fit: cover;">
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- MAIN PAGE CONTENT (PREMIUM 2-COLUMN SPLIT ON DESKTOP) -->
      <div style="max-width: 1200px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem;">

        <!-- HEADER TITLE & PRICE SECTION -->
        <div style="margin-bottom: 2rem; border-bottom: 1px solid #E2E8F0; padding-bottom: 2rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1.5rem;">
          <div style="flex: 1 1 320px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.75rem; flex-wrap: wrap;">
              <span style="background: ${badge.bg}; color: ${badge.color}; font-size: 0.75rem; font-weight: 800; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">${badge.label}</span>
              <span style="background: #ECFDF5; color: ${RE_GREEN}; font-size: 0.75rem; font-weight: 800; padding: 5px 12px; border-radius: 9999px; display: flex; align-items: center; gap: 4px;">✓ Verified Listing</span>
            </div>
            <h1 style="font-size: 2.4rem; font-weight: 900; color: #0F172A; margin-bottom: 0.5rem; line-height: 1.2;">${escapeHtml(prop.title)}</h1>
            <p style="color: #64748B; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
              📍 Location: ${escapeHtml(prop.location)}
            </p>
          </div>

          <div style="text-align: left; flex-shrink: 0;">
            <div style="font-size: 0.8rem; text-transform: uppercase; font-weight: 800; color: #64748B; letter-spacing: 0.05em; margin-bottom: 4px;">Listed Price</div>
            <div style="font-size: 2.5rem; font-weight: 900; color: ${RE_GREEN};">${escapeHtml(formattedPrice)}</div>
          </div>
        </div>

        <!-- 2-COLUMN GRID SECTION -->
        <div style="display: flex; flex-wrap: wrap; gap: 2.5rem;">

          <!-- LEFT COLUMN: OVERVIEW, HIGHLIGHTS & DESCRIPTION (62%) -->
          <div style="flex: 2 1 500px;">

            <!-- KEY HIGHLIGHTS BAR -->
            <div style="background: #F8FAFC; border-radius: 20px; padding: 1.5rem; border: 1px solid #E2E8F0; margin-bottom: 2.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.25rem;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 48px; height: 48px; border-radius: 14px; background: #EEF2FF; color: ${RE_BLUE}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">📐</div>
                <div>
                  <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Total Area</div>
                  <div style="font-weight: 800; color: #0F172A; font-size: 1.1rem;">${escapeHtml(formattedArea)}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 48px; height: 48px; border-radius: 14px; background: #ECFDF5; color: ${RE_GREEN}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">🏷️</div>
                <div>
                  <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Category</div>
                  <div style="font-weight: 800; color: #0F172A; font-size: 1.1rem;">${escapeHtml(badge.label)}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 48px; height: 48px; border-radius: 14px; background: #FEF3C7; color: ${RE_GOLD}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">📍</div>
                <div>
                  <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">District</div>
                  <div style="font-weight: 800; color: #0F172A; font-size: 1.1rem;">${escapeHtml(prop.location)}</div>
                </div>
              </div>
            </div>

            <!-- DESCRIPTION SECTION -->
            <div style="margin-bottom: 2.5rem;">
              <h2 style="font-size: 1.4rem; font-weight: 800; color: #0F172A; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                <span style="width: 4px; height: 22px; background: ${RE_GOLD}; border-radius: 9999px;"></span>
                Property Overview & Details
              </h2>
              <div style="background: #F8FAFC; border-radius: 20px; padding: 1.75rem; border: 1px solid #E2E8F0; color: #334155; line-height: 1.8; font-size: 1.05rem; white-space: pre-line;">${escapeHtml(prop.description)}</div>
            </div>

          </div>

          <!-- RIGHT COLUMN: STICKY AGENT CONTACT CARD (35%) -->
          <div style="flex: 1 1 320px;">
            <div style="position: sticky; top: 90px; background: #fff; border-radius: 24px; border: 1px solid #E2E8F0; padding: 1.75rem; box-shadow: 0 10px 30px rgba(15,23,42,0.06);">

              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1.25rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 1.25rem;">
                <div style="width: 52px; height: 52px; border-radius: 16px; background: #ECFDF5; border: 2px solid ${RE_GREEN}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: ${RE_GREEN}; shrink-0;">
                  🏠
                </div>
                <div>
                  <div style="font-weight: 800; color: #0F172A; font-size: 1.1rem;">Gasabo Real Estate</div>
                  <div style="font-size: 0.8rem; color: ${RE_GREEN}; font-weight: 700;">✓ Verified Official Agent</div>
                </div>
              </div>

              <div style="margin-bottom: 1.5rem; space-y: 8px; font-size: 0.9rem; color: #475569;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-weight: 600;">Agent Contact:</span>
                  <strong style="color: #0F172A;">${escapeHtml(contact?.phone || '0788350555')}</strong>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-weight: 600;">Location:</span>
                  <strong style="color: #0F172A;">Kigali, Rwanda</strong>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                <a href="tel:${phoneDigits}" style="text-align: center; background: ${RE_BLUE}; color: #fff; font-weight: 800; padding: 1rem; border-radius: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.05rem; box-shadow: 0 4px 14px rgba(15,23,42,0.15); transition: transform 0.15s ease;">
                  📞 Call Agent Now
                </a>
                <a href="https://wa.me/${phoneDigits.replace('+', '')}" target="_blank" rel="noopener" style="text-align: center; background: #25D366; color: #fff; font-weight: 800; padding: 1rem; border-radius: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.05rem; box-shadow: 0 4px 14px rgba(37,211,102,0.2); transition: transform 0.15s ease;">
                  💬 Chat on WhatsApp
                </a>
                <button type="button" id="re-share-card-btn" style="text-align: center; background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; font-weight: 800; padding: 0.9rem; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1rem; transition: transform 0.15s ease;">
                  <i class="fa-solid fa-share-nodes"></i> Share Property Link
                </button>
              </div>

            </div>
          </div>

        </div>

        ${sameTypeProps.length > 0 ? `
          <!-- SIMILAR PROPERTIES IN SAME TYPE -->
          <div style="margin-top: 4rem; border-top: 1px solid #E2E8F0; padding-top: 3rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
              <div>
                <h2 style="font-size: 1.6rem; font-weight: 900; color: #0F172A; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                  <span style="width: 4px; height: 24px; background: ${RE_GREEN}; border-radius: 9999px;"></span>
                  Similar ${escapeHtml(badge.label)} Properties
                </h2>
                <p style="color: #64748B; font-size: 0.98rem; font-weight: 500;">
                  Discover other verified ${escapeHtml(badge.label.toLowerCase())} listings in Gasabo & Kigali
                </p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.75rem;">
              ${sameTypeProps.slice(0, 4).map((rel) => {
                const relBadge = TYPE_BADGE[rel.type] || TYPE_BADGE.house;
                const relPrice = formatPropPrice(rel.price);
                const photoCount = Array.isArray(rel.images) ? rel.images.length : (rel.image ? 1 : 0);
                return `
                  <div class="re-related-card" data-id="${rel.id}" role="button" tabindex="0"
                    aria-label="View details for ${escapeHtml(rel.title)}, ${escapeHtml(rel.location)}, ${escapeHtml(rel.price)}"
                    style="background: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; cursor: pointer; transition: all 0.25s ease; box-shadow: 0 4px 14px rgba(15,23,42,0.04);">
                    <div style="position: relative; height: 190px; overflow: hidden; background: #0F172A;">
                      <img src="${escapeHtml(rel.image)}" alt="${escapeHtml(rel.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                      <span style="position: absolute; top: 12px; left: 12px; background: ${relBadge.bg}; color: ${relBadge.color}; font-size: 0.68rem; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">
                        ${relBadge.label}
                      </span>
                      ${photoCount > 1 ? `
                        <span style="position: absolute; top: 12px; right: 12px; background: rgba(2,6,23,0.7); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 4px 8px; border-radius: 9999px;">📷 ${photoCount}</span>
                      ` : ''}
                    </div>
                    <div style="padding: 1.25rem;">
                      <h4 style="font-size: 1.1rem; font-weight: 800; color: #0F172A; margin-bottom: 0.35rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(rel.title)}</h4>
                      <p style="color: #64748B; font-size: 0.88rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 4px; font-weight: 500;">📍 ${escapeHtml(rel.location)}</p>
                      <div style="font-size: 1.35rem; font-weight: 900; color: ${RE_GREEN};">${escapeHtml(relPrice)}</div>
                      <div style="display: flex; gap: 1rem; border-top: 1px solid #F1F5F9; padding-top: 0.75rem; margin-top: 0.75rem; color: #475569; font-size: 0.82rem; font-weight: 600;">
                        📐 ${escapeHtml(rel.area)}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

      </div>

    </main>
  `;

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);

  const galleryMain = overlay.querySelector('#re-gallery-main');
  const counterEl = overlay.querySelector('#re-photo-counter');
  const thumbs = [...overlay.querySelectorAll('.re-gallery-thumb')];

  // Play the YouTube tour in a lightbox. videoId is the 11-char id validated on
  // the server, so the embed src is built safely from it.
  overlay.querySelector('#re-play-video-btn')?.addEventListener('click', () => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.92); display:flex; align-items:center; justify-content:center; padding:1rem;';
    box.innerHTML = `
      <button type="button" aria-label="Close video" style="position:absolute; top:18px; right:22px; width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.15); color:#fff; border:none; font-size:1.4rem; cursor:pointer; z-index:1;">✕</button>
      <div style="width:100%; max-width:960px; aspect-ratio:16/9;">
        <iframe src="https://www.youtube.com/embed/${encodeURIComponent(prop.videoId)}?autoplay=1&rel=0"
          title="${escapeHtml(prop.title)} - video tour" frameborder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen
          style="width:100%; height:100%; border:0; border-radius:12px;"></iframe>
      </div>`;
    const closeVid = () => box.remove();
    box.addEventListener('click', (e) => { if (e.target === box) closeVid(); });
    box.querySelector('button').addEventListener('click', closeVid);
    document.body.appendChild(box);
  });

  function setPhoto(i) {
    if (i < 0 || i >= galleryImages.length) return;
    activeIndex = i;
    if (galleryMain) galleryMain.src = galleryImages[i];
    if (counterEl) counterEl.textContent = `📷 ${i + 1} / ${galleryImages.length} Photos`;

    thumbs.forEach((t, n) => {
      t.style.borderColor = n === i ? RE_GREEN : 'transparent';
    });
  }

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      setPhoto(Number(thumb.dataset.index));
    });
  });

  if (galleryImages.length > 1) {
    overlay.querySelector('#re-prev-btn')?.addEventListener('click', () => {
      setPhoto((activeIndex - 1 + galleryImages.length) % galleryImages.length);
    });
    overlay.querySelector('#re-next-btn')?.addEventListener('click', () => {
      setPhoto((activeIndex + 1) % galleryImages.length);
    });

    // Touch Swipe Left/Right on Property Image
    const frame = overlay.querySelector('#re-gallery-frame');
    if (frame) {
      let startX = 0;
      let startY = 0;
      let tracking = false;

      frame.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true;
      }, { passive: true });

      frame.addEventListener('touchmove', (e) => {
        if (!tracking || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
          if (e.cancelable) e.preventDefault();
        }
      }, { passive: false });

      frame.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < 25 || Math.abs(dx) < Math.abs(dy)) return;
        const delta = dx < 0 ? 1 : -1;
        setPhoto((activeIndex + delta + galleryImages.length) % galleryImages.length);
      }, { passive: true });
    }
  }

  overlay.querySelectorAll('.re-related-card').forEach((card) => {
    const activate = () => {
      const targetId = card.dataset.id;
      // Do NOT call this modal's close() here. close() runs its onClose, which
      // is returnHome -> history.back() - that navigated away (looking like it
      // went home) and raced the route change. Just point the route at the new
      // property: main.js's syncListingModal then swaps this modal for the new
      // one (it closes the current overlay itself, without the history.back).
      // Same two lines the main property cards use.
      pushPath(pathForListing(ROUTE_PROPERTY, targetId));
      stateEngine.setRoute({ kind: ROUTE_PROPERTY, id: targetId });
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });

  // Announces the dialog, traps Tab inside it, closes on Escape, and hands
  // focus back on the way out. See components/modalA11y.js.
  const { close } = makeAccessibleModal(overlay, {
    label: `Property details: ${prop.title}`,
    onClose,
    returnFocusTo,
  });

  const doShareProperty = (returnFocusSelector) => {
    openShareModal({
      title: prop.title,
      text: `Check out "${prop.title}" (${formattedPrice}) in ${prop.location} on Gasabo Real Estate!`,
      url: pathForListing(ROUTE_PROPERTY, prop.id),
      image: galleryImages[0],
      price: prop.priceNum || prop.price,
      currency: 'Rwf',
      location: prop.location,
    }, null, returnFocusSelector);
  };

  overlay.querySelector('#re-share-head-btn')?.addEventListener('click', () => doShareProperty('#re-share-head-btn'));
  overlay.querySelector('#re-share-card-btn')?.addEventListener('click', () => doShareProperty('#re-share-card-btn'));

  overlay.querySelector('#re-modal-close').addEventListener('click', close);

  // The Gasabo logo goes to the Real Estate home page - not "back", not the
  // marketplace. Same approach as the related-property cards above: don't call
  // close() (its onClose is history.back()), just repoint the route. main.js's
  // syncListingModal sees a non-listing route and removes this overlay itself.
  overlay.querySelector('#re-detail-logo-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    pushHome();
    stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
    stateEngine.setPortal('realestate');
    stateEngine.setUI({ realEstateTab: 'home' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Returned so main.js can dismiss it when the URL changes (Back/Forward).
  return overlay;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
