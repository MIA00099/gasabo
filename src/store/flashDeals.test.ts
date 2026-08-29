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

const apiGet = vi.fn();
const apiPatch = vi.fn();

vi.mock('../api/client.js', () => ({
  api: {
    get: (...args: any[]) => apiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: (...args: any[]) => apiPatch(...args),
    delete: vi.fn(),
    uploadFile: vi.fn(),
  },
  getSession: () => null,
  setSession: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

let stateEngine: any;

beforeEach(async () => {
  vi.resetModules();
  apiGet.mockReset();
  apiPatch.mockReset();
  apiGet.mockResolvedValue({ products: [] });
  ({ stateEngine } = await import('./stateEngine.js'));
  stateEngine.data.products = [{ id: 'p1', title: 'Existing product' }];
  stateEngine.data.flashDeals = [];
});

afterEach(() => {
  if (stateEngine) stateEngine.listeners = [];
});

describe('admin flash deal state updates', () => {
  it('adds a newly set flash deal immediately, before the background reload completes', async () => {
    const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    apiPatch.mockResolvedValue({
      product: { id: 'p1', title: 'Flash product', status: 'active', flashDealEndsAt: endsAt },
    });

    await stateEngine.setProductFlashDeal('p1', endsAt);

    expect(stateEngine.data.flashDeals.map((product: any) => product.id)).toEqual(['p1']);
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('removes a deal immediately when an admin clears it', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    stateEngine.data.flashDeals = [
      { id: 'p1', title: 'Cleared product', flashDealEndsAt: future },
      { id: 'p2', title: 'Still active', flashDealEndsAt: future },
    ];
    apiPatch.mockResolvedValue({
      product: { id: 'p1', title: 'Cleared product', status: 'active', flashDealEndsAt: null },
    });

    await stateEngine.setProductFlashDeal('p1', null);

    expect(stateEngine.data.flashDeals.map((product: any) => product.id)).toEqual(['p2']);
  });

  it('does not add a non-active product to the public flash deal cache', async () => {
    const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    apiPatch.mockResolvedValue({
      product: { id: 'p1', title: 'Pending product', status: 'pending', flashDealEndsAt: endsAt },
    });

    await stateEngine.setProductFlashDeal('p1', endsAt);

    expect(stateEngine.data.flashDeals).toEqual([]);
  });
});
