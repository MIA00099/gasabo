/**
 * The homepage has to show every product, not the first five.
 *
 * It rendered `state.products.slice(0, 5)` and stopped. With eight products in
 * the database that left three with nowhere to appear, and anything a seller
 * posted after the fifth was invisible from the front page - which for a
 * marketplace is the whole point of posting it.
 *
 * The top row keeps its five beside the Flash Deals card, because that layout
 * was delivered as a unit. Everything else continues in a grid underneath.
 *
 * Two things guarded here:
 *
 *  1. The tile is rendered from one function. It carries the discount badge,
 *     the price, the strikethrough, the stars and the like count - a second
 *     pasted copy would drift from the first the moment any of those changed,
 *     and the two halves of one page would quietly disagree.
 *  2. The cards in the lower grid carry .view-item-btn. That class is the
 *     entire click binding; without it the cards render perfectly and do
 *     nothing when tapped, which no other test would notice.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/modules/marketplace/MarketplaceView.js', 'utf8');
// Newlines and indentation collapsed to single spaces, for the assertions
// about declarations that wrap across several lines.
const FLAT = SRC.replace(/\s+/g, ' ');

describe('the product tile is written once', () => {
  it('exists as a function', () => {
    expect(SRC).toContain('function productCardHtml(prod');
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

  it('is what both grids render', () => {
    const calls = SRC.split('productCardHtml(prod').length - 1;
    expect(calls, 'expected the top row and the grid below to both call it').toBeGreaterThanOrEqual(2);
  });

  it('gives the compact row a shorter image than the grid below', () => {
    // The top row sits beside the Flash Deals card and must not outgrow it.
    const fn = SRC.slice(SRC.indexOf('function productCardHtml'), SRC.indexOf('// Grey circles'));
    expect(fn).toMatch(/compact \? 'max-h-\[\d+px\]' : 'max-h-\[\d+px\]'/);
    const [, small, large] = fn.match(/compact \? 'max-h-\[(\d+)px\]' : 'max-h-\[(\d+)px\]'/)!;
    expect(Number(small)).toBeLessThan(Number(large));
  });
});

describe('products past the top row', () => {
  it('are rendered rather than dropped', () => {
    // The bug was slice(0, 5) with nothing after it.
    expect(SRC, 'the top row still hardcodes 5').not.toContain('state.products.slice(0, 5)');
    expect(SRC).toContain('.slice(0, TOP_ROW)');
    expect(SRC).toContain('.slice(0, HOME_MAX_MORE)');
  });

  it('only get a section when there are any', () => {
    expect(SRC).toContain('moreProducts.length > 0 ?');
  });

  it('exclude whatever the spotlight row already showed', () => {
    // By id, not by index. The spotlight picks featured/trending listings from
    // anywhere in the list, so slicing from TOP_ROW onwards would print one of
    // them twice - once up top and again in the grid below.
    expect(FLAT, 'the lower grid must drop the spotlight ids').toContain(
      'const moreProducts = state.products .filter((p) => !spotlightIds.has(p.id))',
    );
  });

  it('keeps the two counts sane', () => {
    const top = Number(SRC.match(/^const TOP_ROW = (\d+);/m)![1]);
    const more = Number(SRC.match(/^const HOME_MAX_MORE = (\d+);/m)![1]);
    // TOP_ROW is the row beside the Flash Deals card - five columns wide.
    expect(top).toBe(5);
    // Large enough to be worth having, small enough that the homepage does
    // not become the catalog.
    expect(more).toBeGreaterThanOrEqual(5);
    expect(more).toBeLessThanOrEqual(40);
  });

  it('stack under each other rather than scrolling sideways', () => {
    // A wrapping grid, not the overflow-x rail the top row uses.
    const section = SRC.slice(SRC.indexOf("t('ui_more_products')"));
    const grid = section.slice(0, section.indexOf('</section>'));
    expect(grid).toMatch(/grid grid-cols-2 md:grid-cols-\d lg:grid-cols-\d/);
    expect(grid, 'the lower grid must not be a sideways rail').not.toContain('overflow-x-auto');
  });

  it('are clickable, which means carrying the class the binding uses', () => {
    const binding = SRC.includes("querySelectorAll('.view-item-btn')");
    expect(binding, 'the .view-item-btn click binding is gone').toBe(true);
    const fn = SRC.slice(SRC.indexOf('function productCardHtml'), SRC.indexOf('// Grey circles'));
    expect(fn, 'the shared tile must carry .view-item-btn').toContain('view-item-btn');
  });

  it('offers a way through to the full catalog', () => {
    expect(SRC).toContain('id="home-view-all-btn"');
    expect(SRC).toContain("'#home-view-all-btn, #home-view-all-btn-2'");
    // The second button only appears when the homepage is holding some back -
    // counted from what the two rows actually rendered, since the spotlight
    // may show fewer than TOP_ROW (or none at all).
    expect(SRC).toContain('state.products.length > spotlightProducts.length + moreProducts.length ?');
  });

  it('lazy-loads the images, since they start below the fold', () => {
    const fn = SRC.slice(SRC.indexOf('function productCardHtml'), SRC.indexOf('// Grey circles'));
    expect(fn).toContain('loading="lazy"');
  });
});

describe('the top row is featured and trending only', () => {
  /**
   * The row beside the Flash Deals card used to be state.products.slice(0,
   * TOP_ROW) - whatever happened to be newest. isFeatured and isTrending put a
   * badge on the tile and did nothing else, so an administrator flagging a
   * listing changed no part of where it appeared.
   */
  it('filters the row on the two flags', () => {
    expect(FLAT).toContain(
      'const spotlightProducts = state.products .filter((p) => p.isFeatured || p.isTrending)',
    );
  });

  it('renders that row from the filtered list, not from state.products', () => {
    expect(SRC, 'the top row must render spotlightProducts').toContain(
      'spotlightProducts.length > 0 ? spotlightProducts',
    );
  });

  it('still caps the row at TOP_ROW', () => {
    // Five columns wide beside the Flash Deals card - flagging fifty listings
    // must not turn the row into a wall.
    const decl = SRC.slice(SRC.indexOf('const spotlightProducts'));
    expect(decl.slice(0, decl.indexOf(';'))).toContain('.slice(0, TOP_ROW)');
  });

  it('says so rather than backfilling when nothing is flagged', () => {
    // Falling back to ordinary listings would make the flags meaningless
    // again, which is the bug this row exists to fix.
    expect(SRC, 'no empty state for the spotlight row').toContain('ui_no_spotlight_title');
    const row = SRC.slice(SRC.indexOf('spotlightProducts.length > 0 ?'));
    const upToFallback = row.slice(0, row.indexOf('Sample Mockup Product Cards'));
    expect(upToFallback, 'the row must not fall back to unflagged listings')
      .not.toContain('state.products.slice(0, TOP_ROW)');
  });
});
