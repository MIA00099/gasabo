/**
 * Regression: the related-products loader must not recurse when it is called
 * from inside a render.
 *
 * stateEngine._run() flips its loading flag and calls notify() BEFORE it
 * awaits anything. ProductDetailPage calls loadRelatedProducts() from inside
 * its render function. So the first call notifies synchronously, the notify
 * re-enters render, render calls the loader again, and without an in-flight
 * guard that recurses until the stack blows - firing a fetch at every level.
 *
 * The user-visible symptom is subtle rather than a crash banner: the row
 * renders its skeleton cards and stays there forever, because the recursion
 * never lets relatedProductsFor get set. "I don't see other products on this
 * page" is what it looks like from outside.
 *
 * This exercises the real class against a stubbed api module, with a
 * subscriber that re-enters the loader the way the real view does.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// stateEngine reads localStorage at construction and the api client touches
// browser globals on import, so both are stubbed before it loads.
const g = globalThis as any;
// router.js reads window.location at module scope (parseLocation's default
// argument), so a minimal window has to exist before stateEngine is imported.
g.window = {
  location: { pathname: '/', search: '', hash: '' },
  history: { pushState() {}, replaceState() {} },
  addEventListener() {},
};
g.localStorage = {
  _v: {} as Record<string, string>,
  getItem(k: string) { return this._v[k] ?? null; },
  setItem(k: string, v: string) { this._v[k] = v; },
  removeItem(k: string) { delete this._v[k]; },
};

const apiGet = vi.fn();

vi.mock('../api/client.js', () => ({
  api: {
    get: (...args: any[]) => apiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    uploadFile: vi.fn(),
  },
  getSession: () => null,
  setSession: vi.fn(),
  // The state engine registers a 401 handler at construction, so this has to
  // exist even for tests that never authenticate.
  setSessionExpiredHandler: vi.fn(),
}));

const PRODUCT_ID = 'product-under-test';
const SIBLINGS = [
  { id: 'sibling-1', title: 'Sibling One', price: 1000, currency: 'RWF', images: [], district: 'Gasabo' },
  { id: 'sibling-2', title: 'Sibling Two', price: 2000, currency: 'RWF', images: [], district: 'Gasabo' },
];

let stateEngine: any;

beforeEach(async () => {
  vi.resetModules();
  apiGet.mockReset();
  apiGet.mockResolvedValue({ products: SIBLINGS });
  ({ stateEngine } = await import('./stateEngine.js'));
  stateEngine.data.route = { kind: 'product', id: PRODUCT_ID };
});

afterEach(() => {
  if (stateEngine) stateEngine.listeners = [];
});

describe('loadRelatedProducts re-entrancy', () => {
  it('fires exactly one request when a subscriber re-enters it, as render does', async () => {
    // The real view: every notify triggers a render, and every render asks
    // for the related products of the listing it is drawing.
    let renders = 0;
    stateEngine.subscribe(() => {
      renders += 1;
      // Guard against a runaway test rather than hanging CI - the assertion
      // below is what actually reports the failure.
      if (renders > 500) return;
      if (stateEngine.data.relatedProductsFor !== PRODUCT_ID) {
        stateEngine.loadRelatedProducts(PRODUCT_ID);
      }
    });

    await stateEngine.loadRelatedProducts(PRODUCT_ID);

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith(`/products/${PRODUCT_ID}/related`);
    expect(renders).toBeLessThan(500);
  });

  it('resolves the row instead of leaving it on skeletons forever', async () => {
    stateEngine.subscribe(() => {
      if (stateEngine.data.relatedProductsFor !== PRODUCT_ID) {
        stateEngine.loadRelatedProducts(PRODUCT_ID);
      }
    });

    await stateEngine.loadRelatedProducts(PRODUCT_ID);

    // relatedProductsFor is what the view reads to decide the row is ready.
    expect(stateEngine.data.relatedProductsFor).toBe(PRODUCT_ID);
    expect(stateEngine.data.relatedProducts).toHaveLength(2);
  });

  it('serves a second call for the same listing from cache', async () => {
    await stateEngine.loadRelatedProducts(PRODUCT_ID);
    await stateEngine.loadRelatedProducts(PRODUCT_ID);

    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it('refetches when the reader opens a different listing', async () => {
    await stateEngine.loadRelatedProducts(PRODUCT_ID);

    stateEngine.data.route = { kind: 'product', id: 'another-product' };
    await stateEngine.loadRelatedProducts('another-product');

    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(apiGet).toHaveBeenLastCalledWith('/products/another-product/related');
    expect(stateEngine.data.relatedProductsFor).toBe('another-product');
  });

  it('clears the in-flight guard after a failure, so the row can retry', async () => {
    apiGet.mockRejectedValueOnce(new Error('network died'));

    await expect(stateEngine.loadRelatedProducts(PRODUCT_ID)).rejects.toThrow('network died');

    // A guard left set by a failed request would wedge the row permanently.
    apiGet.mockResolvedValueOnce({ products: SIBLINGS });
    await stateEngine.loadRelatedProducts(PRODUCT_ID);

    expect(stateEngine.data.relatedProductsFor).toBe(PRODUCT_ID);
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it('ignores a response that arrives after the reader moved on', async () => {
    let resolveSlow: (v: any) => void = () => {};
    apiGet.mockImplementationOnce(() => new Promise((r) => { resolveSlow = r; }));

    const pending = stateEngine.loadRelatedProducts(PRODUCT_ID);
    // Reader navigates away before the response lands.
    stateEngine.data.route = { kind: 'product', id: 'somewhere-else' };
    resolveSlow({ products: SIBLINGS });
    await pending;

    expect(stateEngine.data.relatedProductsFor).not.toBe(PRODUCT_ID);
    expect(stateEngine.data.relatedProducts).toEqual([]);
  });
});
