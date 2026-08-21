/**
 * GASABO REAL ESTATE - Property Listings Site
 * Rebuilt to match the "gasabo_real_estate" reference mockup: a property
 * listings agency (Plots/Houses/Services/About), not a developer portfolio.
 * Ported into this app's own design system (inline styles + main.css, emoji
 * icons) rather than the mockup's Tailwind CDN + Lucide - keeps one bundled
 * CSS system instead of loading a second framework at runtime.
 */
import { stateEngine } from '../../store/stateEngine.js';
import { pushPath, pathForListing, ROUTE_PROPERTY } from '../../store/router.js';
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
    if (filters.price === 'under50') filteredProperties = filteredProperties.filter(p => p.priceNum < 50000000);
    if (filters.price === '50to100') filteredProperties = filteredProperties.filter(p => p.priceNum >= 50000000 && p.priceNum <= 100000000);
    if (filters.price === 'over100') filteredProperties = filteredProperties.filter(p => p.priceNum > 100000000);

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
        <!-- SUB-NAV: logo (home) + Plots / Houses / Services / About, matching
             the reference mockup's simpler 4-item nav (not the marketplace's
             main site nav, which stays above this). -->
        <div style="background: #ffffff; border-bottom: 1px solid #E2E8F0; padding: 0.85rem 1.5rem; margin-bottom: 0; position: sticky; top: 70px; z-index: 30;">
          <div style="max-width: var(--page-max); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div id="re-logo-home" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
              <img src="/real-estate-logo.png" alt="Gasabo Real Estate Logo" style="height: 40px; width: 40px; border-radius: 50%; object-fit: contain; border: 1px solid #E2E8F0;">
              <span style="font-weight: 800; font-size: 1.15rem; color: ${RE_BLUE};">Gasabo Real Estate</span>
            </div>

            <div style="display: flex; gap: 1.75rem; flex-wrap: wrap;">
              <button class="re-nav-link" data-tab="properties" data-type="plot" style="background: none; border: none; cursor: pointer; font-weight: 600; font-size: 0.95rem; color: ${activeTab==='properties' && filters.type==='plot' ? RE_BLUE : '#475569'};">Plots</button>
              <button class="re-nav-link" data-tab="properties" data-type="house" style="background: none; border: none; cursor: pointer; font-weight: 600; font-size: 0.95rem; color: ${activeTab==='properties' && filters.type==='house' ? RE_BLUE : '#475569'};">Houses</button>
              <button class="re-nav-link" data-tab="services" style="background: none; border: none; cursor: pointer; font-weight: 600; font-size: 0.95rem; color: ${activeTab==='services' ? RE_BLUE : '#475569'};">Services</button>
              <button class="re-nav-link" data-tab="about" style="background: none; border: none; cursor: pointer; font-weight: 600; font-size: 0.95rem; color: ${activeTab==='about' ? RE_BLUE : '#475569'};">About</button>
            </div>
          </div>
        </div>

        ${activeTab === 'home' ? renderHomeView(reData, properties) : ''}
        ${activeTab === 'properties' ? renderPropertiesView(propertiesTitle, filteredProperties, filters, availableLocations) : ''}
        ${activeTab === 'services' ? renderServicesView(reData.services || []) : ''}
        ${activeTab === 'about' ? renderAboutView(reData) : ''}
      </div>
      ${gasaboFooterHtml(reData.contact)}
    `;

    // The marketplace footer bindings and its slim sticky bar go with it.

    // Event Handlers
    container.querySelector('#re-logo-home')?.addEventListener('click', () => {
      stateEngine.setUI({ realEstateTab: 'home' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    container.querySelectorAll('.re-nav-link, .re-foot-link').forEach(btn => {
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
                  <option value="under50">Under 50,000,000 Rwf</option>
                  <option value="50to100">50M - 100M Rwf</option>
                  <option value="over100">Over 100,000,000 Rwf</option>
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
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(2,6,23,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1.5rem; overflow-y: auto;';

  const phoneDigits = (contact?.phone || '').replace(/[^\d+]/g, '');

  overlay.innerHTML = `
    <div style="background: #fff; border-radius: 20px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;">
      <button id="re-modal-close" data-modal-close aria-label="Close property details" style="position: absolute; top: 14px; right: 14px; width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.9); border: none; font-size: 1.1rem; cursor: pointer; z-index: 1;">✕</button>
      <div style="display: flex; flex-wrap: wrap;">
        <div style="flex: 1 1 380px;">
          <img src="${prop.image}" alt="${escapeHtml(prop.title)}" style="width: 100%; height: 100%; min-height: 280px; object-fit: cover;">
        </div>
        <div style="flex: 1 1 380px; padding: 2rem 2.25rem;">
          <span style="display: inline-block; background: ${badge.bg}; color: ${badge.color}; font-size: 0.72rem; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 1rem;">${badge.label}</span>
          <h2 style="font-size: 1.7rem; font-weight: 800; color: #0F172A; margin-bottom: 0.4rem;">${escapeHtml(prop.title)}</h2>
          <p style="color: #64748B; display: flex; align-items: center; gap: 4px; margin-bottom: 1rem;">📍 ${escapeHtml(prop.location)}</p>
          <div style="font-size: 1.7rem; font-weight: 800; color: ${RE_GREEN}; margin-bottom: 1.25rem;">${escapeHtml(prop.price)}</div>
          <p style="color: #334155; line-height: 1.6; border-left: 4px solid ${RE_GOLD}; padding-left: 1rem; margin-bottom: 1.5rem;">${escapeHtml(prop.description)}</p>

          <div style="background: #F8FAFC; padding: 1rem; border-radius: 14px; text-align: center; margin-bottom: 1.75rem;">
            <span style="font-size: 1.1rem; margin-right: 6px;">📐</span><strong>${escapeHtml(prop.area)}</strong>
          </div>

          <div style="display: flex; gap: 0.85rem;">
            <a href="tel:${phoneDigits}" style="flex: 1; text-align: center; background: ${RE_BLUE}; color: #fff; font-weight: 700; padding: 0.8rem; border-radius: 12px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px;">📞 Call</a>
            <a href="https://wa.me/${phoneDigits.replace('+', '')}" target="_blank" rel="noopener" style="flex: 1; text-align: center; background: #25D366; color: #fff; font-weight: 700; padding: 0.8rem; border-radius: 12px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px;">💬 WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);

  // Announces the dialog, traps Tab inside it, closes on Escape, and hands
  // focus back on the way out. See components/modalA11y.js.
  const { close } = makeAccessibleModal(overlay, {
    label: `Property details: ${prop.title}`,
    onClose,
    returnFocusTo,
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
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
