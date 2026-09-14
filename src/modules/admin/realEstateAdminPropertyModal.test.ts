// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const loadRealEstate = vi.fn();
const loadRealEstateInquiries = vi.fn();
const addRealEstateProperty = vi.fn();
const updateRealEstateProperty = vi.fn();

const state = {
  error: null,
  loading: { realEstate: false, realEstateInquiries: false },
  districts: ['Gasabo', 'Huye'],
  ui: { realEstateInquiryFilter: 'all' },
  realEstateInquiries: [],
  realEstate: {
    hero: { title: 'Gasabo Real Estate', subtitle: 'Find property' },
    about: { heading: 'About', text: 'About text' },
    contact: { phone: '+250', email: 'info@example.com', address: 'Kigali' },
    services: [],
    properties: [{
      id: 'p1',
      title: 'home',
      type: 'house',
      location: 'Huye',
      price: '20000000',
      area: '8000',
      image: '/home.jpg',
      images: ['/home.jpg'],
      description: 'near on the road',
    }],
  },
};

vi.mock('../../store/stateEngine.js', () => ({
  stateEngine: {
    getState: () => state,
    loadRealEstate,
    loadRealEstateInquiries,
    saveRealEstateHero: vi.fn(),
    saveRealEstateSection: vi.fn(),
    addRealEstateProperty,
    updateRealEstateProperty,
    deleteRealEstateProperty: vi.fn(),
    setUI: vi.fn(),
    setRealEstateInquiryStatus: vi.fn(),
    deleteRealEstateInquiry: vi.fn(),
    uploadProductImages: vi.fn(),
  },
}));

async function renderAdmin() {
  const { renderRealEstateAdmin } = await import('./RealEstateAdmin.js');
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderRealEstateAdmin(container);
  return container;
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  loadRealEstate.mockReset();
  loadRealEstateInquiries.mockReset();
  addRealEstateProperty.mockReset();
  updateRealEstateProperty.mockReset();
});

describe('Real Estate admin property modal', () => {
  it('opens from Add Property Listing', async () => {
    const container = await renderAdmin();

    container.querySelector<HTMLButtonElement>('#admin-add-property-btn')!.click();

    expect(document.body.textContent).toContain('Add Property Listing');
    expect(document.querySelector<HTMLInputElement>('input[name="title"]')).toBeTruthy();
  });

  it('opens from an existing property Edit button with the current values', async () => {
    const container = await renderAdmin();

    container.querySelector<HTMLButtonElement>('.edit-property-btn')!.click();

    expect(document.body.textContent).toContain('Edit Property Listing');
    expect(document.querySelector<HTMLInputElement>('input[name="title"]')!.value).toBe('home');
    expect(document.querySelector<HTMLInputElement>('input[name="price"]')!.value).toBe('20000000');
  });
});
