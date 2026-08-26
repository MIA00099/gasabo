// @vitest-environment jsdom
/**
 * The product gallery must keep the photo you selected when the page re-renders.
 *
 * Opening a listing kicks off async loaders (related products, like state); when
 * each finishes it notifies, and main.js rebuilds the whole product view. The
 * gallery's active index used to be a local that reset to 0 on every rebuild, so
 * a second after you clicked to photo 3 it "snapped back to the first one". The
 * selection is now remembered at module scope, keyed by listing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../api/client.js', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ products: [], liked: false, likeCount: 0 }),
    post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), uploadFile: vi.fn(),
  },
  getSession: () => null,
  setSession: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

// jsdom does not implement scrollIntoView, which selectImage calls.
(window.HTMLElement.prototype as any).scrollIntoView = vi.fn();

const IMGS = ['/photo-a.jpg', '/photo-b.jpg', '/photo-c.jpg'];
const makeProduct = (id: string) => ({
  id, title: 'Test Monitor', price: 100000, currency: 'RWF', district: 'Gasabo',
  categoryId: 'cat-1', rating: 4, images: IMGS,
});

let renderProductDetailPage: any;
let stateEngine: any;
let apiGet: any;
let container: HTMLElement;

beforeEach(async () => {
  vi.resetModules(); // fresh module state (the remembered gallery index) per test
  ({ renderProductDetailPage } = await import('./ProductDetailPage.js'));
  ({ stateEngine } = await import('../../store/stateEngine.js'));
  ({ api: { get: apiGet } } = await import('../../api/client.js') as any);
  apiGet.mockClear();
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
});

const likeFetchCount = () =>
  apiGet.mock.calls.filter((c: any[]) => /\/like\b/.test(String(c[0]))).length;

const mainSrc = () => container.querySelector('#detail-main-img')!.getAttribute('src');

describe('product gallery selection survives re-renders', () => {
  it('starts on the first photo', () => {
    renderProductDetailPage(container, makeProduct('p1'));
    expect(mainSrc()).toBe('/photo-a.jpg');
  });

  it('keeps the chosen photo when the same listing re-renders', () => {
    renderProductDetailPage(container, makeProduct('p1'));

    // Choose the third photo.
    (container.querySelector('.detail-thumb[data-index="2"]') as HTMLElement).click();
    expect(mainSrc()).toBe('/photo-c.jpg');

    // A re-render (e.g. related products finished loading) rebuilds the page.
    renderProductDetailPage(container, makeProduct('p1'));

    // It must still show the third photo, not snap back to the first.
    expect(mainSrc()).toBe('/photo-c.jpg');
    expect(container.querySelector('#main-counter')!.textContent).toBe('3 / 3');
    // and the third thumbnail is the highlighted one
    const active = container.querySelector('.detail-thumb[data-index="2"]')!;
    expect(active.className).toContain('border-brand-green');
  });

  it('advances with the next arrow and holds through a re-render', () => {
    renderProductDetailPage(container, makeProduct('p1'));
    (container.querySelector('#main-next') as HTMLElement).click(); // -> photo 2
    expect(mainSrc()).toBe('/photo-b.jpg');

    renderProductDetailPage(container, makeProduct('p1'));
    expect(mainSrc()).toBe('/photo-b.jpg');
  });

  it('does not re-fetch like state once it is known (no render loop)', () => {
    // loadLikeState() calls notify(), which re-renders the whole page. When the
    // fetch ran on every render it re-triggered itself endlessly - the page
    // re-fetched /like and rebuilt roughly once a second for as long as it was
    // open. It must fetch at most once per listing.
    renderProductDetailPage(container, makeProduct('p1'));
    expect(likeFetchCount()).toBe(1);

    // Simulate the fetch having resolved (state.likes now populated), then a
    // re-render (the notify that fetch itself would fire).
    stateEngine.data.likes = { p1: { liked: false, likeCount: 0 } };
    renderProductDetailPage(container, makeProduct('p1'));

    // Still one - the known branch paints without fetching again.
    expect(likeFetchCount()).toBe(1);
  });

  it('resets to the first photo when a different listing is opened', () => {
    renderProductDetailPage(container, makeProduct('p1'));
    (container.querySelector('.detail-thumb[data-index="2"]') as HTMLElement).click();
    expect(mainSrc()).toBe('/photo-c.jpg');

    renderProductDetailPage(container, makeProduct('p2')); // different listing
    expect(mainSrc()).toBe('/photo-a.jpg');
  });
});
