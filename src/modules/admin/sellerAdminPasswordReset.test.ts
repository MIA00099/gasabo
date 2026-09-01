// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    loading: { sellers: false },
    error: null,
    sellers: [
      {
        id: 'seller-1',
        name: 'Musanze Coffee',
        email: 'seller@test.local',
        phone: '+250700000001',
        district: 'Gasabo',
        status: 'active',
        joinedDate: new Date('2026-01-01T00:00:00Z').toISOString(),
        productsCount: 3,
      },
    ],
  };

  return {
    state,
    loadSellers: vi.fn(),
    resetSellerPassword: vi.fn(),
    changeSellerEmail: vi.fn(),
    toggleSellerStatus: vi.fn(),
    requestDeleteSeller: vi.fn(),
  };
});

vi.mock('../../store/stateEngine.js', () => ({
  stateEngine: {
    getState: () => mocks.state,
    loadSellers: (...args: any[]) => mocks.loadSellers(...args),
    resetSellerPassword: (...args: any[]) => mocks.resetSellerPassword(...args),
    changeSellerEmail: (...args: any[]) => mocks.changeSellerEmail(...args),
    toggleSellerStatus: (...args: any[]) => mocks.toggleSellerStatus(...args),
    requestDeleteSeller: (...args: any[]) => mocks.requestDeleteSeller(...args),
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderAdmin() {
  const { renderSellerAdmin } = await import('./SellerAdmin.js');
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderSellerAdmin(container);
  return container;
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  mocks.loadSellers.mockReset();
  mocks.resetSellerPassword.mockReset();
  mocks.changeSellerEmail.mockReset();
  mocks.toggleSellerStatus.mockReset();
  mocks.requestDeleteSeller.mockReset();
  mocks.state.loading = { sellers: false };
  mocks.state.error = null;
});

describe('seller admin password reset', () => {
  it('shows the generated temporary password in-page after resetting a seller', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    let finish!: () => void;
    mocks.resetSellerPassword.mockReturnValue(new Promise<{ tempPassword: string }>((resolve) => {
      finish = () => resolve({ tempPassword: 'Temp!23456' });
    }));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    const container = await renderAdmin();
    container.querySelector<HTMLButtonElement>('.reset-pass-btn')!.click();

    expect(mocks.resetSellerPassword).toHaveBeenCalledWith('seller-1');
    expect(container.textContent).toContain('Resetting...');

    finish();
    await flush();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Temporary password for Musanze Coffee');
    expect(container.querySelector('#seller-reset-password-value')!.textContent).toBe('Temp!23456');

    container.querySelector<HTMLButtonElement>('#seller-reset-copy')!.click();
    await flush();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Temp!23456');
    expect(container.querySelector('#seller-reset-copy')!.textContent).toBe('Copied');
    alertSpy.mockRestore();
  });
});
