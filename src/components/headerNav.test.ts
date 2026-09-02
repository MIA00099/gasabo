/**
 * The header and mobile tab bar tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderHeaderHtml } from './Header.js';

const HEADER = readFileSync('src/components/Header.js', 'utf8');
const MAIN = readFileSync('src/main.js', 'utf8');
const CSS = readFileSync('src/styles/main.css', 'utf8');
const REAL_ESTATE_VIEW = readFileSync('src/modules/realestate/RealEstateView.js', 'utf8');

/** A representative ctx, matching what main.js passes renderHeaderHtml. */
function ctx(overrides = {}) {
  return {
    activePortal: 'marketplace',
    currentUser: { role: 'guest', name: 'Guest', permissions: {} },
    currentLang: 'en',
    showAccountChip: false,
    showNotifBell: false,
    unreadNotifCount: 0,
    notifications: [],
    notifDropdownOpen: false,
    categories: [
      { id: 'c1', name: 'Electronics & Tech' },
      { id: 'c2', name: 'Vehicles & Automotive' },
      { id: 'c3', name: 'Fashion & Handcrafts' },
    ],
    selectedCategory: 'all',
    ...overrides,
  };
}

/**
 * Render the header for real, not just scan its source.
 *
 * A source-regex test cannot catch a variable used in the markup but never
 * declared - which is exactly what happened: `extraCategories` was referenced
 * in the nav and never defined, the ReferenceError threw during render, and
 * the whole app was left on its loading screen in production. Calling the
 * function is what catches that class of bug.
 */
describe('renderHeaderHtml does not throw', () => {
  it('renders the marketplace header to a non-empty string', () => {
    const html = renderHeaderHtml(ctx());
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(100);
  });

  it('renders the categories into the fill lane, excluding fixed-nav ones', () => {
    // Categories fill the middle lane as chips; the fitNavCategories pass then
    // hides whatever does not fit (runtime, needs layout - not testable here).
    // Vehicles has its own fixed item, so it must not also appear as a chip.
    const html = renderHeaderHtml(ctx());
    const lane = html.slice(html.indexOf('nav-cat-fill'), html.indexOf('id="nav-link-more"'));
    expect(lane).toContain('data-cat-id="c1"'); // Electronics - no fixed item
    expect(lane).toContain('data-cat-id="c3"'); // Fashion - no fixed item
    expect(lane).not.toContain('data-cat-id="c2"'); // Vehicles - has a fixed item
  });

  it('gives the fill lane overflow-hidden, not scroll', () => {
    // The chips are clipped and the overflow moved to More - the lane must not
    // scroll, or the "show the rest in More" behaviour becomes "scroll to see
    // the rest" instead.
    const html = renderHeaderHtml(ctx());
    expect(html).toMatch(/nav-cat-fill[^"]*flex-1 min-w-0 overflow-hidden/);
  });

  it('keeps More and Post an Ad in a shrink-0 group that cannot be pushed off', () => {
    // The requirement: More and Post an Ad always visible on the far right.
    // The fixed-left group hides links as needed; the right group is shrink-0
    // and outside both fit lanes, so nothing can push these off-screen.
    const html = renderHeaderHtml(ctx());
    const rightGroup = html.slice(html.indexOf('id="nav-link-more"') - 200, html.indexOf('id="header-post-ad-btn"') + 200);
    expect(html).toContain('nav-right-group');
    expect(rightGroup).toContain('id="nav-link-more"');
    expect(rightGroup).toContain('id="header-post-ad-btn"');
    expect(html).toMatch(/nav-left-group[^"]*min-w-0 overflow-hidden/);
  });

  it('hides the responsive fit pass so the nav does not visibly shake on render', () => {
    const html = renderHeaderHtml(ctx());
    expect(html).toContain('data-fit-pending="true"');
    expect(HEADER).toContain("removeAttribute('data-fit-pending')");
    expect(CSS).toMatch(/\.nav-responsive-row\[data-fit-pending="true"\][\s\S]*opacity:\s*0/);
  });

  it('marks fixed nav links as fit-aware items', () => {
    const html = renderHeaderHtml(ctx());
    for (const action of ['home', 'stores', 'vehicles', 'realestate', 'services', 'jobs']) {
      expect(html, `${action} should be collapsible into More`).toContain(`data-nav-action="${action}"`);
    }
    expect(HEADER).toContain('item.getBoundingClientRect().right > leftRight + 1');
  });

  it('puts hidden fixed links into the More menu', () => {
    expect(MAIN).toContain(".nav-fixed-item[hidden]");
    expect(MAIN).toContain('prefixItems');
    for (const id of ['__home', '__stores', '__vehicles', '__realestate', '__services', '__jobs']) {
      expect(MAIN).toContain(id);
    }
  });

  it('shortens the nav labels on narrow screens', () => {
    expect(CSS).toMatch(/@media \(max-width: 520px\)[\s\S]*#nav-all-categories-2 \.nav-allcats-label[\s\S]*display:\s*none/);
    expect(CSS).toMatch(/@media \(max-width: 380px\)[\s\S]*#header-post-ad-btn \.nav-post-label[\s\S]*display:\s*none/);
  });

  it('survives an empty ctx the way a cold load hands it', () => {
    // categories/selectedCategory default, so a header rendered before the
    // categories load must not throw.
    expect(() => renderHeaderHtml(ctx({ categories: undefined, selectedCategory: undefined }))).not.toThrow();
  });

  it('renders the real-estate header without category links', () => {
    const html = renderHeaderHtml(ctx({ activePortal: 'realestate' }));
    expect(typeof html).toBe('string');
    expect(html).not.toContain('nav-category-item');
  });
});

const markup = (src: string) => src.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*(\/\/|\*|\/\*).*$/gm, '');

describe('the Post an Ad button', () => {
  it('wears its intended colour without being hovered', () => {
    const tag = HEADER.match(/<button[^>]*id="header-post-ad-btn"[\s\S]{0,300}?>/);
    expect(tag, 'the Post an Ad button moved').toBeTruthy();
    expect(tag![0], 'resting colour').toContain('bg-orange-500');
    expect(tag![0], 'hover colour').toContain('hover:bg-brand-orange');
  });
});

describe('the Gasabo Real Estate top nav', () => {
  it('stays pinned while the Real Estate portal scrolls', () => {
    expect(CSS).toMatch(/\.top-nav\s*\{[\s\S]*position:\s*sticky/);
    expect(CSS).toMatch(/\.top-nav\s*\{[\s\S]*top:\s*6px/);
    expect(CSS).toMatch(/\.top-nav\s*\{[\s\S]*z-index:\s*980/);
  });

  it('puts the right-side controls under a class so responsive CSS can manage them', () => {
    expect(REAL_ESTATE_VIEW).toContain('class="re-header-actions"');
    expect(REAL_ESTATE_VIEW).toContain('class="re-header-divider"');
  });

  it('keeps the portal links available on phones instead of hiding them', () => {
    const phoneGasaboCss = CSS.slice(
      CSS.indexOf('@media (max-width: 750px)'),
      CSS.indexOf('@media (max-width: 430px)'),
    );
    const phoneNavLinksRule = phoneGasaboCss.match(/\.top-nav \.nav-links\s*\{[\s\S]*?\}/)?.[0] || '';

    expect(CSS).toMatch(/@media \(max-width: 750px\)[\s\S]*\.top-nav[\s\S]*display:\s*grid/);
    expect(CSS).toMatch(/@media \(max-width: 750px\)[\s\S]*\.top-nav \.nav-left[\s\S]*display:\s*contents/);
    expect(CSS).toMatch(/@media \(max-width: 750px\)[\s\S]*\.top-nav \.nav-links[\s\S]*overflow-x:\s*auto/);
    expect(phoneNavLinksRule).toContain('display: flex');
    expect(phoneNavLinksRule).not.toContain('display: none');
  });

  it('drops social icons before tablet widths so the market link is not squeezed', () => {
    expect(CSS).toMatch(/@media \(max-width: 1060px\)[\s\S]*\.top-nav \.re-header-social[\s\S]*display:\s*none !important/);
    expect(CSS).toMatch(/@media \(max-width: 1060px\)[\s\S]*\.top-nav \.re-header-divider[\s\S]*display:\s*none !important/);
  });
});

describe('a signed-in person is never offered a sign-up form', () => {
  it('routes Post an Ad and the account tab by role', () => {
    expect(MAIN).toContain('function goAccountOrSignup()');
    expect(MAIN).toContain('stateEngine.routeToDashboard()');
  });

  it('gives them a way back to their own dashboard from the shop', () => {
    expect(markup(HEADER)).toContain('id="header-dashboard-btn"');
    expect(HEADER).toContain("on('#header-dashboard-btn', 'click', goDashboard)");
    expect(MAIN).toContain('goDashboard: () => stateEngine.routeToDashboard()');
  });

  it('binds logo in Footer to return home', () => {
    const FOOTER = readFileSync('src/components/Footer.js', 'utf8');
    expect(FOOTER).toContain('id="foot-brand-home"');
    expect(FOOTER).toContain('pushHome()');
    expect(FOOTER).toContain("stateEngine.setPortal('marketplace')");
  });

  it('adds Help Center and FAQ links to the marketplace footer', () => {
    const FOOTER = readFileSync('src/components/Footer.js', 'utf8');
    const marketFooterStart = FOOTER.indexOf('<footer class="large-footer" id="market-footer">');
    const helpColumnStart = FOOTER.indexOf('<h4 class="footer-col-title">Help</h4>', marketFooterStart);
    const sellColumnStart = FOOTER.indexOf('<h4 class="footer-col-title">Sell</h4>', marketFooterStart);
    const bottomLinksStart = FOOTER.indexOf('<div class="footer-bottom-links">', marketFooterStart);

    expect(markup(FOOTER)).toContain('id="mfoot-help"');
    expect(markup(FOOTER)).toContain('Help Center');
    expect(markup(FOOTER)).toContain('id="mfoot-faqs"');
    expect(markup(FOOTER)).toContain('FAQs');
    expect(markup(FOOTER)).toContain('id="mfoot-contact"');
    expect(marketFooterStart).toBeGreaterThan(-1);
    expect(helpColumnStart).toBeGreaterThan(-1);
    expect(helpColumnStart).toBeLessThan(sellColumnStart);
    expect(FOOTER.slice(helpColumnStart, sellColumnStart)).toContain('id="mfoot-help"');
    expect(FOOTER.slice(helpColumnStart, sellColumnStart)).toContain('id="mfoot-faqs"');
    expect(FOOTER.slice(helpColumnStart, sellColumnStart)).toContain('id="mfoot-contact"');
    expect(FOOTER.slice(bottomLinksStart)).not.toContain('id="mfoot-help"');
    expect(FOOTER.slice(bottomLinksStart)).not.toContain('id="mfoot-faqs"');
    expect(FOOTER).toContain('handlers.goHelp');
    expect(FOOTER).toContain('handlers.goFaqs');
    expect(FOOTER).toContain('handlers.goContact');
  });

  it('wires the footer bottom bar to the About, Terms and Privacy pages', () => {
    const FOOTER = readFileSync('src/components/Footer.js', 'utf8');
    const marketFooterStart = FOOTER.indexOf('<footer class="large-footer" id="market-footer">');
    const bottomLinksStart = FOOTER.indexOf('<div class="footer-bottom-links">', marketFooterStart);
    const bottomBar = FOOTER.slice(bottomLinksStart, FOOTER.indexOf('</div>', bottomLinksStart));

    expect(bottomBar).toContain('id="mfoot-about"');
    expect(bottomBar).toContain('href="/about"');
    expect(bottomBar).toContain('id="mfoot-terms"');
    expect(bottomBar).toContain('href="/terms"');
    expect(bottomBar).toContain('id="mfoot-privacy"');
    expect(bottomBar).toContain('href="/privacy"');
    expect(FOOTER).toContain('handlers.goAbout');
    expect(FOOTER).toContain('handlers.goTerms');
    expect(FOOTER).toContain('handlers.goPrivacy');
  });

  it('resets route on header and mobile navigation links', () => {
    expect(MAIN).toContain('goStores: () =>');
    expect(MAIN).toContain('goVehicles: () =>');
    expect(MAIN).toContain('goRealEstateCategory: () =>');
    expect(MAIN).toContain('goServices: () =>');
    expect(MAIN).toContain('goJobs: () =>');
    const STATE_ENGINE = readFileSync('src/store/stateEngine.js', 'utf8');
    expect(STATE_ENGINE).toContain("if (portalName !== 'marketplace' && this.data.route?.kind === ROUTE_PRODUCT)");
  });
});
