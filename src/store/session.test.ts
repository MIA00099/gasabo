/**
 * What happens to the app when a session ends.
 *
 * Two failures, both measured in the browser before being fixed here.
 *
 * 1. The zombie session. The API client cleared localStorage on any 401 but
 *    told nobody, so an administrator whose token had expired went on looking
 *    at the dashboard - their name, their role, the Logout button, the whole
 *    shell - while every click failed with "Invalid or expired session".
 *    Signed out and unaware of it.
 *
 * 2. Logout left the data behind. It reset currentUser and activePortal and
 *    nothing else, so the previous person's sellers directory, approval
 *    queue, audit logs, pending products and notifications stayed in memory
 *    for whoever signed in next on the same browser without a page reload.
 *
 * Both are about state, not about the server, so they are tested here against
 * the real StateEngine with the API module stubbed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const g = globalThis as any;

// stateEngine reads localStorage at construction and router.js reads
// window.location at module scope, so both must exist before the import.
const store = new Map<string, string>();
g.localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
g.window = g.window || { location: { pathname: '/', search: '', hash: '' }, addEventListener() {} };
g.document = g.document || { addEventListener() {} };

/** Captures the handler the state engine registers for 401s. */
let expiredHandler: ((message?: string) => void) | null = null;
const setSessionMock = vi.fn();

vi.mock('../api/client.js', () => ({
  api: {
    get: vi.fn(async () => ({ user: null })),
    post: vi.fn(async () => ({})),
    patch: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
  getSession: () => null,
  setSession: (...args: unknown[]) => setSessionMock(...args),
  setSessionExpiredHandler: (fn: (message?: string) => void) => {
    expiredHandler = fn;
  },
  getVisitorKey: () => 'test-visitor',
}));

const { stateEngine } = await import('./stateEngine.js');

/** Puts the engine in the state of a signed-in administrator mid-session. */
function signInAsAdmin() {
  const s = stateEngine.getState();
  s.currentUser = {
    id: 'admin-1', name: 'Jean-Luc', email: 'a@b.c', role: 'admin',
    phone: '', district: '', permissions: { system_settings: true },
  };
  s.activePortal = 'admin';
  s.auditLogs = [{ id: 'log-1' }, { id: 'log-2' }];
  s.sellers = [{ id: 'seller-1' }];
  s.approvalRequests = [{ id: 'req-1' }];
  s.notifications = [{ id: 'n-1', message: 'private' }];
  s.pendingProducts = [{ id: 'p-1' }];
}

beforeEach(() => {
  setSessionMock.mockClear();
  signInAsAdmin();
});

describe('a 401 mid-session', () => {
  it('registers a handler with the API client at construction', () => {
    // Without this the client clears storage and nothing else happens.
    expect(expiredHandler, 'no 401 handler was registered').toBeTypeOf('function');
  });

  it('signs the person out of the UI, not just out of storage', () => {
    expiredHandler!('Invalid or expired session.');
    const s = stateEngine.getState();
    expect(s.currentUser.role, 'still holding the admin role').toBe('guest');
    expect(s.currentUser.name).toBe('Guest');
  });

  it('takes them off the admin portal, which they can no longer be on', () => {
    expiredHandler!('Invalid or expired session.');
    expect(stateEngine.getState().activePortal).toBe('login');
  });

  it('explains why they are looking at a sign-in screen', () => {
    // Being dropped on a login form with no explanation reads as a bug.
    expiredHandler!('Invalid or expired session.');
    expect(stateEngine.getState().ui.authNotice).toBe('Invalid or expired session.');
  });

  it('keeps the notice until the person engages with the form', () => {
    // Every notify() rebuilds the login view and re-runs its initialisers, so
    // a notice consumed on mount was lost a frame later. It has to survive
    // re-renders and only go when they act.
    expiredHandler!('Invalid or expired session.');
    stateEngine.notify();
    stateEngine.notify();
    expect(stateEngine.getState().ui.authNotice, 'notice lost to a re-render').toBe('Invalid or expired session.');

    stateEngine.clearAuthNotice();
    expect(stateEngine.getState().ui.authNotice).toBeFalsy();
  });

  it('leaves a browsing shopper where they are', () => {
    // Only somewhere they cannot remain signed out justifies a redirect.
    // Throwing a shopper onto a login form because a background call expired
    // would be the more annoying bug.
    const s = stateEngine.getState();
    s.currentUser = { id: 'u1', name: 'Buyer', email: 'b@c.d', role: 'user', phone: '', district: '', permissions: {} };
    s.activePortal = 'marketplace';
    s.ui = {};

    expiredHandler!('Your session has expired.');
    expect(stateEngine.getState().activePortal, 'a shopper was redirected to login').toBe('marketplace');
    expect(stateEngine.getState().currentUser.role).toBe('guest');
  });

  it('says nothing when nobody was signed in', () => {
    stateEngine.logout();
    stateEngine.getState().ui = {};
    expiredHandler!('Your session has expired.');
    // A 401 on a public endpoint from a signed-out visitor is not an expiry,
    // and announcing one would be a lie.
    expect(stateEngine.getState().ui.authNotice).toBeFalsy();
  });
});

describe('logout', () => {
  it('clears the stored session', () => {
    stateEngine.logout();
    expect(setSessionMock).toHaveBeenCalledWith(null);
  });

  it('returns the user to a guest', () => {
    stateEngine.logout();
    expect(stateEngine.getState().currentUser.role).toBe('guest');
  });

  it('leaves none of the previous person data in memory', () => {
    stateEngine.logout();
    const s = stateEngine.getState();
    for (const key of ['auditLogs', 'sellers', 'approvalRequests', 'notifications', 'pendingProducts', 'myProducts', 'systemUsers'] as const) {
      expect(s[key], `${key} survived logout`).toEqual([]);
    }
  });

  it('keeps the language, which is a browser preference and not session data', () => {
    stateEngine.getState().currentLang = 'rw';
    stateEngine.logout();
    expect(stateEngine.getState().currentLang).toBe('rw');
  });

  it('keeps the current page rather than throwing them home', () => {
    const route = { kind: 'product', id: 'abc' } as any;
    stateEngine.getState().route = route;
    stateEngine.logout();
    expect(stateEngine.getState().route).toBe(route);
  });
});
