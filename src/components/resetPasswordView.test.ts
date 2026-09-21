// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  completePasswordReset: vi.fn(),
  setRoute: vi.fn(),
  setPortal: vi.fn(),
}));

vi.mock('../store/stateEngine.js', () => ({
  stateEngine: {
    completePasswordReset: (...args: any[]) => mocks.completePasswordReset(...args),
    setRoute: (...args: any[]) => mocks.setRoute(...args),
    setPortal: (...args: any[]) => mocks.setPortal(...args),
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderReset(url = '/reset-password#access_token=recovery-token-from-email-link-12345&type=recovery') {
  window.history.pushState({}, '', url);
  const { renderResetPasswordView } = await import('./ResetPasswordView.js');
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderResetPasswordView(container);
  return container;
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  mocks.completePasswordReset.mockReset();
  mocks.setRoute.mockReset();
  mocks.setPortal.mockReset();
});

describe('ResetPasswordView', () => {
  it('requires a valid reset link token', async () => {
    const container = await renderReset('/reset-password');

    expect(container.textContent).toContain('This reset link is missing or expired');
    expect(container.querySelector('#reset-password-form')).toBeNull();
  });

  it('shows Supabase expired-link errors clearly', async () => {
    const container = await renderReset('/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');

    expect(container.textContent).toContain('Email link is invalid or has expired');
    expect(container.querySelector('#reset-password-form')).toBeNull();
  });

  it('validates matching passwords before completing the reset', async () => {
    const container = await renderReset();

    container.querySelector<HTMLInputElement>('#reset-new-password')!.value = 'NewPass1';
    container.querySelector<HTMLInputElement>('#reset-confirm-password')!.value = 'Different1';
    container.querySelector<HTMLFormElement>('#reset-password-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(container.textContent).toContain('Passwords do not match');
    expect(mocks.completePasswordReset).not.toHaveBeenCalled();
  });

  it('submits the Supabase recovery token and new password', async () => {
    mocks.completePasswordReset.mockResolvedValue('Password updated. You can sign in with the new password.');
    const container = await renderReset();

    container.querySelector<HTMLInputElement>('#reset-new-password')!.value = 'NewPass1';
    container.querySelector<HTMLInputElement>('#reset-confirm-password')!.value = 'NewPass1';
    container.querySelector<HTMLFormElement>('#reset-password-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(container.textContent).toContain('Updating password...');
    expect(mocks.completePasswordReset).toHaveBeenCalledWith('recovery-token-from-email-link-12345', 'NewPass1');

    await flush();
    expect(container.textContent).toContain('Password updated');
    expect(window.location.hash).toBe('');
  });
});
