/**
 * Turning a property's price into a number the search can compare.
 *
 * The admin form used to ask for it twice - display text and a separate
 * "number, for search filtering" - with nothing keeping them in step. The live
 * data showed what that costs: of seven listings, five carried a filter number
 * that disagreed with their own price. One priced 70,000,000 was filed under
 * 500,000; one priced 502,000 was filed under 780,000. The price filter was
 * sorting properties by a figure the page never showed, and no amount of
 * fixing the filter would have helped while the input allowed it.
 *
 * The cases below are the real values from those seven listings.
 */
import { describe, it, expect } from 'vitest';
import { priceToNumber, withDerivedPrices } from '../src/utils/price.js';

describe('priceToNumber', () => {
  it('reads the seven live listings correctly', () => {
    // left: what the page showed. right: what it should filter as.
    const live: Array<[string, number]> = [
      ['70000000', 70_000_000],
      ['5100000', 5_100_000],
      ['502000', 502_000],
      ['20000000', 20_000_000],
      ['150,000,000 Rwf', 150_000_000],
      ['8,500,000 Rwf', 8_500_000],
    ];
    for (const [text, expected] of live) {
      expect(priceToNumber(text), `"${text}"`).toBe(expected);
    }
  });

  it('handles the separators people actually type', () => {
    expect(priceToNumber('150,000,000')).toBe(150_000_000);
    expect(priceToNumber('150 000 000')).toBe(150_000_000);
    // Non-breaking space, which is what arrives when a price is pasted in
    // from a document.
    expect(priceToNumber('150 000 000')).toBe(150_000_000);
  });

  it('understands M and K, which are how prices get abbreviated', () => {
    // Without this "12.5M" reads as twelve francs and sorts a villa below a
    // plot.
    expect(priceToNumber('12.5M Rwf')).toBe(12_500_000);
    expect(priceToNumber('150M')).toBe(150_000_000);
    expect(priceToNumber('800K')).toBe(800_000);
    expect(priceToNumber('800k')).toBe(800_000);
  });

  it('finds the price inside a sentence', () => {
    expect(priceToNumber('Rent: 800,000/mo')).toBe(800_000);
  });

  it('returns zero rather than guessing when there is no number', () => {
    // A property with no price should sort as unpriced, not as free-and-first
    // by accident of parsing.
    for (const v of ['Contact for price', '', 'Negotiable', null, undefined, {}, []]) {
      expect(priceToNumber(v as unknown), String(v)).toBe(0);
    }
  });

  it('passes a number through, and never returns a negative', () => {
    expect(priceToNumber(150_000_000)).toBe(150_000_000);
    expect(priceToNumber(-5)).toBe(0);
  });
});

describe('withDerivedPrices', () => {
  it('overwrites a stored number that disagrees with the price', () => {
    // This is the exact shape of the bad live rows.
    const before = [
      { id: 'a', price: '70000000', priceNum: 500_000 },
      { id: 'b', price: '502000', priceNum: 780_000 },
    ];
    const after = withDerivedPrices(before);
    expect(after[0].priceNum).toBe(70_000_000);
    expect(after[1].priceNum).toBe(502_000);
  });

  it('leaves the rest of the property alone', () => {
    const [p] = withDerivedPrices([{ id: 'x', title: 'Villa', price: '1,000,000', priceNum: 9 } as any]);
    expect(p.id).toBe('x');
    expect((p as any).title).toBe('Villa');
    expect(p.price).toBe('1,000,000');
  });

  it('does not throw on a missing or malformed list', () => {
    expect(withDerivedPrices([])).toEqual([]);
    expect(withDerivedPrices(null as any)).toBe(null);
  });
});
