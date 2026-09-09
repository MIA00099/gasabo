/**
 * The hero slider and the Flash Deals card, checked as markup.
 *
 * Both are hand-written template strings. The slider's failure mode is that a
 * slide added without its matching dot is simply unreachable from the dots.
 * startHeroSlider() reads `.slide` and `.dot` straight from the DOM, so the
 * two counts have to be kept in step by hand.
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
const CSS = readFileSync('src/styles/main.css', 'utf8');

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

  it('auto-rotates the hero ads gently - pausable, and off for reduced motion', () => {
    const driver = HOME.slice(HOME.indexOf('function startHeroSlider'), HOME.indexOf('function startFlashClock'));
    // It rotates on a timer now, but every guard that keeps it from reading
    // like a page refresh has to be there.
    expect(driver, 'the ads advance on a timer').toContain('setInterval');
    expect(driver, 'not a jittery fast step').toContain('HERO_ROTATE_MS = 6000');
    expect(driver, 'off for prefers-reduced-motion').toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(driver, 'paused while the tab is in the background').toContain("document.visibilityState === 'hidden'");
    expect(driver, 'paused on hover / keyboard focus').toContain("slider.matches(':hover')");
    expect(driver, 'manual dots still switch slides').toContain("dot.addEventListener('click'");
    expect(driver, 'a manual pick restarts the timer').toMatch(/show\(Number\(dot\.dataset\.dot\)\);\s*scheduleRotation\(\);/);
  });

  it('changes slides with an opacity fade, not a horizontal shake', () => {
    const slideStart = CSS.indexOf('.slide {');
    const slideRule = CSS.slice(slideStart, CSS.indexOf('.slide img', slideStart));
    const activeStart = CSS.indexOf('.slide.active {');
    const activeRule = CSS.slice(activeStart, CSS.indexOf('.slide.cover-slide', activeStart));
    expect(slideRule).toContain('transition: opacity');
    expect(slideRule).not.toContain('translateX');
    expect(activeRule).not.toContain('translateX');
  });

  it('resizes admin hero ads into the full frame without CSS cropping', () => {
    // The hero keeps the reference panel shape, but seller/admin ads often
    // include prices, phone numbers, and text. The sharp foreground image is
    // stretched into the slot so no CSS object-fit crop hides ad content; the
    // blurred copy behind it still fills the curved frame for the hero look.
    expect(SLIDER, 'ad slides must be cover-slides').toMatch(/class="slide cover-slide/);
    expect(SLIDER, 'blurred backdrop image').toContain('class="slide-bg"');
    expect(SLIDER, 'sharp foreground image').toContain('class="slide-fg"');
    expect(SLIDER, 'linked ads need a real frame around the foreground image').toContain('class="hero-ad-link"');

    const sliderRule = CSS.match(/\n\.slider-container \{([\s\S]*?)\n\}/)?.[1] || '';
    const fgStart = CSS.indexOf('.slide.cover-slide .slide-fg {');
    const fgRule = CSS.slice(fgStart, CSS.indexOf('}', fgStart));
    const bgStart = CSS.indexOf('.slide.cover-slide .slide-bg {');
    const bgRule = CSS.slice(bgStart, CSS.indexOf('}', bgStart));
    const linkStart = CSS.indexOf('.hero-ad-link {');
    const linkRule = CSS.slice(linkStart, CSS.indexOf('}', linkStart));

    expect(sliderRule, 'hero slider should fill the right hero panel').toContain('height: 100%');
    expect(sliderRule, 'hero slider should not shrink into a banner strip').not.toContain('aspect-ratio');
    expect(fgRule, 'the sharp uploaded ad is resized into the slot without object-fit cropping').toContain('object-fit: fill');
    expect(fgRule, 'the sharp uploaded ad should not be scaled past the frame').toContain('transform: none');
    expect(bgRule, 'the blurred copy fills the curved panel behind it').toContain('object-fit: cover');
    expect(bgRule, 'the blurred copy must stay visible').not.toContain('display: none');
    expect(linkRule, 'foreground ad frame must not add poster padding').not.toContain('padding:');
    expect(linkRule, 'foreground ad frame clips to the slider bounds').toContain('overflow: hidden');
  });

  it('keeps the reference timing while the real ad image stays unscaled', () => {
    const sliderRule = CSS.match(/\n\.slider-container \{([\s\S]*?)\n\}/)?.[1] || '';
    const slideStart = CSS.indexOf('.slide {');
    const slideRule = CSS.slice(slideStart, CSS.indexOf('.slide.active', slideStart));

    expect(sliderRule, 'same 6s stagger as the reference slides').toContain('--hero-slide-ms: 6000ms');
    expect(sliderRule, 'same 18s loop as the three-slide reference HTML').toContain('--hero-reference-loop-ms: 18000ms');
    expect(sliderRule, '5% of the reference 18s loop is a 0.9s fade phase').toContain('--hero-fade-ms: 900ms');
    expect(slideRule).toContain('transition: opacity var(--hero-fade-ms)');
    expect(CSS).toContain('@keyframes heroAdBackdropMove');
    expect(CSS).toContain('.slide.active .slide-bg');
    expect(CSS).toContain('.slide.active .slide-fg');
    expect(CSS).toContain('animation: heroAdBackdropMove var(--hero-slide-ms) ease both');
    expect(CSS).toContain('animation: none');
    expect(CSS).toContain('15%');
    expect(CSS).toContain('90%');
    expect(CSS).toContain('transform: scale(1.08)');
    expect(CSS).toContain('transform: scale(1.05)');
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

  it('has four labelled time boxes, including days, that the clock writes into', () => {
    // The home card asks the shared helper for ids with the "deal-" prefix,
    // and the clock writes through the four stable count-* classes.
    expect(HOME).toContain("countdownBoxesHtml(t, 'deal')");
    for (const cls of ['count-days', 'count-hours', 'count-mins', 'count-secs']) {
      expect(HOME, `.${cls} missing`).toContain(`.${cls}`);
    }
  });

  it('spreads the countdown boxes across the Flash Deals card instead of bunching them in the middle', () => {
    const countdownStart = CSS.indexOf('.flash-deals .countdown {');
    const countdownRule = CSS.slice(countdownStart, CSS.indexOf('}', countdownStart));
    const boxStart = CSS.indexOf('.flash-deals .time-box {');
    const boxRule = CSS.slice(boxStart, CSS.indexOf('}', boxStart));

    expect(countdownRule).toContain('display: grid');
    expect(countdownRule).toContain('grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)');
    expect(countdownRule).toContain('width: 100%');
    expect(boxRule).toContain('width: 100%');
  });

  it('only renders the countdown boxes when a real flash deal exists', () => {
    const emptyText = HOME.indexOf('<p class="flash-empty">');
    const countdownGate = HOME.indexOf('${featuredDeal ? `\n                  <div class="countdown"');

    expect(emptyText, 'empty flash-deal message missing').toBeGreaterThan(-1);
    expect(countdownGate, 'countdown must be gated by featuredDeal').toBeGreaterThan(emptyText);
    expect(HOME, 'clock should not run without a deal end time').toContain('if (countdownScopes.length === 0) return;');
  });

  it('fills the wide Flash Deals row with moving product cards, not a separate promo-ad upload', () => {
    expect(HOME).toContain('class="flash-home-row"');
    expect(HOME).toContain('class="flash-promo-panel"');
    expect(HOME).toContain('class="flash-promo-marquee"');
    expect(HOME).toContain('renderFlashProductRail(state.products || [])');
    expect(HOME).toContain('class="flash-promo-product-card view-item-btn"');
    expect(HOME).not.toContain('renderFlashPromoImages(state.banners || [])');
    expect(HOME, 'FLASH_PROMO ads should not feed the storefront rail').not.toContain("b.type === 'FLASH_PROMO'");
    expect(HOME).not.toContain('class="flash-promo-ad-card"');
    expect(HOME).not.toContain('id="flash-promo-post-ad-btn"');
    expect(HOME).not.toContain('id="flash-promo-worker-btn"');
    expect(HOME).not.toContain('flash-promo-actions');
    expect(HOME).not.toContain('renderFlashPromoCards(heroAds)');
    expect(CSS).toContain('.flash-home-row');
    expect(CSS).toContain('.flash-promo-product-card');
    expect(CSS).toContain('animation: flash-promo-scroll');
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('leads the homepage body - above the Featured & Trending section', () => {
    const flashSection = HOME.indexOf('<!-- Flash Deals - the delivered markup');
    const spotlightSection = HOME.indexOf('<!-- Featured & Trending - a real section');
    const catRail = HOME.indexOf('id="home-category-rail"');
    expect(flashSection).toBeGreaterThan(-1);
    expect(spotlightSection).toBeGreaterThan(-1);
    expect(catRail, 'Flash Deals still sits below the category rail').toBeLessThan(flashSection);
    expect(flashSection, 'Flash Deals must come before Featured & Trending').toBeLessThan(spotlightSection);
  });

  it('opens Flash Deals as its own page instead of a modal or posting CTA', () => {
    expect(HOME).toContain('href="${pathForRoute(ROUTE_FLASH_DEALS)}"');
    expect(HOME).toContain('pathForRoute(ROUTE_FLASH_DEALS)');
    expect(HOME).toContain('export function renderFlashDealsPage');
    expect(HOME).toContain('id="flash-page-back-btn"');
    expect(HOME).toContain('class="flash-page-grid"');
    expect(HOME).not.toContain('id="flash-deals-modal"');
    expect(HOME).not.toContain('openModal');
    expect(HOME).not.toContain('pathForRoute(ROUTE_POST_AD)');
    expect(HOME).not.toContain('pathForRoute(ROUTE_PRODUCTS)');
    expect(HOME).not.toContain('JOBS_CATEGORY_PATTERN');
    expect(HOME).not.toContain('flash-promo-post-ad-btn" href="#"');
    expect(HOME).not.toContain('flash-promo-worker-btn" href="#"');
  });
});
