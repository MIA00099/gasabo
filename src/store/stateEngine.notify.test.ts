/**
 * notify() coalesces renders.
 *
 * main.js's subscriber rebuilds the whole header and view on every notify, and
 * a homepage cold load fires notify ~19 times in the first few hundred ms (one
 * per loading-flag flip, one per arriving payload, plus setPortal/setRoute).
 * Rendering each separately is what made the page flash and the nav flicker
 * while it settled. notify() now batches every call that lands in the same task
 * into a single render, without ever dropping the latest state.
 */
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

const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0));

describe('notify coalescing', () => {
  it('collapses a burst of synchronous notifies into a single render', async () => {
    let renders = 0;
    stateEngine.subscribe(() => { renders += 1; });

    stateEngine.notify();
    stateEngine.notify();
    stateEngine.notify();

    // The burst is batched: nothing renders inline. (A synchronous notify would
    // have already fired the subscriber three times here.)
    expect(renders).toBe(0);

    await flushMicrotasks();

    // Exactly one render for the whole burst, however many notifies fired.
    expect(renders).toBe(1);
  });

  it('renders again for a change that arrives after the flush', async () => {
    let renders = 0;
    stateEngine.subscribe(() => { renders += 1; });

    stateEngine.notify();
    await flushMicrotasks();
    expect(renders).toBe(1);

    // A later, separate change gets its own render - coalescing batches within
    // a task, it does not swallow future updates.
    stateEngine.notify();
    stateEngine.notify();
    await flushMicrotasks();
    expect(renders).toBe(2);
  });

  it('renders from the latest state, not a stale snapshot', async () => {
    let seen: unknown = null;
    stateEngine.subscribe((data: any) => { seen = data.currentLang; });

    stateEngine.data.currentLang = 'en';
    stateEngine.notify();
    stateEngine.data.currentLang = 'rw'; // changes again before the flush runs
    stateEngine.notify();

    await flushMicrotasks();

    // The single coalesced render reflects the final value.
    expect(seen).toBe('rw');
  });
});
