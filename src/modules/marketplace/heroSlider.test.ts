/**
 * The hero slider and the Flash Deals card, checked as markup.
 *
 * Both are hand-written template strings, and both have a failure mode that
 * looks fine in every other test: a slide whose image filename is wrong
 * renders an empty panel (the browser 404s and moves on), and a slide added
 * without its matching dot is simply unreachable from the dots - the timer
 * still cycles onto it, so nothing looks broken until someone tries to click
 * back to it.
 *
 * startHeroSlider() reads `.slide` and `.dot` straight from the DOM, so the
 * two counts have to be kept in step by hand. That is what this guards.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const HOME = readFileSync('src/modules/marketplace/MarketplaceView.js', 'utf8');

// The slider markup only - so a product card image elsewhere in the file
// cannot satisfy or break these.
const SLIDER = (() => {
  const a = HOME.indexOf('<div class="slider-container" id="heroSlider">');
  const b = HOME.indexOf('</div>', HOME.indexOf('<div class="slider-dots"'));
  expect(a, 'slider container not found').toBeGreaterThan(-1);
  return HOME.slice(a, b);
})();

describe('hero slider', () => {
  const slides = [...SLIDER.matchAll(/class="slide[^"]*" data-slide="(\d+)"/g)].map((m) => Number(m[1]));
  const dots = [...SLIDER.matchAll(/class="dot[^"]*" data-dot="(\d+)"/g)].map((m) => Number(m[1]));

  it('has at least the two slides the driver needs to animate', () => {
    // startHeroSlider bails out below two, leaving a static panel.
    expect(slides.length).toBeGreaterThanOrEqual(2);
  });

  it('numbers its slides from zero with no gaps', () => {
    expect(slides).toEqual(slides.map((_, i) => i));
  });

  it('gives every slide exactly one dot', () => {
    expect(dots).toEqual(slides);
  });

  it('points every slide at an image that is actually in public/', () => {
    const srcs = [...SLIDER.matchAll(/<img src="(\/[^"]+)"/g)].map((m) => m[1]);
    expect(srcs.length, 'no slide images found - has the markup changed?').toBeGreaterThan(0);

    const missing = srcs.filter((src) => !existsSync(`public${src}`));
    expect(missing, `not in public/: ${missing.join(', ')}`).toEqual([]);
  });

  it('also ships the fallback the first slide falls back to', () => {
    // Slide 1 carries onerror="...src='/hero-section.png'". If that file goes
    // missing the fallback fails silently and the slide stays blank.
    const fallback = HOME.match(/this\.src='(\/[^']+)'/);
    expect(fallback, 'onerror fallback not found').toBeTruthy();
    expect(existsSync(`public${fallback![1]}`), `${fallback![1]} is missing`).toBe(true);
  });

  it('gives every photo slide a caption, and every caption a photo', () => {
    // Anchored on data-slide rather than the class, because "slide-caption"
    // starts with "slide" too and splitting on the bare class cuts each
    // photo slide in half.
    const marks = [...SLIDER.matchAll(/<div class="slide([^"]*)" data-slide="\d+">/g)];
    expect(marks.length, 'no slides matched').toBe(slides.length);

    for (let i = 0; i < marks.length; i++) {
      const from = marks[i].index!;
      const to = i + 1 < marks.length ? marks[i + 1].index! : SLIDER.indexOf('<div class="slider-dots"');
      const block = SLIDER.slice(from, to);

      const hasCaptionClass = marks[i][1].includes('has-caption');
      const hasImg = block.includes('<img');
      const hasCaption = block.includes('slide-caption');
      // .has-caption is what switches the slide to the column layout that
      // leaves room under the picture; a caption without it lands on top of
      // the image.
      expect(hasCaptionClass, `slide with caption=${hasCaption} img=${hasImg} is mislabelled`)
        .toBe(hasImg && hasCaption);
    }
  });
});

describe('flash deals card', () => {
  it('puts the heading and the link in one row wrapper', () => {
    // Without .flash-head the two stack, which is what the card looked like
    // before the reference screenshot.
    const head = HOME.match(/<div class="flash-head">([\s\S]*?)<\/div>/);
    expect(head, '.flash-head wrapper not found').toBeTruthy();
    expect(head![1]).toContain('<h2>');
    expect(head![1]).toContain('id="open-flash-deals-btn"');
  });

  it('keeps the countdown outside that row', () => {
    const headEnd = HOME.indexOf('</div>', HOME.indexOf('<div class="flash-head">'));
    const countdown = HOME.indexOf('<div class="countdown">');
    expect(countdown).toBeGreaterThan(headEnd);
  });

  it('still has the three labelled time boxes the clock writes into', () => {
    // updateCountdown() looks these ids up by hand; renaming one silently
    // freezes that digit.
    for (const id of ['deal-hours', 'deal-mins', 'deal-secs']) {
      expect(HOME, `#${id} missing`).toContain(`id="${id}"`);
    }
  });
});
