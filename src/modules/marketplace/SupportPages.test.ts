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

  it('renders the About page from the company profile document', async () => {
    const { renderAboutPage } = await import('./SupportPages.js');
    const container = document.createElement('div');

    renderAboutPage(container);

    expect(container.textContent).toContain('About Kigali Market');
    expect(container.textContent).toContain('Who We Are');
    expect(container.textContent).toContain("Rwanda's leading online classifieds marketplace");
    expect(container.textContent).toContain('Our Values');
    expect(container.textContent).toContain('Trust & Safety');
    expect(container.textContent).toContain('kigalimarket@gmail.com');
  });

  it('renders the Terms & Conditions page from the terms document', async () => {
    const { renderTermsPage } = await import('./SupportPages.js');
    const container = document.createElement('div');

    renderTermsPage(container);

    expect(container.textContent).toContain('Terms & Conditions');
    expect(container.textContent).toContain('Using Kigali Market');
    expect(container.textContent).toContain('All fees are in Rwandan Francs and are non-refundable.');
    expect(container.textContent).toContain('governed by the laws of Rwanda');
    expect(container.textContent).toContain('Last updated');
  });

  it('renders the Privacy Policy page from the privacy document', async () => {
    const { renderPrivacyPage } = await import('./SupportPages.js');
    const container = document.createElement('div');

    renderPrivacyPage(container);

    expect(container.textContent).toContain('Privacy Policy');
    expect(container.textContent).toContain('Information We Collect');
    expect(container.textContent).toContain('We do not sell your personal data');
    expect(container.textContent).toContain('Your Rights');
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
