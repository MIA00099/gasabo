/**
 * The homepage has to show every product, not the first five.
 *
 * It rendered `state.products.slice(0, 5)` and stopped. With eight products in
 * the database that left three with nowhere to appear, and anything a seller
 * posted after the fifth was invisible from the front page - which for a
 * marketplace is the whole point of posting it.
 *
 * Two things guarded here:
 *
 *  1. The tile is rendered from one function. It carries the discount badge,
 *     the price, the strikethrough, the stars and the like count - a second
 *     pasted copy would drift from the first the moment any of those changed,
 *     and different rows of one page would quietly disagree.
 *  2. The cards carry .view-item-btn. That class is the entire click binding;
 *     without it the cards render perfectly and do nothing when tapped, which
 *     no other test would notice.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/modules/marketplace/MarketplaceView.js', 'utf8');
// Newlines and indentation collapsed to single spaces, for assertions about
// declarations that wrap across several lines.
const FLAT = SRC.replace(/\s+/g, ' ');

describe('the product tile is written once', () => {
  it('exists as a function', () => {
    expect(SRC).toContain('function productCardHtml(prod)');
  });

  it('has only one copy of the card markup', () => {
    // The tile is identified by its full class string, not just
    // .view-item-btn - the flash-deal card and the deals modal legitimately
    // reuse .view-item-btn to link into a product, but they are different
    // components, not copies of this tile. What must not be duplicated is the
    // tile itself.
    const copies = SRC.split('shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 relative group flex flex-col view-item-btn').length - 1;
    expect(copies, 'the product card markup appears more than once').toBe(1);
  });

  it('is what every row on the homepage renders - the spotlight section, each category section, and the grid below', () => {
    const calls = SRC.split('productCardHtml(prod').length - 1;
    expect(calls, 'expected at least three rows to call it').toBeGreaterThanOrEqual(3);
  });

  it('are clickable, which means carrying the class the binding uses', () => {
    const binding = SRC.includes("querySelectorAll('.view-item-btn')");
    expect(binding, 'the .view-item-btn click binding is gone').toBe(true);
    const fn = SRC.slice(SRC.indexOf('function productCardHtml'), SRC.indexOf('// Grey circles'));
    expect(fn, 'the shared tile must carry .view-item-btn').toContain('view-item-btn');
  });

  it('lazy-loads the images, since they start below the fold', () => {
    const fn = SRC.slice(SRC.indexOf('function productCardHtml'), SRC.indexOf('// Grey circles'));
    expect(fn).toContain('loading="lazy"');
  });
});

/**
 * Featured & Trending is a full section - styled exactly like a category
 * section (colored bar, bold title, count badge, scroll arrows, one
 * horizontally-scrolling row), holding every flagged listing rather than a
 * fixed-size row of five.
 *
 * It used to be state.products.slice(0, 5), rendered as five compact cards
 * squeezed beside the Flash Deals card with no heading of its own - so
 * isFeatured and isTrending put a badge on the tile and changed nothing a
 * reader could see about where the listing actually appeared, and there was
 * no way to see everything flagged, only the first five in whatever order
 * the API happened to return.
 */
describe('the Featured & Trending section', () => {
  it('filters on the two flags, not on recency', () => {
    expect(SRC).toContain('state.products.filter((p) => p.isFeatured || p.isTrending)');
  });

  it('is uncapped - every flagged listing, not just the first few', () => {
    const decl = SRC.slice(SRC.indexOf('const spotlightProducts'), SRC.indexOf('const spotlightIds'));
    expect(decl, 'the spotlight section must not slice its product list').not.toMatch(/\.slice\(/);
  });

  it('renders as its own section, not squeezed beside the Flash Deals card', () => {
    // Flash Deals gets its own <section>...</section>, and the spotlight
    // section starts only after that one has already closed.
    const flashOpen = SRC.indexOf('id="flash-deals-card"');
    const flashSectionEnd = SRC.indexOf('</section>', flashOpen);
    const spotlightStart = SRC.indexOf('spotlightProducts.length > 0 ?');
    expect(flashOpen).toBeGreaterThan(-1);
    expect(spotlightStart, 'the spotlight section must come after Flash Deals closes').toBeGreaterThan(flashSectionEnd);
  });

  it('carries the same section-header treatment as a category section: a colored bar, a bold title, and a count pill', () => {
    const section = SRC.slice(SRC.indexOf('spotlightProducts.length > 0 ?'), SRC.indexOf('id="spotlight-row"'));
    expect(section).toContain('rounded-full inline-block');
    expect(section).toContain('font-black text-gray-900');
    expect(section).toContain('${spotlightProducts.length}');
  });

  it('scrolls horizontally with arrows, same as a category section', () => {
    const section = SRC.slice(SRC.indexOf('spotlightProducts.length > 0 ?'), SRC.indexOf('</section>', SRC.indexOf('id="spotlight-row"')));
    expect(section).toContain('section-scroll-btn');
    expect(section, 'must be a scrolling row, not a wrapping grid').toContain('overflow-x-auto');
    expect(section).not.toContain('grid grid-cols');
  });

  it('is simply absent when nothing is flagged - no placeholder message, same as an empty category', () => {
    // Falling back to a "nothing here" message (or worse, to ordinary
    // listings) is what made the flags meaningless in the first place.
    expect(SRC, 'no leftover empty-state copy for the spotlight section').not.toContain('ui_no_spotlight');
    // The whole thing is one ternary chain: loading -> has-flagged-products ->
    // otherwise nothing. Its final branch must be the empty string, not a
    // rendered message.
    const chainStart = SRC.indexOf('productsLoading && state.products.length === 0 ?');
    const chainEnd = SRC.indexOf('\n\n            <!-- Everything not in the Featured');
    const chain = SRC.slice(chainStart, chainEnd);
    expect(chain).toContain('spotlightProducts.length > 0 ?');
    expect(chain.trim().endsWith("` : ''}"), 'must fall through to an empty string, not a message').toBe(true);
  });

  it('shows a loading state only before any product has ever loaded', () => {
    expect(SRC).toContain('productsLoading && state.products.length === 0 ?');
  });
});

/**
 * A listing must appear in exactly one place: its own spotlight section if
 * flagged, or its category section otherwise - never both.
 */
describe('spotlight and category sections do not duplicate listings', () => {
  it('excludes spotlight ids from everything below, by id rather than by position', () => {
    // By id: the spotlight draws flagged listings from anywhere in the list,
    // so excluding "the first N" by index could still print one twice.
    expect(FLAT, 'the catch-all list must drop the spotlight ids').toContain(
      'const moreProducts = state.products .filter((p) => !spotlightIds.has(p.id))',
    );
  });

  it('keeps a sane ceiling on the catch-all grid below the sections', () => {
    const more = Number(SRC.match(/^const HOME_MAX_MORE = (\d+);/m)![1]);
    expect(more).toBeGreaterThanOrEqual(5);
    expect(more).toBeLessThanOrEqual(40);
  });

  it('category sections only render when there is something left to group', () => {
    expect(SRC).toContain('moreProducts.length > 0 ?');
  });

  it('the catch-all grid stacks under each other rather than scrolling sideways', () => {
    const section = SRC.slice(SRC.indexOf("t('ui_more_products')"));
    const grid = section.slice(0, section.indexOf('</section>'));
    expect(grid).toMatch(/grid grid-cols-2 md:grid-cols-\d lg:grid-cols-\d/);
    expect(grid, 'the catch-all grid must not be a sideways rail').not.toContain('overflow-x-auto');
  });

  it('offers a way through to the full catalog, counting from what actually rendered', () => {
    expect(SRC).toContain('id="home-view-all-btn"');
    expect(SRC).toContain("'#home-view-all-btn, #home-view-all-btn-2'");
    // The spotlight section can hold anywhere from zero to every flagged
    // listing now, so the second button's gate has to add both counts rather
    // than assume a fixed-size top row.
    expect(SRC).toContain('state.products.length > spotlightProducts.length + moreProducts.length ?');
  });
});
