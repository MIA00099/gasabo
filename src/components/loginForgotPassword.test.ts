// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {
    districts: ['Gasabo', 'Kicukiro'],
    ui: {},
  },
  clearAuthNotice: vi.fn(),
  requestPasswordReset: vi.fn(),
  login: vi.fn(),
  registerSeller: vi.fn(),
  routeToDashboard: vi.fn(),
}));

vi.mock('../store/stateEngine.js', () => ({
  stateEngine: {
    getState: () => mocks.state,
    clearAuthNotice: (...args: any[]) => mocks.clearAuthNotice(...args),
    requestPasswordReset: (...args: any[]) => mocks.requestPasswordReset(...args),
    login: (...args: any[]) => mocks.login(...args),
    registerSeller: (...args: any[]) => mocks.registerSeller(...args),
    routeToDashboard: (...args: any[]) => mocks.routeToDashboard(...args),
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderLogin(initialMode = 'login') {
  const { renderLoginView } = await import('./LoginView.js');
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderLoginView(container, initialMode);
  return container;
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  mocks.state.ui = {};
  mocks.clearAuthNotice.mockReset();
  mocks.requestPasswordReset.mockReset();
  mocks.login.mockReset();
  mocks.registerSeller.mockReset();
  mocks.routeToDashboard.mockReset();
});

describe('seller forgot password form', () => {
  it('opens with seller-specific copy so the reset path is clear', async () => {
    const container = await renderLogin();

    expect(container.textContent).toContain('Forgot seller password?');
    container.querySelector<HTMLButtonElement>('#forgot-pass-link')!.click();

    expect(container.textContent).toContain('Seller password reset');
    expect(container.textContent).toContain('Seller Support');
    expect(container.textContent).toContain('password changes only after an admin creates');
    expect(container.textContent).toContain('temporary password');
  });

  it('validates the seller email and sends the reset request', async () => {
    let finish!: () => void;
    mocks.requestPasswordReset.mockReturnValue(new Promise<string>((resolve) => {
      finish = () => resolve('Password reset request sent. Seller Support has been notified.');
    }));

    const container = await renderLogin();
    container.querySelector<HTMLButtonElement>('#forgot-pass-link')!.click();

    container.querySelector<HTMLButtonElement>('#forgot-submit-btn')!.click();
    expect(container.textContent).toContain('Enter the email address on your seller account.');
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();

    container.querySelector<HTMLInputElement>('#auth-forgot-email')!.value = 'seller@test.local';
    container.querySelector<HTMLButtonElement>('#forgot-submit-btn')!.click();

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith('seller@test.local');
    expect(container.querySelector<HTMLButtonElement>('#forgot-submit-btn')!.disabled).toBe(true);
    expect(container.textContent).toContain('Sending request...');

    finish();
    await flush();

    expect(container.textContent).toContain('Password reset request sent.');
    expect(container.textContent).toContain('Seller Support has been notified.');
  });
});

describe('jobs auth intent copy', () => {
  it('does not present worker signup as a seller registration path', async () => {
    mocks.state.ui = { authIntent: 'worker' };

    const container = await renderLogin('signup');

    expect(container.textContent).toContain('Sign Up');
    expect(container.textContent).toContain('Create a seller account to start selling on Kigali Market');
    expect(container.textContent).not.toContain('Become a Worker');
  });

  it('makes the post-job signup path clear', async () => {
    mocks.state.ui = { authIntent: 'post_job' };

    const container = await renderLogin('signup');

    expect(container.textContent).toContain('Post a Job');
    expect(container.textContent).toContain('post jobs and manage replies');
  });
});
