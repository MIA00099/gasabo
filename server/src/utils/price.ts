/**
 * Reading a number out of a property's price.
 *
 * The admin form used to ask for the price twice: once as display text
 * ("150,000,000 Rwf") and again as a separate number "for search filtering".
 * Nothing kept the two in step, and in the live data they had drifted badly -
 * a property priced 70,000,000 carried a filter number of 500,000, another
 * priced 502,000 carried 780,000. Five of seven listings disagreed with
 * themselves, so the price filter was sorting listings by a figure that had
 * nothing to do with what the page showed.
 *
 * Deriving it removes the chance to disagree: whoever types the price has
 * already said everything the system needs.
 */
export function priceToNumber(price: unknown): number {
  if (typeof price === 'number' && Number.isFinite(price)) return Math.max(0, Math.round(price));
  if (typeof price !== 'string') return 0;

  // Strip the separators a person naturally types - commas, ordinary spaces
  // and the non-breaking space that arrives when text is pasted from a
  // document - then read the first number out of what is left.
  const cleaned = price.replace(/[,\s ]/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)([MmKk])?/);
  if (!match) return 0;

  const n = Number(match[1]);
  if (!Number.isFinite(n)) return 0;

  // "12.5M" is a natural way to write a price, and reads as twelve francs
  // without this: the digits alone give 12, which would sort a 12.5 million
  // franc villa below a 500,000 franc plot.
  const suffix = (match[2] || '').toLowerCase();
  if (suffix === 'm') return Math.round(n * 1_000_000);
  if (suffix === 'k') return Math.round(n * 1_000);

  return Math.round(n);
}

/** Every property, with priceNum recomputed from its own price text. */
export function withDerivedPrices<T extends { price?: unknown; priceNum?: number }>(properties: T[]): T[] {
  if (!Array.isArray(properties)) return properties;
  return properties.map((p) => ({ ...p, priceNum: priceToNumber(p.price) }));
}
