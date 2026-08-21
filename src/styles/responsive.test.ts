/**
 * The rules that keep the layout edge-to-edge and overflow-free.
 *
 * Measured in the browser at 320, 375, 425, 768, 1024, 1280, 1440 and 1920:
 * no horizontal overflow at any width, no element wider than the viewport, no
 * 100vw, no fixed element reaching outside, and html/body carrying no margin
 * or padding. The audit found three real defects and a set of undersized tap
 * targets; this guards the fixes.
 *
 * These are source assertions rather than rendered ones. A layout regression
 * shows up as a scrollbar in a browser, and no unit test can see that - but
 * every one of these defects had a single line behind it, and that line is
 * checkable.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync('src/styles/main.css', 'utf8');
const HOME = readFileSync('src/modules/marketplace/MarketplaceView.js', 'utf8');
const STORES = readFileSync('src/modules/marketplace/StoresPage.js', 'utf8');
const INDEX = readFileSync('index.html', 'utf8');

describe('the page runs to both edges', () => {
  it('keeps the container tokens full-bleed', () => {
    // --page-max: 100% and --page-gutter: 0 are what make .compact-container
    // edge-to-edge. Either one drifting reintroduces the side gaps.
    expect(CSS).toMatch(/--page-max:\s*100%/);
    expect(CSS).toMatch(/--page-gutter:\s*0px/);
  });

  it('does not put horizontal padding back on the home view', () => {
    // p-2 here was the one thing contradicting --page-gutter: it inset the
    // home content 8px on both sides while the header, nav and announcement
    // strip all ran to the glass. py-2 keeps the vertical rhythm.
    const tag = HOME.match(/<div id="view-home" class="([^"]+)"/);
    expect(tag, 'the home view root moved').toBeTruthy();
    const classes = tag![1].split(/\s+/);
    expect(classes, 'p-2 pads all four sides - use py-2').not.toContain('p-2');
    expect(classes.filter((c) => /^(px|pl|pr|p)-/.test(c)), 'no horizontal padding on the home root').toEqual([]);
  });

  it('never sizes anything to 100vw', () => {
    // 100vw is the viewport including the scrollbar, so a full-width element
    // measured that way overflows by exactly the scrollbar's width.
    //
    // index.html is checked as well as the stylesheet. The first version of
    // this test looked only at main.css and passed while the preloader in
    // index.html still carried width:100vw - a horizontal scrollbar on the
    // very first paint, before the app had even booted. Production is where
    // that turned up, not here.
    for (const [name, text] of [['main.css', CSS], ['index.html', INDEX]] as const) {
      const offenders = [...text.matchAll(/^[^\n]*\b(width|min-width|max-width|margin-left|margin-right)\s*:\s*[^;\n]*100vw[^;\n]*/gm)]
        .map((m) => m[0].trim());
      expect(offenders, `100vw in ${name}: ${offenders.join(' | ')}`).toEqual([]);
    }
  });
});

describe('flex children that could not shrink', () => {
  // A flex item defaults to min-width:auto, so it cannot go narrower than its
  // own content and simply overhangs instead. Both of these did.

  it('lets the product tile rating row shrink and wrap', () => {
    // At 1024 the like count hung 15px past the card's content box.
    const row = HOME.match(/<div class="([^"]*text-yellow-400[^"]*)">/);
    expect(row, 'the rating row moved').toBeTruthy();
    expect(row![1]).toContain('min-w-0');
    expect(row![1]).toContain('flex-wrap');
  });

  it('lets the store card name block shrink', () => {
    // At 320 a long seller name pushed this 14px past its row.
    //
    // Anchored on the initials avatar rather than on "flex items-center
    // gap-3", which also matches an unrelated row earlier in the file - the
    // first version of this test asserted against that one and passed for the
    // wrong reason.
    const avatar = STORES.indexOf('${store.initials}');
    expect(avatar, 'the store card avatar moved').toBeGreaterThan(-1);
    const head = STORES.slice(STORES.lastIndexOf('<div class="flex items-center', avatar), avatar);

    expect(head, 'the row itself needs min-w-0').toContain('min-w-0');
    // and the text column beside the avatar
    expect(STORES.slice(avatar, avatar + 400), 'the name column needs min-w-0')
      .toContain('<div class="min-w-0">');
  });
});

describe('touch targets', () => {
  it('scopes the sizing to coarse pointers only', () => {
    // Growing these unconditionally would change the desktop design, which
    // is not what was asked for.
    expect(CSS).toContain('@media (pointer: coarse)');
  });

  it('gives the slider dots a target without resizing the dot', () => {
    // The dots are 8px by design. ::after reaches out to 24px so a finger has
    // something to land on, and .slider-dots' gap grows to match so two
    // neighbouring targets cannot overlap and steal each other's taps.
    const block = CSS.slice(CSS.indexOf('@media (pointer: coarse)'));
    expect(block).toMatch(/\.dot::after\s*\{[^}]*width:\s*24px/);
    expect(block).toMatch(/\.slider-dots\s*\{[^}]*gap:\s*16px/);
    // 8px dot + 16px gap = 24px between centres, exactly the target width.
    const dotSize = CSS.match(/^\.dot \{[^}]*width:\s*(\d+)px/m);
    expect(dotSize).toBeTruthy();
    expect(Number(dotSize![1]) + 16).toBeGreaterThanOrEqual(24);
  });

  it('raises the short text controls to a usable height', () => {
    const block = CSS.slice(CSS.indexOf('@media (pointer: coarse)'));
    for (const sel of ['.view-deals', '.foot-nav-link', '.footer-phone-link', '#header-logout-btn', '#products-sort']) {
      expect(block, `${sel} has no coarse-pointer sizing`).toContain(sel);
    }
    expect(block).toMatch(/min-height:\s*3[26]px/);
  });
});

describe('ultrawide', () => {
  it('adds columns instead of capping the page', () => {
    // Capping would undo the full-bleed layout; more columns keeps the cards
    // a sane size on a 1920 monitor.
    expect(CSS).toMatch(/@media \(min-width: 1536px\)/);
    expect(CSS).toMatch(/@media \(min-width: 1800px\)/);
    expect(HOME).toContain('home-more-grid');
  });

  it('gives that rule specificity Tailwind cannot outrank', () => {
    // Tailwind emits its responsive variants at the very end of the compiled
    // sheet - .lg\:grid-cols-5 lands around rule 1106, anything appended to
    // main.css around 1015 - so a single .home-more-grid rule ties on
    // specificity and loses on source order. This was measured, not guessed:
    // the first version of the rule computed to 5 columns at 1920.
    expect(CSS, 'the doubled class is what wins the cascade')
      .toContain('.home-more-grid.home-more-grid');
  });
});
