// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

let state: any;
const loadProducts = vi.fn();
const loadCategories = vi.fn();

vi.mock('../../store/stateEngine.js', () => ({
  stateEngine: {
    getState: () => state,
    setUI: vi.fn((patch) => {
      state.ui = { ...state.ui, ...patch };
    }),
    loadProducts,
    loadCategories,
  },
}));

vi.mock('../../store/router.js', () => ({
  pushPath: vi.fn(),
  pathForListing: (_kind: string, id: string) => `/product/${id}`,
  pathForRoute: (route: string) => `/${route}`,
  ROUTE_POST_AD: 'post-ad',
  ROUTE_PRODUCT: 'product',
}));

vi.mock('../../components/ShareModal.js', () => ({
  openShareModal: vi.fn(),
}));

const product = (overrides: Record<string, any>) => ({
  id: 'p',
  title: 'Product',
  description: '',
  price: 1000,
  currency: 'RWF',
  district: 'Gasabo',
  condition: 'Used',
  postedDate: '2026-01-01T00:00:00.000Z',
  images: ['/product.jpg'],
  ...overrides,
});

function baseState(overrides: Record<string, any> = {}) {
  const electronics = { id: 'cat-electronics', name: 'Electronics', icon: 'electronics' };
  const furniture = { id: 'cat-furniture', name: 'Furniture', icon: 'furniture' };
  const phone = product({ id: 'phone', title: 'Fresh phone', categoryId: electronics.id });
  const sofa = product({ id: 'sofa', title: 'Office sofa', categoryId: furniture.id });
  return {
    categories: [electronics, furniture],
    products: [phone, sofa],
    productCatalogCache: [phone, sofa],
    productsFilterKey: JSON.stringify({ category: 'all', district: 'all', search: '' }),
    loading: { products: true, categories: false },
    ui: {
      productsSort: 'newest',
      marketplaceFilters: {
        searchQuery: '',
        selectedCategory: electronics.id,
        selectedDistrict: 'all',
      },
    },
    ...overrides,
  };
}

describe('products page realtime filters', () => {
  beforeEach(() => {
    loadProducts.mockReset();
    loadCategories.mockReset();
    document.body.innerHTML = '';
  });

  it('does not flash all products while a selected category request is loading', async () => {
    state = baseState();
    const { renderProductsPage } = await import('./ProductsPage.js');
    const container = document.createElement('div');

    renderProductsPage(container);

    expect(container.textContent).toContain('Fresh phone');
    expect(container.textContent).not.toContain('Office sofa');
  });

  it('uses the all-products cache immediately when returning to All Categories', async () => {
    state = baseState({
      products: [product({ id: 'phone', title: 'Fresh phone', categoryId: 'cat-electronics' })],
      productsFilterKey: JSON.stringify({ category: 'cat-electronics', district: 'all', search: '' }),
      ui: {
        productsSort: 'newest',
        marketplaceFilters: {
          searchQuery: '',
          selectedCategory: 'all',
          selectedDistrict: 'all',
        },
      },
    });
    const { renderProductsPage } = await import('./ProductsPage.js');
    const container = document.createElement('div');

    renderProductsPage(container);

    expect(container.textContent).toContain('Fresh phone');
    expect(container.textContent).toContain('Office sofa');
  });
});
