// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    currentUser: {
      id: 'seller-1',
      role: 'seller',
      name: 'Musanze Coffee',
      email: 'seller@test.local',
      phone: '+250700000001',
      district: 'Gasabo',
    },
    ui: { sellerDashboardTab: 'active', productImageMode: 'url', productImages: [] },
    loading: { myProducts: false, categories: false, productForm: false, imageUpload: false },
    error: null,
    myProducts: [],
    categories: [{ id: 'cat-1', name: 'Agriculture', icon: '' }],
    districts: ['Gasabo'],
  };

  return {
    state,
    changePassword: vi.fn(),
    updateSellerProfile: vi.fn(),
    loadMyProducts: vi.fn(),
    loadCategories: vi.fn(),
    setUI: vi.fn(),
  };
});

vi.mock('../../store/stateEngine.js', () => ({
  stateEngine: {
    getState: () => mocks.state,
    changePassword: (...args: any[]) => mocks.changePassword(...args),
    updateSellerProfile: (...args: any[]) => mocks.updateSellerProfile(...args),
    loadMyProducts: (...args: any[]) => mocks.loadMyProducts(...args),
    loadCategories: (...args: any[]) => mocks.loadCategories(...args),
    setUI: (...args: any[]) => mocks.setUI(...args),
  },
}));

vi.mock('../../components/LoginView.js', () => ({
  renderLoginView: vi.fn(),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderPortal() {
  const { renderSellerPortal } = await import('./SellerPortal.js');
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderSellerPortal(container);
  return container;
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  mocks.changePassword.mockReset();
  mocks.updateSellerProfile.mockReset();
  mocks.loadMyProducts.mockReset();
  mocks.loadCategories.mockReset();
  mocks.setUI.mockReset();
  mocks.state.currentUser = {
    id: 'seller-1',
    role: 'seller',
    name: 'Musanze Coffee',
    email: 'seller@test.local',
    phone: '+250700000001',
    district: 'Gasabo',
  };
  mocks.state.ui = { sellerDashboardTab: 'active', productImageMode: 'url', productImages: [] };
  mocks.state.loading = { myProducts: false, categories: false, productForm: false, imageUpload: false };
  mocks.state.error = null;
  mocks.state.myProducts = [];
});

describe('seller account password settings', () => {
  it('requires the new password confirmation before calling the API', async () => {
    const container = await renderPortal();
    container.querySelector<HTMLButtonElement>('#seller-account-btn')!.click();

    document.querySelector<HTMLInputElement>('#acc-cur-pw')!.value = 'OldPass1';
    document.querySelector<HTMLInputElement>('#acc-new-pw')!.value = 'NewPass1';
    document.querySelector<HTMLInputElement>('#acc-confirm-pw')!.value = 'Different1';
    document.querySelector<HTMLFormElement>('#acc-password-form')!.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));

    expect(mocks.changePassword).not.toHaveBeenCalled();
    expect(document.querySelector('#acc-pw-msg')!.textContent).toContain('New passwords do not match.');
  });

  it('shows saving and success feedback when the seller changes password', async () => {
    let finish!: () => void;
    mocks.changePassword.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));

    const container = await renderPortal();
    container.querySelector<HTMLButtonElement>('#seller-account-btn')!.click();

    document.querySelector<HTMLInputElement>('#acc-cur-pw')!.value = 'OldPass1';
    document.querySelector<HTMLInputElement>('#acc-new-pw')!.value = 'NewPass1';
    document.querySelector<HTMLInputElement>('#acc-confirm-pw')!.value = 'NewPass1';
    document.querySelector<HTMLFormElement>('#acc-password-form')!.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));

    expect(mocks.changePassword).toHaveBeenCalledWith('OldPass1', 'NewPass1');
    expect(document.querySelector<HTMLButtonElement>('#acc-save-pw')!.disabled).toBe(true);
    expect(document.body.textContent).toContain('Saving password change...');

    finish();
    await flush();

    expect(document.querySelector<HTMLButtonElement>('#acc-save-pw')!.disabled).toBe(false);
    expect(document.body.textContent).toContain('Password updated. Use the new password next time you sign in.');
    expect(document.querySelector<HTMLInputElement>('#acc-cur-pw')!.value).toBe('');
    expect(document.querySelector<HTMLInputElement>('#acc-new-pw')!.value).toBe('');
    expect(document.querySelector<HTMLInputElement>('#acc-confirm-pw')!.value).toBe('');
  });
});
