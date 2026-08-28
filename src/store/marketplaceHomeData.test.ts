/**
 * The tab-return auto-refresh must re-render the page ONCE, not many times.
 *
 * The old refresh fired three separate loaders (products, flash deals, banners);
 * each _run() notifies on loading-start, on data, and on loading-done, and they
 * finished at different moments - so the whole marketplace page was rebuilt ~7
 * times in a row on every tab return. That flashing is the "shaking".
 *
 * refreshMarketplaceData() now calls loadMarketplaceHomeData(filters, {force})
 * which fetches everything in parallel and updates state with a single notify,
 * and - because the page is already on screen - skips the loading-flag flip, so
 * there is no skeleton flash and no second render.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const g = globalThis as any;
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

// A named function, not just vi.fn's own default: a couple of tests below
// need to swap in a different response via apiGet.mockImplementation(), and
// mockClear() (in beforeEach) clears call history but NOT an implementation
// override - only mockImplementation() itself does that. Naming this lets
// beforeEach re-apply it before every test, so an override in one test
// cannot leak into the next.
function defaultApiGetImpl(url: string) {
  if (url.includes('/categories')) return Promise.resolve({ categories: [{ id: 'c1', name: 'C' }] });
  if (url.includes('/flash-deals')) return Promise.resolve({ products: [] });
  if (url.includes('/advertisements')) return Promise.resolve({ banners: [] });
  return Promise.resolve({ products: [{ id: 'fresh' }] });
}

const apiGet = vi.fn(defaultApiGetImpl);

vi.mock('../api/client.js', () => ({
  api: { get: (...a: any[]) => apiGet(...a), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), uploadFile: vi.fn() },
  getSession: () => null,
  setSession: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

let stateEngine: any;
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  vi.resetModules();
  apiGet.mockClear();
  apiGet.mockImplementation(defaultApiGetImpl); // undo any override a previous test made
  ({ stateEngine } = await import('./stateEngine.js'));
  // Simulate a page that has already cold-loaded: every flag is `false`
  // (attempted, not loading), and there is content on screen.
  stateEngine.data.loading = { products: false, categories: false, flashDeals: false, banners: false };
  stateEngine.data.products = [{ id: 'old' }];
});

afterEach(() => { if (stateEngine) stateEngine.listeners = []; });

describe('forced marketplace refresh', () => {
  it('re-renders the page exactly once', async () => {
    let renders = 0;
    stateEngine.subscribe(() => { renders += 1; });

    await stateEngine.loadMarketplaceHomeData({}, { force: true });
    await flush();

    // One coalesced render for the whole refresh - not one per loader.
    expect(renders).toBe(1);
    expect(stateEngine.data.products).toEqual([{ id: 'fresh' }]);
  });

  it('never flips a loading flag back to true (no skeleton flash)', async () => {
    const seen: boolean[] = [];
    stateEngine.subscribe(() => { seen.push(stateEngine.data.loading.products === true); });

    await stateEngine.loadMarketplaceHomeData({}, { force: true });
    await flush();

    expect(seen).not.toContain(true); // products.loading never went true mid-refresh
  });

  it('does not re-fetch categories on a forced refresh (stable + slow)', async () => {
    await stateEngine.loadMarketplaceHomeData({}, { force: true });
    await flush();

    const categoryFetches = apiGet.mock.calls.filter((c) => String(c[0]).includes('/categories')).length;
    expect(categoryFetches).toBe(0);
  });
});

/**
 * The tab-return refresh must not render at all when the server sends back
 * exactly what is already on screen.
 *
 * Every notify() makes main.js's renderApp() rebuild the whole header and
 * view - every product <img> is torn down and reinserted, and the hero
 * slider (started fresh on every render) snaps back to its first slide and
 * restarts its clock, mid-rotation, for whoever was looking at it. Coming
 * back from another tab after 30+ seconds is the ordinary case, and on an
 * ordinary browsing session nothing has usually changed on the server in
 * that window - so unconditionally rendering the refresh's result was a
 * visible, no-reason snap on every single tab return. This is the "shaking"
 * bug report.
 */
describe('forced refresh with unchanged data', () => {
  it('does not render when the fetch returns byte-for-byte the same products', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve({ categories: [{ id: 'c1', name: 'C' }] });
      if (url.includes('/flash-deals')) return Promise.resolve({ products: [] });
      if (url.includes('/advertisements')) return Promise.resolve({ banners: [] });
      // Same shape and values as the seeded state.products below.
      return Promise.resolve({ products: [{ id: 'old' }] });
    });

    let renders = 0;
    stateEngine.subscribe(() => { renders += 1; });

    await stateEngine.loadMarketplaceHomeData({}, { force: true });
    await flush();

    expect(renders, 'an unchanged refresh must not trigger a render').toBe(0);
    // The state itself is still fine to overwrite (same content) - what
    // matters is that nothing was told to re-render over it.
    expect(stateEngine.data.products).toEqual([{ id: 'old' }]);
  });

  it('still renders once real data shows up', async () => {
    // Default mock (from the outer beforeEach) returns [{ id: 'fresh' }],
    // which differs from the seeded [{ id: 'old' }] - this must still work.
    let renders = 0;
    stateEngine.subscribe(() => { renders += 1; });

    await stateEngine.loadMarketplaceHomeData({}, { force: true });
    await flush();

    expect(renders, 'a genuinely changed refresh must still render').toBe(1);
    expect(stateEngine.data.products).toEqual([{ id: 'fresh' }]);
  });

  it('renders when only the flash deal changed and the product list did not', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve({ categories: [{ id: 'c1', name: 'C' }] });
      if (url.includes('/flash-deals')) return Promise.resolve({ products: [{ id: 'new-deal' }] });
      if (url.includes('/advertisements')) return Promise.resolve({ banners: [] });
      return Promise.resolve({ products: [{ id: 'old' }] }); // unchanged
    });

    let renders = 0;
    stateEngine.subscribe(() => { renders += 1; });

    await stateEngine.loadMarketplaceHomeData({}, { force: true });
    await flush();

    // One field changing is enough - this is not an all-or-nothing check.
    expect(renders).toBe(1);
    expect(stateEngine.data.flashDeals).toEqual([{ id: 'new-deal' }]);
  });

  it('a cold load still renders even if the fetched data happens to equal the initial empty state', async () => {
    // Nothing seeded this time - a genuinely first load, zero products.
    stateEngine.data.loading = {};
    stateEngine.data.products = [];
    apiGet.mockImplementation((url: string) => {
      if (url.includes('/categories')) return Promise.resolve({ categories: [] });
      if (url.includes('/flash-deals')) return Promise.resolve({ products: [] });
      if (url.includes('/advertisements')) return Promise.resolve({ banners: [] });
      return Promise.resolve({ products: [] }); // same as the [] already in state
    });

    let renders = 0;
    stateEngine.subscribe(() => { renders += 1; });

    await stateEngine.loadMarketplaceHomeData({}, { force: false });
    await flush();

    // Two renders: the skeleton (loading flags flip true) and the loaded
    // state (loading flags flip false) - the "same data" skip only applies
    // to force:true. A cold load with nothing to show must still leave the
    // skeleton.
    expect(renders).toBe(2);
  });
});
