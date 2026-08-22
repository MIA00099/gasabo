/**
 * The header and mobile tab bar, after a round of fixes that were all about
 * controls lying about what they do.
 *
 * Each of these was a real complaint, and each has the same shape: something
 * on screen that looked like it worked. A button whose intended colour only
 * appeared on hover, so on a phone - where there is no hover - it never
 * appeared at all. A "Post an Ad" button that offered a signed-in seller a
 * form to create the account they were already signed into. Two nav items and
 * a tab-bar slot that existed only to say "coming soon". A delivery promise
 * the platform does not make.
 *
 * Source assertions, because the markup is where each of them lives.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const HEADER = readFileSync('src/components/Header.js', 'utf8');
const MAIN = readFileSync('src/main.js', 'utf8');
const I18N = readFileSync('src/store/i18n.js', 'utf8');

/** The rendered markup, with the explanatory comments stripped out. */
const markup = (src: string) => src.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*(\/\/|\*|\/\*).*$/gm, '');

describe('the Post an Ad button', () => {
  it('wears its intended colour without being hovered', () => {
    // The two oranges were the wrong way round: bg-brand-orange resting and
    // the deeper orange-500 only on hover. A phone has no hover, so the
    // deeper shade was unreachable there.
    const tag = HEADER.match(/<button[^>]*id="header-post-ad-btn"[\s\S]{0,300}?>/);
    expect(tag, 'the Post an Ad button moved').toBeTruthy();
    expect(tag![0], 'resting colour').toContain('bg-orange-500');
    expect(tag![0], 'hover colour').toContain('hover:bg-brand-orange');
    expect(tag![0], 'the old resting colour is back').not.toMatch(/(?<!hover:)bg-brand-orange/);
  });
});

describe('a signed-in person is never offered a sign-up form', () => {
  it('routes Post an Ad and the account tab by role', () => {
    // All three used to call setPortal('signup') unconditionally.
    expect(MAIN).toContain('function goAccountOrSignup()');
    expect(MAIN).toContain('stateEngine.routeToDashboard()');
    const bare = MAIN.match(/goSignup: \(\) => stateEngine\.setPortal\('signup'\)/g) || [];
    expect(bare, 'a handler still goes straight to signup').toEqual([]);
  });

  it('gives them a way back to their own dashboard from the shop', () => {
    // Without this a seller who wandered out to the marketplace had no route
    // home at all.
    expect(markup(HEADER)).toContain('id="header-dashboard-btn"');
    expect(HEADER).toContain("on('#header-dashboard-btn', 'click', goDashboard)");
    expect(MAIN).toContain('goDashboard: () => stateEngine.routeToDashboard()');
  });

  it('still sends a signed-out visitor to sign up', () => {
    const fn = MAIN.slice(MAIN.indexOf('function goAccountOrSignup()'));
    expect(fn.slice(0, 400)).toContain("role === 'guest'");
    expect(fn.slice(0, 400)).toContain("setPortal('signup')");
  });
});

describe('the nav row', () => {
  const navList = HEADER.slice(HEADER.indexOf('<ul class="hidden lg:flex'), HEADER.indexOf('</ul>'));
  const items = [...navList.matchAll(/t\('(ui_[a-z_]+)'\)/g)].map((m) => m[1]);

  it('has Jobs, and has it immediately before More', () => {
    expect(items).toContain('ui_jobs');
    expect(items.indexOf('ui_jobs')).toBe(items.indexOf('ui_more') - 1);
  });

  it('makes More open a menu instead of apologising', () => {
    // It was data-soon: a chevron promising a list, then a "coming soon"
    // toast. Anything still carrying data-soon says so honestly; More no
    // longer should.
    const more = navList.match(/<button[^>]*id="nav-link-more"[\s\S]{0,200}?>/);
    expect(more, 'the More button moved').toBeTruthy();
    expect(more![0]).not.toContain('data-soon');
    expect(more![0]).toContain('aria-haspopup="menu"');
    expect(HEADER).toContain("on('#nav-link-more', 'click'");
  });

  it('lists only the categories that have no nav item of their own', () => {
    // Offering Vehicles inside More when Vehicles is already its own item
    // two places to the left is just noise.
    const handler = MAIN.slice(MAIN.indexOf('openMore:'), MAIN.indexOf('openMore:') + 700);
    expect(handler).toContain('alreadyInNav');
    for (const word of ['vehicle', 'real', 'job']) {
      expect(handler.toLowerCase(), `More does not exclude ${word}`).toContain(word);
    }
  });

  it('does not send Jobs to the unfiltered catalog when no such category exists', () => {
    // Returning "all" would show every listing on the site under a heading
    // the reader asked to filter by - which is how the old category strip
    // behaved and read as broken.
    expect(MAIN).toContain('if (!match) return false;');
    const jobs = MAIN.slice(MAIN.indexOf('goJobs:'), MAIN.indexOf('goJobs:') + 400);
    expect(jobs).toContain('notReadyToast');
  });
});

describe('the phone', () => {
  const tabBar = HEADER.slice(HEADER.indexOf('renderMobileTabBarHtml'), HEADER.indexOf('export function bindHeaderEvents'));

  it('offers Stores rather than a button that only says "coming soon"', () => {
    expect(markup(tabBar)).toContain('id="mtab-stores"');
    expect(markup(tabBar), 'the dead Messages button is back').not.toContain('data-soon="Messages"');
    expect(HEADER).toContain("root.querySelector('#mtab-stores')?.addEventListener('click', goStores)");
  });

  it('has no dead buttons left in the tab bar at all', () => {
    expect(markup(tabBar).match(/data-soon/g) || []).toEqual([]);
  });

  it('shows the language switcher, which used to be desktop-only', () => {
    // It was hidden below md because the strip had no room beside the
    // delivery notice - which left a phone with no way to change language.
    const strip = HEADER.slice(HEADER.indexOf('Choose a language') - 400, HEADER.indexOf('Choose a language') + 200);
    expect(strip, 'the language row is hidden on small screens again').not.toMatch(/hidden\s+md:flex/);
  });
});

describe('the delivery promise', () => {
  it('is gone from the markup', () => {
    expect(markup(HEADER)).not.toContain('Free Delivery');
    expect(markup(HEADER)).not.toContain('ui_free_delivery');
  });

  it('is gone from every language', () => {
    // Left behind it would be a dead key that the parity test happily keeps
    // in step across all three languages forever.
    expect(I18N).not.toContain('ui_free_delivery');
  });
});
