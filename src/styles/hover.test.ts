/**
 * Hover feedback, guarded.
 *
 * An audit of the rendered pages found 73 of 194 clickable elements with no
 * hover response of any kind - the slider dots, "View all deals", the language
 * switcher, the logo, the green All Categories button, the active nav item,
 * the whole mobile tab bar, every admin action button and most of the Gasabo
 * portal. A control that does not react is one a visitor cannot tell is a
 * control.
 *
 * Two things here are easy to break by accident and invisible when broken:
 *
 *  1. The inline-style rule. Nearly a quarter of the clickable elements in
 *     this codebase set their colours with an inline `style` attribute, and an
 *     inline declaration beats any stylesheet rule for the same property. A
 *     `background` hover for those does nothing whatsoever. `filter` is the
 *     only property not spoken for inline, which is why the rule uses it - and
 *     why someone "tidying" it into a background change would silently undo
 *     hover across both admin panels and the Gasabo portal.
 *
 *  2. The class constants in Header.js. Both nav links and both tab bar
 *     buttons take their classes from a shared string, so the hover for a
 *     dozen controls lives in two lines.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync('src/styles/main.css', 'utf8');
const HEADER = readFileSync('src/components/Header.js', 'utf8');

/** Every selector in main.css that carries :hover. */
const hoverSelectors = (() => {
  const out: string[] = [];
  for (const rule of CSS.split('}')) {
    const head = rule.split('{')[0];
    if (head && head.includes(':hover')) out.push(...head.split(',').map((s) => s.trim()));
  }
  return out.filter((s) => s.includes(':hover'));
})();

const covers = (selector: string) => hoverSelectors.some((s) => s.includes(selector));

describe('inline-styled controls', () => {
  it('are reached by a rule that does not fight the inline declaration', () => {
    // The admin panels and the Gasabo portal set colours inline. Only a
    // property nothing sets inline can win, and filter is that property.
    for (const sel of ['button[style]', 'a[style]']) {
      const rule = hoverSelectors.find((s) => s.includes(sel));
      expect(rule, `no hover rule for ${sel}`).toBeTruthy();
    }
    const block = CSS.slice(CSS.indexOf('button[style]'));
    expect(block.slice(0, 300), 'the inline-style hover must use filter').toContain('filter:');
  });

  it('does not fire on a disabled control', () => {
    const rule = hoverSelectors.find((s) => s.includes('button[style]'));
    expect(rule).toContain(':not([disabled])');
  });

  it('leaves nothing set on touch screens', () => {
    // Without this a tap leaves the hover state stuck on, which reads as a
    // selection nobody made.
    expect(CSS).toContain('@media (hover: none)');
    const idx = CSS.indexOf('@media (hover: none)');
    expect(CSS.slice(idx, idx + 400)).toContain('filter: none');
  });
});

describe('named controls each keep their hover', () => {
  // Every one of these was bare before, and each is the only affordance on
  // that control.
  const NAMED = [
    '#nav-all-categories-2',
    // .lang-pick is not here: the three language buttons take their hover
    // from utilities in the markup, so it is guarded against Header.js below.
    '#nav-brand-home',
    '#re-logo-home',
    '#hero-search-form',
    '#flash-deals-card',
    '.dot',
    '.view-deals',
    '.notif-item',
    '.re-foot-link',
    '.re-property-card',
    '.ad-type-btn',
    '#lightbox-close-btn',
    '#lightbox-prev-btn',
    '#lightbox-next-btn',
    'select',
  ];

  for (const sel of NAMED) {
    it(`${sel}`, () => {
      expect(covers(sel), `${sel} has no :hover rule in main.css`).toBe(true);
    });
  }
});

describe('Header.js class constants', () => {
  it('gives the active nav item a hover, not just the inactive ones', () => {
    // navLink has carried hover:text-gray-300 all along. navLinkActive did
    // not, so the one item guaranteed to be on screen was the one that never
    // responded.
    const line = HEADER.match(/const navLinkActive = '([^']+)'/);
    expect(line, 'navLinkActive not found').toBeTruthy();
    expect(line![1], 'navLinkActive has no hover').toContain('hover:');
  });

  it('gives the mobile tab bar a hover', () => {
    const line = HEADER.match(/const tab = '([^']+)'/);
    expect(line, 'tab constant not found').toBeTruthy();
    expect(line![1], 'the tab bar has no hover').toContain('hover:');
  });

  it('gives each language button a hover, and none to the one in use', () => {
    // The three sit on the green strip in a row now rather than behind a
    // chevron. The active one is deliberately inert - it is already selected,
    // and offering hover feedback on a no-op is a promise the click cannot
    // keep.
    const block = HEADER.slice(HEADER.indexOf('lang-pick'), HEADER.indexOf('</button>', HEADER.indexOf('lang-pick')));
    expect(block, 'the inactive language buttons have no hover').toContain('hover:');
    expect(block, 'the active language is marked so it can be styled apart')
      .toContain("l.code === currentLang");
  });

  it('still has both nav constants distinct', () => {
    // A copy-paste that made them identical would lose the active state.
    const a = HEADER.match(/const navLink = '([^']+)'/)![1];
    const b = HEADER.match(/const navLinkActive = '([^']+)'/)![1];
    expect(a).not.toBe(b);
    expect(b).toContain('border-brand-orange');
  });
});
