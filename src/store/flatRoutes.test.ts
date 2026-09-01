import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ROUTE_AUTH, ROUTE_FAQS, ROUTE_HELP_CENTER, ROUTE_POST_AD, ROUTE_PRODUCTS, ROUTE_STORES } from './router.js';

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

vi.mock('../api/client.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), uploadFile: vi.fn() },
  getSession: () => null,
  setSession: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

let stateEngine: any;

beforeEach(async () => {
  vi.resetModules();
  ({ stateEngine } = await import('./stateEngine.js'));
});

afterEach(() => {
  if (stateEngine) stateEngine.listeners = [];
});

describe('flat route adoption', () => {
  it('opens /products on the catalog tab', () => {
    stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });

    const state = stateEngine.getState();
    expect(state.activePortal).toBe('marketplace');
    expect(state.ui.marketplaceTab).toBe('catalog');
  });

  it('opens /stores on the stores tab', () => {
    stateEngine.setRoute({ kind: ROUTE_STORES, id: null });

    const state = stateEngine.getState();
    expect(state.activePortal).toBe('marketplace');
    expect(state.ui.marketplaceTab).toBe('stores');
  });

  it('opens support pages inside the public marketplace shell', () => {
    stateEngine.setRoute({ kind: ROUTE_HELP_CENTER, id: null });
    expect(stateEngine.getState().activePortal).toBe('marketplace');

    stateEngine.setRoute({ kind: ROUTE_FAQS, id: null });
    expect(stateEngine.getState().activePortal).toBe('marketplace');
  });

  it('opens /auth on the login view', () => {
    stateEngine.setRoute({ kind: ROUTE_AUTH, id: null });

    expect(stateEngine.getState().activePortal).toBe('login');
  });

  it('opens /post-ad as signup for guests and seller portal for sellers', () => {
    stateEngine.setRoute({ kind: ROUTE_POST_AD, id: null });
    expect(stateEngine.getState().activePortal).toBe('signup');

    stateEngine.data.currentUser = { id: 'seller-1', name: 'Seller', email: 's@test.local', role: 'seller' };
    stateEngine.setRoute({ kind: ROUTE_POST_AD, id: null });

    const state = stateEngine.getState();
    expect(state.activePortal).toBe('marketplace');
    expect(state.ui.marketplaceTab).toBe('seller_portal');
    expect(state.ui.sellerDashboardTab).toBe('new_product');
    expect(state.ui.productAdType).toBe('product');
  });

  it('opens the job form when post-ad is carrying a job intent', () => {
    stateEngine.data.currentUser = { id: 'seller-1', name: 'Seller', email: 's@test.local', role: 'seller' };
    stateEngine.data.ui.authIntent = 'post_job';

    stateEngine.setRoute({ kind: ROUTE_POST_AD, id: null });

    const state = stateEngine.getState();
    expect(state.activePortal).toBe('marketplace');
    expect(state.ui.marketplaceTab).toBe('seller_portal');
    expect(state.ui.sellerDashboardTab).toBe('new_product');
    expect(state.ui.productAdType).toBe('job');
  });
});
