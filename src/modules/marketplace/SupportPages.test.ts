// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: { route: { kind: 'home', id: null }, ui: {} },
  setRoute: vi.fn(),
}));

vi.mock('../../store/stateEngine.js', () => ({
  stateEngine: {
    getState: () => mocks.state,
    setRoute: (...args: any[]) => mocks.setRoute(...args),
  },
}));

beforeEach(() => {
  document.body.innerHTML = '';
  mocks.setRoute.mockReset();
});

describe('marketplace support pages', () => {
  it('renders help center safety tips and real contact labels', async () => {
    const { renderHelpCenterPage } = await import('./SupportPages.js');
    const container = document.createElement('div');

    renderHelpCenterPage(container);

    expect(container.textContent).toContain('Help Center');
    expect(container.textContent).toContain('Safety Tips for Buying & Selling');
    expect(container.textContent).toContain("Don't do anything online");
    expect(container.textContent).toContain('Call/WhatsApp');
    expect(container.textContent).toContain('+250 788 350 555');
    expect(container.textContent).toContain('kigalimarket@gmail.com');
    expect(container.textContent).toContain('Kigali, Rwanda');
    expect(container.textContent).not.toContain('main.help_center');
  });

  it('renders searchable FAQ content from the supplied questions', async () => {
    const { renderFaqPage } = await import('./SupportPages.js');
    const container = document.createElement('div');

    renderFaqPage(container);

    expect(container.textContent).toContain('Frequently Asked Questions');
    expect(container.textContent).toContain('What is Kigali Market?');
    expect(container.textContent).toContain('How can I post an ad on Kigali Market?');
    expect(container.textContent).toContain('Is there a fee to post ads on Kigali Market?');
    expect(container.textContent).toContain('How do I report fraud or suspicious activity?');
    expect(container.querySelector('#faq-search')).toBeTruthy();
    expect(container.querySelector('[data-faq-category="selling"]')).toBeTruthy();
  });

  it('filters FAQ answers by search text', async () => {
    const { renderFaqPage } = await import('./SupportPages.js');
    const container = document.createElement('div');
    renderFaqPage(container);

    const search = container.querySelector<HTMLInputElement>('#faq-search')!;
    search.value = 'police';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    const visibleQuestions = Array.from(container.querySelectorAll<HTMLDetailsElement>('.support-faq-item'))
      .filter((item) => !item.hidden)
      .map((item) => item.querySelector('summary')?.textContent?.trim());

    expect(visibleQuestions).toEqual(['How do I report fraud or suspicious activity?']);
    expect(container.querySelector('#faq-result-count')!.textContent).toContain('1 answer available');
  });
});
