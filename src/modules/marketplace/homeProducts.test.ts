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

describe('the product tile is written once', () => {
  it('exists as a function', () => {
    expect(SRC).toContain('function productCardHtml(prod');
  });

  it('has only one copy of the card markup', () => {
    // The tile is identified by its data-id + .view-item-btn combination.
    const copies = SRC.split('view-item-btn" data-id=').length - 1;
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
    expect(SRC).toContain('.slice(TOP_ROW, TOP_ROW + HOME_MAX_MORE)');
  });

  it('only get a section when there are any', () => {
    expect(SRC).toContain('state.products.length > TOP_ROW ?');
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
    // The second button only appears when the homepage is holding some back.
    expect(SRC).toContain('state.products.length > TOP_ROW + HOME_MAX_MORE ?');
  });

  it('lazy-loads the images, since they start below the fold', () => {
    const fn = SRC.slice(SRC.indexOf('function productCardHtml'), SRC.indexOf('// Grey circles'));
    expect(fn).toContain('loading="lazy"');
  });
});
