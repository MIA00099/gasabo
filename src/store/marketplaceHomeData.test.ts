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

const apiGet = vi.fn((url: string) => {
  if (url.includes('/categories')) return Promise.resolve({ categories: [{ id: 'c1', name: 'C' }] });
  if (url.includes('/flash-deals')) return Promise.resolve({ products: [] });
  if (url.includes('/advertisements')) return Promise.resolve({ banners: [] });
  return Promise.resolve({ products: [{ id: 'fresh' }] });
});

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
