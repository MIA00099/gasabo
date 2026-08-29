/**
 * The hero slider and the Flash Deals card, checked as markup.
 *
 * Both are hand-written template strings. The slider's failure mode is that a
 * slide added without its matching dot is simply unreachable from the dots -
 * the timer still cycles onto it, so nothing looks broken until someone tries
 * to click back to it. startHeroSlider() reads `.slide` and `.dot` straight
 * from the DOM, so the two counts have to be kept in step by hand.
 *
 * The other thing guarded here is that the slider has no built-in content.
 * It used to carry six hardcoded slides that rendered whenever there were no
 * admin ads, so an admin who deleted every ad got those six back and had no
 * way to remove them - they appeared nowhere in the ads section. Every slide
 * must now come from state.banners.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

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
  it('has no built-in slides - every slide comes from an admin ad', () => {
    // A literal <div class="slide ..."> with a hardcoded data-slide number is
    // exactly the fallback content that came back when the ads were deleted.
    const literalSlides = [...SLIDER.matchAll(/class="slide[^"$]*" data-slide="(\d+)"/g)];
    expect(literalSlides.map((m) => m[0]), 'hardcoded slides are back').toEqual([]);

    // Nor any bundled slide art or onerror fallback pointing at it.
    const literalImgs = [...SLIDER.matchAll(/<img[^>]+src="\/[^"$]+"/g)].map((m) => m[0]);
    expect(literalImgs, 'slide images must come from the ad, not public/').toEqual([]);
    expect(SLIDER, 'no bundled-art fallbacks').not.toMatch(/this\.src='\//);
  });

  it('renders one slide per hero ad', () => {
    expect(SLIDER, 'slides must map over heroAds').toMatch(/\$\{heroAds\.map\(\(ad, i\) =>/);
    expect(SLIDER, 'ad image comes from the ad record').toContain('escapeHtml(ad.image)');
  });

  it('generates one dot per ad, so every slide stays reachable', () => {
    // The dots render from `dotCount`, which must be the ad count - the driver
    // pairs .slide and .dot by index straight from the DOM.
    const literalDots = [...SLIDER.matchAll(/class="dot[^"$]*" data-dot="(\d+)"/g)];
    expect(literalDots.map((m) => m[0]), 'dots should be generated, not literal').toEqual([]);
    expect(SLIDER, 'dots must map over dotCount').toMatch(/length:\s*dotCount\s*\}/);
    expect(HOME, 'dotCount must be the ad count').toMatch(/const dotCount = heroAds\.length;/);
  });

  it('hides the dots when there is nothing to switch between', () => {
    // Zero ads leaves an empty panel and one ad never rotates; a row of dots
    // over either is a control that does nothing.
    expect(SLIDER, 'dots must be gated on more than one ad').toMatch(/\$\{dotCount > 1 \?/);
  });

  it('renders admin hero ads as cover-slides so any-shape banners fill without cropping', () => {
    // Admin-uploaded ads are full photos/banners of any aspect ratio, so they
    // get the cover-slide treatment: a blurred, zoomed backdrop of the image
    // (.slide-bg) behind the whole, uncropped image (.slide-fg). Without this
    // an uploaded banner rendered tiny and boxed in flat navy.
    expect(SLIDER, 'ad slides must be cover-slides').toMatch(/class="slide cover-slide/);
    expect(SLIDER, 'blurred backdrop image').toContain('class="slide-bg"');
    expect(SLIDER, 'sharp foreground image').toContain('class="slide-fg"');
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
    const countdown = HOME.indexOf('<div class="countdown"');
    expect(countdown).toBeGreaterThan(headEnd);
  });

  it('still has the three labelled time boxes the clock writes into', () => {
    // updateCountdown() looks these ids up by hand; renaming one silently
    // freezes that digit.
    for (const id of ['deal-hours', 'deal-mins', 'deal-secs']) {
      expect(HOME, `#${id} missing`).toContain(`id="${id}"`);
    }
  });

  it('only renders the countdown boxes when a real flash deal exists', () => {
    const emptyText = HOME.indexOf('<p class="flash-empty">');
    const countdownGate = HOME.indexOf('${featuredDeal ? `\n                  <div class="countdown"');

    expect(emptyText, 'empty flash-deal message missing').toBeGreaterThan(-1);
    expect(countdownGate, 'countdown must be gated by featuredDeal').toBeGreaterThan(emptyText);
    expect(HOME, 'clock should not run without a deal end time').toContain('if (!endsAt) return;');
  });
});
