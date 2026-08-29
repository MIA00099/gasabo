// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const setProductFlashDeal = vi.fn();
const loadProducts = vi.fn();
const loadCategories = vi.fn();
const loadBanners = vi.fn();
const loadPendingProducts = vi.fn();
const setUI = vi.fn();

function product(overrides: Record<string, any> = {}) {
  return {
    id: 'p1',
    title: 'Coffee',
    category: 'Agri-Business',
    price: 18000,
    district: 'Gasabo',
    sellerName: 'Musanze',
    status: 'active',
    postedDate: new Date().toISOString(),
    images: ['https://example.com/coffee.png'],
    isFeatured: false,
    isTrending: false,
    flashDealEndsAt: null,
    rating: null,
    likeCount: 0,
    description: 'Coffee listing',
    ...overrides,
  };
}

const state = {
  currentUser: {
    role: 'sub_admin',
    permissions: {
      product_mgmt: true,
      category_mgmt: false,
      banner_mgmt: false,
      product_approval: false,
    },
  },
  ui: { marketplaceAdminTab: 'products' },
  loading: { products: false, categories: false, banners: false, pendingProducts: false },
  error: null,
  products: [product()],
  pendingProducts: [],
  categories: [],
  banners: [],
};

vi.mock('../../store/stateEngine.js', () => ({
  stateEngine: {
    getState: () => state,
    setUI,
    loadProducts,
    loadCategories,
    loadBanners,
    loadPendingProducts,
    setProductFlashDeal,
    toggleProductFlag: vi.fn(),
    setProductRating: vi.fn(),
    deleteProduct: vi.fn(),
    requestDeleteCategory: vi.fn(),
  },
}));

vi.mock('../../components/modalA11y.js', () => ({
  makeAccessibleModal: (overlay: HTMLElement) => ({
    close: () => overlay.remove(),
  }),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderAdmin() {
  const { renderMarketplaceAdmin } = await import('./MarketplaceAdmin.js');
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderMarketplaceAdmin(container);
  return container;
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  state.loading = { products: false, categories: false, banners: false, pendingProducts: false };
  state.error = null;
  state.products = [product()];
  setProductFlashDeal.mockReset();
  loadProducts.mockReset();
  loadCategories.mockReset();
  loadBanners.mockReset();
  loadPendingProducts.mockReset();
  setUI.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Marketplace Admin flash deal modal', () => {
  it('calls the flash-deal API path when Set Deal is clicked and shows progress', async () => {
    let finish!: () => void;
    setProductFlashDeal.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));

    const container = await renderAdmin();
    container.querySelector<HTMLButtonElement>('.flash-deal-btn')!.click();

    const input = document.querySelector<HTMLInputElement>('#flash-end-input')!;
    input.value = '2099-01-01T12:30';
    document.querySelector<HTMLButtonElement>('#flash-set')!.click();

    expect(setProductFlashDeal).toHaveBeenCalledTimes(1);
    expect(setProductFlashDeal.mock.calls[0][0]).toBe('p1');
    expect(new Date(setProductFlashDeal.mock.calls[0][1]).getTime()).toBeGreaterThan(Date.now());
    expect(document.body.textContent).toContain('Saving Flash Deal...');
    expect(document.querySelector<HTMLButtonElement>('#flash-set')!.disabled).toBe(true);

    finish();
    await flush();

    expect(document.body.textContent).toContain('Flash Deal saved.');
    expect(document.querySelector('#flash-end-input')).toBeTruthy();
  });

  it('keeps the modal open and shows the server error when save fails', async () => {
    setProductFlashDeal.mockRejectedValue(new Error('Approve this product before adding it to Flash Deals.'));

    const container = await renderAdmin();
    container.querySelector<HTMLButtonElement>('.flash-deal-btn')!.click();

    const input = document.querySelector<HTMLInputElement>('#flash-end-input')!;
    input.value = '2099-01-01T12:30';
    document.querySelector<HTMLButtonElement>('#flash-set')!.click();
    await flush();

    expect(document.querySelector('#flash-end-input')).toBeTruthy();
    expect(document.body.textContent).toContain('Approve this product before adding it to Flash Deals.');
  });
});
