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
  return `
    <footer style="background: ${RE_BLUE}; color: #fff; padding: 2.5rem 1.5rem 1.75rem;">
      <div style="max-width: var(--page-max); margin: 0 auto; display: flex; flex-wrap: wrap; gap: 2.5rem; justify-content: space-between;">

        <div style="min-width: 240px; flex: 1;">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem;">
            <img src="/real-estate-logo.png" alt="" style="height: 40px; width: 40px; border-radius: 50%; object-fit: contain; background: #fff;">
            <span style="font-weight: 800; font-size: 1.15rem;">Gasabo Real Estate</span>
          </div>
          <p style="color: #C7D7F5; font-size: 0.9rem; line-height: 1.6; max-width: 34ch;">
            Plots, houses and property services across Gasabo District and greater Kigali.
          </p>
        </div>

        <div style="min-width: 170px;">
          <h4 style="font-weight: 700; font-size: 1rem; margin-bottom: 0.85rem;">Browse</h4>
          <div style="display: flex; flex-direction: column; gap: 0.6rem;">
            <button class="re-foot-link" data-tab="properties" data-type="plot" style="background: none; border: none; padding: 0; text-align: left; color: #C7D7F5; font-size: 0.9rem; cursor: pointer;">Plots</button>
            <button class="re-foot-link" data-tab="properties" data-type="house" style="background: none; border: none; padding: 0; text-align: left; color: #C7D7F5; font-size: 0.9rem; cursor: pointer;">Houses</button>
            <button class="re-foot-link" data-tab="services" style="background: none; border: none; padding: 0; text-align: left; color: #C7D7F5; font-size: 0.9rem; cursor: pointer;">Services</button>
            <button class="re-foot-link" data-tab="about" style="background: none; border: none; padding: 0; text-align: left; color: #C7D7F5; font-size: 0.9rem; cursor: pointer;">About</button>
          </div>
        </div>

        <div style="min-width: 220px;">
          <h4 style="font-weight: 700; font-size: 1rem; margin-bottom: 0.85rem;">Contact</h4>
          <div style="display: flex; flex-direction: column; gap: 0.6rem; color: #C7D7F5; font-size: 0.9rem;">
            ${c.address ? `<span>${escapeHtml(c.address)}</span>` : ''}
            ${c.phone ? `<a href="tel:${escapeHtml(String(c.phone).replace(/\s+/g, ''))}" style="color: #fff; font-weight: 700; text-decoration: none;">${escapeHtml(c.phone)}</a>` : ''}
            ${c.email ? `<a href="mailto:${escapeHtml(c.email)}" style="color: #C7D7F5; text-decoration: none;">${escapeHtml(c.email)}</a>` : ''}
          </div>
        </div>
      </div>

      <div style="max-width: var(--page-max); margin: 1.75rem auto 0; padding-top: 1.25rem; border-top: 1px solid rgba(255,255,255,0.18); color: #A9BFE8; font-size: 0.8rem;">
        &copy; ${new Date().getFullYear()} Gasabo Real Estate. All rights reserved.
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
                <span class="icon">&#9831;</span>
                <span>Plots</span>
                <span class="arrow">&#8964;</span>
              </a>

              <!-- HOUSES -->
              <a href="#" class="nav-item re-nav-item" data-nav="house" aria-haspopup="menu" aria-expanded="false">
                <span class="icon">&#8962;</span>
                <span>Houses</span>
                <span class="arrow">&#8964;</span>
              </a>

              <!-- SERVICES -->
              <a href="#" class="nav-item re-nav-item" data-nav="services" aria-haspopup="menu" aria-expanded="false">
                <span class="icon">&#9635;</span>
                <span>Services</span>
                <span class="arrow">&#8964;</span>
              </a>

              <!-- ABOUT -->
              <a href="#" class="nav-item re-nav-item" data-nav="about">
                <span class="info-icon">i</span>
                <span>About</span>
              </a>

            </div>

          </div>

          <!-- KIGALI MARKET -->
          <a href="#" class="market-link" id="re-back-to-market-nav">
            <span class="back-arrow">&#8592;</span>
            <span>Kigali Market</span>
          </a>

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

    container.querySelector('#re-explore-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ realEstateTab: 'properties', realEstateFilters: { type: 'all', location: 'all', price: 'all' } });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    container.querySelector('#re-inquiry-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Thank you for contacting Gasabo Real Estate! Our team will call you back shortly.');
      e.target.reset();
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
        <img src="${reData.hero.bgImage}" alt="Gasabo Real Estate" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.55;">
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
  return `
    <!-- ABOUT HERO -->
    <section style="padding: 4rem 1.5rem; background: ${RE_BLUE}; color: #fff; text-align: center;">
      <h1 style="font-size: 2.4rem; font-weight: 800; margin-bottom: 0.75rem;">${escapeHtml(reData.about.heading)}</h1>
      <p style="font-size: 1.15rem; color: #cbd5e1; max-width: 700px; margin: 0 auto;">${escapeHtml(reData.about.text)}</p>
    </section>

    <section style="padding: 3.5rem 1.5rem; background: #ffffff;">
      <div style="max-width: var(--page-max); margin: 0 auto;">

        <!-- VIDEO TOURS CTA -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 2.5rem; background: #F8FAFC; padding: 2.5rem; border-radius: 24px; margin-bottom: 3.5rem;">
          <div style="flex: 1 1 340px;">
            <h2 style="font-size: 1.7rem; font-weight: 800; color: #0F172A; margin-bottom: 1rem;">See Properties in Full Detail</h2>
            <p style="color: #64748B; font-size: 1.02rem; margin-bottom: 1.5rem; line-height: 1.6;">
              We pride ourselves on our robust marketing services. Subscribe to our YouTube channel to get comprehensive video walk-throughs of houses, plots, and commercial spaces before you even visit.
            </p>
            <a href="https://www.youtube.com/@GasaboRealEstate" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 0.6rem; background: #FF0000; color: #fff; font-weight: 700; padding: 0.9rem 1.75rem; border-radius: 9999px; text-decoration: none; font-size: 1rem;">
              ▶️ Watch Our Tours
            </a>
          </div>
          <div style="flex: 1 1 340px;">
            <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80" alt="Video Tours" style="width: 100%; border-radius: 18px; box-shadow: var(--shadow-soft-md);">
          </div>
        </div>

        <!-- TESTIMONIALS -->
        <div style="text-align: center; margin-bottom: 2rem;">
          <h2 style="font-size: 1.9rem; font-weight: 800; color: #0F172A;">What Our Clients Say</h2>
        </div>
        <div class="grid-2" style="gap: 1.5rem; margin-bottom: 3.5rem;">
          ${TESTIMONIALS.map(t => `
            <div style="background: #F8FAFC; padding: 1.75rem; border-radius: 18px; border: 1px solid #E2E8F0;">
              <div style="color: ${RE_GOLD}; margin-bottom: 0.75rem; font-size: 1.1rem;">★★★★★</div>
              <p style="color: #475569; font-style: italic; margin-bottom: 1rem; line-height: 1.6;">"${escapeHtml(t.quote)}"</p>
              <h4 style="font-weight: 700; color: #0F172A;">${escapeHtml(t.name)}</h4>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- CONTACT -->
    <section style="padding: 3.5rem 1.5rem; background: #F8FAFC; border-top: 1px solid #E2E8F0;">
      <div style="max-width: var(--page-max); margin: 0 auto; display: flex; flex-wrap: wrap; gap: 3rem;">
        <div style="flex: 1 1 300px;">
          <h3 style="font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-bottom: 0.75rem;">Contact Us</h3>
          <p style="color: #64748B; margin-bottom: 1.75rem;">Ready to find your dream property? Reach out to our expert agents today.</p>
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 46px; height: 46px; border-radius: 50%; background: #fff; box-shadow: var(--shadow-soft-sm); display: flex; align-items: center; justify-content: center; color: ${RE_BLUE}; font-size: 1.2rem;">📞</div>
              <div>
                <div style="font-weight: 700; color: #0F172A;">Call / WhatsApp</div>
                <div style="color: #64748B;">${escapeHtml(reData.contact.phone)}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 46px; height: 46px; border-radius: 50%; background: #fff; box-shadow: var(--shadow-soft-sm); display: flex; align-items: center; justify-content: center; color: ${RE_BLUE}; font-size: 1.2rem;">✉️</div>
              <div>
                <div style="font-weight: 700; color: #0F172A;">Email</div>
                <div style="color: #64748B;">${escapeHtml(reData.contact.email)}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 46px; height: 46px; border-radius: 50%; background: #fff; box-shadow: var(--shadow-soft-sm); display: flex; align-items: center; justify-content: center; color: ${RE_BLUE}; font-size: 1.2rem;">📍</div>
              <div>
                <div style="font-weight: 700; color: #0F172A;">Office</div>
                <div style="color: #64748B;">${escapeHtml(reData.contact.address)}</div>
              </div>
            </div>
          </div>
        </div>

        <form id="re-inquiry-form" style="flex: 2 1 480px; background: #fff; padding: 2rem; border-radius: 24px; box-shadow: var(--shadow-soft-md); border: 1px solid #E2E8F0;">
          <div class="grid-2" style="gap: 1.25rem; margin-bottom: 1.25rem;">
            <div class="form-group">
              <label>Name</label>
              <input type="text" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="form-control" required>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label>Message</label>
            <textarea rows="4" class="form-control" required></textarea>
          </div>
          <button type="submit" style="background: ${RE_GREEN}; color: #fff; font-weight: 700; padding: 0.85rem 2rem; border: none; border-radius: 10px; cursor: pointer; font-size: 0.98rem;">
            Send Message →
          </button>
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
              <img src="${prop.image}" alt="${escapeHtml(prop.title)}" style="width: 100%; height: 100%; object-fit: cover;">
              <span style="position: absolute; top: 14px; left: 14px; background: ${badge.bg}; color: ${badge.color}; font-size: 0.7rem; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.04em;">
                ${badge.label}
              </span>
              ${photoCount > 1 ? `
                <span style="position: absolute; top: 14px; right: 14px; background: rgba(2,6,23,0.7); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: flex; align-items: center; gap: 4px;">📷 ${photoCount}</span>
              ` : ''}
            </div>
            <div style="padding: 1.5rem;">
              <h4 style="font-size: 1.15rem; font-weight: 700; color: #0F172A; margin-bottom: 0.4rem;">${escapeHtml(prop.title)}</h4>
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

// Exported so main.js can open it in response to a /property/:id URL, not
// only from a card click - a visitor landing on that link directly must get
// the same detail view.
export function openPropertyModal(prop, contact, onClose, returnFocusTo) {
  const badge = TYPE_BADGE[prop.type] || TYPE_BADGE.house;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; width: 100vw; height: 100vh; background: #F8FAFC; z-index: 9999; overflow-y: auto; display: flex; flex-direction: column;';

  const phoneDigits = (contact?.phone || '').replace(/[^\d+]/g, '');

  // A property carries a gallery now; older listings only have the single
  // `image`, so fall back to that. The first photo is the cover shown large.
  const galleryImages = Array.isArray(prop.images) && prop.images.length ? prop.images : [prop.image];
  let activeIndex = 0;

  overlay.innerHTML = `
    <!-- FULL PAGE STICKY HEADER -->
    <header style="position: sticky; top: 0; z-index: 100; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #E2E8F0; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
      <button id="re-modal-close" data-modal-close aria-label="Back to properties"
        style="display: flex; align-items: center; gap: 8px; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 0.5rem 1.1rem; border-radius: 9999px; font-weight: 700; color: #0F172A; cursor: pointer; font-size: 0.9rem; transition: all 0.2s ease;">
        ← Back to Properties
      </button>

      <div style="display: flex; align-items: center; gap: 8px;">
        <a href="tel:${phoneDigits}" style="background: ${RE_BLUE}; color: #fff; font-weight: 700; padding: 0.45rem 1rem; border-radius: 9999px; text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 4px;">
          📞 Call
        </a>
        <a href="https://wa.me/${phoneDigits.replace('+', '')}" target="_blank" rel="noopener" style="background: #25D366; color: #fff; font-weight: 700; padding: 0.45rem 1rem; border-radius: 9999px; text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 4px;">
          💬 WhatsApp
        </a>
      </div>
    </header>

    <!-- FULL PAGE MAIN CONTENT -->
    <main style="flex: 1; width: 100%;">

      <!-- FULL WIDTH HERO IMAGE SHOWCASE (UNCROPPED) -->
      <div id="re-gallery-frame" style="position: relative; width: 100%; max-height: 65vh; min-height: 320px; background: #0F172A; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none;">
        <img id="re-gallery-main" src="${escapeHtml(galleryImages[0])}" alt="${escapeHtml(prop.title)}" style="max-width: 100%; max-height: 65vh; object-fit: contain; width: auto; height: auto; display: block; margin: auto;">

        ${galleryImages.length > 1 ? `
          <!-- Left/Right Navigation Arrows -->
          <button type="button" id="re-prev-btn" aria-label="Previous photo"
            style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); z-index: 20; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.9); border: none; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">❮</button>
          <button type="button" id="re-next-btn" aria-label="Next photo"
            style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); z-index: 20; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.9); border: none; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">❯</button>

          <!-- Photo Counter -->
          <span id="re-photo-counter" style="position: absolute; bottom: 16px; left: 20px; z-index: 20; background: rgba(0,0,0,0.7); color: #fff; font-size: 0.85rem; font-weight: 700; padding: 6px 14px; border-radius: 9999px; backdrop-filter: blur(4px);">1 / ${galleryImages.length}</span>
        ` : ''}
      </div>

      ${galleryImages.length > 1 ? `
        <!-- Thumbnail Strip -->
        <div style="background: #1E293B; padding: 12px 1.5rem; border-bottom: 1px solid #334155;">
          <div style="max-width: 1000px; margin: 0 auto; display: flex; gap: 10px; overflow-x: auto;">
            ${galleryImages.map((u, i) => `
              <button type="button" class="re-gallery-thumb" data-index="${i}" aria-label="View photo ${i + 1} of ${galleryImages.length}"
                style="width: 70px; height: 70px; border-radius: 12px; overflow: hidden; border: 3px solid ${i === 0 ? RE_GREEN : 'transparent'}; padding: 0; cursor: pointer; background: #0F172A; flex-shrink: 0; transition: transform 0.15s ease;">
                <img src="${escapeHtml(u)}" alt="" style="width: 100%; height: 100%; object-fit: cover;">
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- PROPERTY DETAILS CONTAINER UNDER IMAGE -->
      <div style="max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem 4rem;">
        <div style="background: #fff; border-radius: 24px; padding: 2rem; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">

          <span style="display: inline-block; background: ${badge.bg}; color: ${badge.color}; font-size: 0.75rem; font-weight: 800; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 1rem;">${badge.label}</span>

          <h1 style="font-size: 2.2rem; font-weight: 800; color: #0F172A; margin-bottom: 0.5rem; line-height: 1.2;">${escapeHtml(prop.title)}</h1>

          <p style="color: #64748B; font-size: 1.05rem; display: flex; align-items: center; gap: 6px; margin-bottom: 1.25rem; font-weight: 500;">
            📍 ${escapeHtml(prop.location)}
          </p>

          <div style="font-size: 2.2rem; font-weight: 900; color: ${RE_GREEN}; margin-bottom: 1.75rem;">${escapeHtml(prop.price)}</div>

          <!-- Description Box -->
          <div style="background: #F8FAFC; border-radius: 18px; padding: 1.5rem; border-left: 5px solid ${RE_GOLD}; margin-bottom: 2rem; border-top: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin-bottom: 0.75rem;">Property Description</h3>
            <div style="color: #334155; line-height: 1.75; font-size: 1rem; white-space: pre-line;">${escapeHtml(prop.description)}</div>
          </div>

          <!-- Features / Specs -->
          <div style="background: #F8FAFC; padding: 1.25rem; border-radius: 18px; text-align: center; margin-bottom: 2rem; border: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 1.1rem;">
            <span style="font-size: 1.3rem;">📐</span>
            <span style="color: #0F172A; font-weight: 700;">Property Size / Area:</span>
            <strong style="color: ${RE_BLUE};">${escapeHtml(prop.area)}</strong>
          </div>

          <!-- Contact Buttons -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <a href="tel:${phoneDigits}" style="text-align: center; background: ${RE_BLUE}; color: #fff; font-weight: 800; padding: 1rem; border-radius: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.05rem; box-shadow: 0 4px 12px rgba(15,23,42,0.15);">
              📞 Call Agent Now
            </a>
            <a href="https://wa.me/${phoneDigits.replace('+', '')}" target="_blank" rel="noopener" style="text-align: center; background: #25D366; color: #fff; font-weight: 800; padding: 1rem; border-radius: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.05rem; box-shadow: 0 4px 12px rgba(37,211,102,0.2);">
              💬 Chat on WhatsApp
            </a>
          </div>

        </div>
      </div>

    </main>
  `;

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);

  const galleryMain = overlay.querySelector('#re-gallery-main');
  const counterEl = overlay.querySelector('#re-photo-counter');
  const thumbs = [...overlay.querySelectorAll('.re-gallery-thumb')];

  function setPhoto(i) {
    if (i < 0 || i >= galleryImages.length) return;
    activeIndex = i;
    if (galleryMain) galleryMain.src = galleryImages[i];
    if (counterEl) counterEl.textContent = `${i + 1} / ${galleryImages.length}`;

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

  // Announces the dialog, traps Tab inside it, closes on Escape, and hands
  // focus back on the way out. See components/modalA11y.js.
  const { close } = makeAccessibleModal(overlay, {
    label: `Property details: ${prop.title}`,
    onClose,
    returnFocusTo,
  });

  overlay.querySelector('#re-modal-close').addEventListener('click', close);

  // Returned so main.js can dismiss it when the URL changes (Back/Forward).
  return overlay;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
