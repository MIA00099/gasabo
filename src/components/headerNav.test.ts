/**
 * The header and mobile tab bar tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderHeaderHtml } from './Header.js';

const HEADER = readFileSync('src/components/Header.js', 'utf8');
const MAIN = readFileSync('src/main.js', 'utf8');

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

  it('renders category links after Jobs, excluding those with their own item', () => {
    const html = renderHeaderHtml(ctx());
    // Electronics and Fashion have no dedicated nav item, so they appear as
    // category links; Vehicles does, so it must not be duplicated as one.
    expect(html).toContain('data-cat-id="c1"');
    expect(html).toContain('data-cat-id="c3"');
    expect(html).not.toContain('data-cat-id="c2"');
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
