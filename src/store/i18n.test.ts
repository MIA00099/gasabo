/**
 * Regression: switching language must change what is on screen.
 *
 * The switcher itself worked for a while before this - it stored the choice
 * and re-rendered - but every string in the header, the nav and the homepage
 * hero was written as literal English in the template. The dictionary had 44
 * keys and only the footer read from it, so picking Kinyarwanda changed the
 * flag in the corner and nothing else. "not working whene i change langunge ?"
 * is exactly what that looks like from outside.
 *
 * Two things are guarded here:
 *
 *   1. Key parity. getTranslation falls back to English for a missing key, so
 *      a half-translated dictionary does not throw - it silently serves
 *      English inside an otherwise French page. Only a test catches that.
 *
 *   2. That the templates actually call t(). A future edit that types "Post an
 *      Ad" straight into the markup would pass every other test in the suite
 *      and quietly untranslate that button, so the rendered header and hero
 *      are diffed across all three languages here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { translations, getTranslation, LANGUAGES, languageFor } from './i18n.js';

const CODES = LANGUAGES.map((l) => l.code);

describe('translation dictionary', () => {
  it('offers exactly the three languages the switcher lists', () => {
    expect(CODES).toEqual(['en', 'rw', 'fr']);
    for (const code of CODES) {
      expect(translations[code], `no dictionary for ${code}`).toBeTruthy();
    }
  });

  it('defines every English key in every other language', () => {
    const english = Object.keys(translations.en).sort();
    for (const code of CODES) {
      const missing = english.filter((key) => !(key in translations[code]));
      expect(missing, `${code} is missing ${missing.length} keys`).toEqual([]);
    }
  });

  it('carries no key that only one language has', () => {
    const english = new Set(Object.keys(translations.en));
    for (const code of CODES) {
      const orphans = Object.keys(translations[code]).filter((key) => !english.has(key));
      expect(orphans, `${code} has keys English does not: ${orphans.join(', ')}`).toEqual([]);
    }
  });

  it('does not leave an English string sitting in another language', () => {
    // A handful legitimately match across languages: language endonyms
    // (Kinyarwanda is spelled that way in all three), proper nouns, and words
    // French and English happen to share.
    const SHARED = new Set([
      'lang_toggle_rw', 'lang_toggle_fr',
      'ui_services', 'ui_tab_messages', 'ui_notifications',
      'cat_agri', 'districts',
      'vvip_badge', 'whatsapp_btn',
    ]);

    for (const code of ['rw', 'fr']) {
      const untranslated = Object.keys(translations.en).filter(
        (key) => !SHARED.has(key) && translations[code][key] === translations.en[key],
      );
      expect(untranslated, `${code} still shows English for: ${untranslated.join(', ')}`).toEqual([]);
    }
  });

  it('falls back to English rather than showing a raw key', () => {
    expect(getTranslation('rw', 'ui_home')).toBe(translations.rw.ui_home);
    expect(getTranslation('zz', 'ui_home')).toBe(translations.en.ui_home);
    // A key nothing defines comes back as itself - visible, but not a crash.
    expect(getTranslation('en', 'no_such_key')).toBe('no_such_key');
  });

  it('resolves a language code to its label and flag', () => {
    expect(languageFor('fr').label).toBe('Français');
    expect(languageFor('rw').flag).toBe('rw');
    // An unknown code must not return undefined - the header renders
    // activeLang.label straight into the markup.
    expect(languageFor('zz')).toBe(LANGUAGES[0]);
  });
});

/**
 * The templates are checked as source text rather than by rendering them.
 * Header.js and MarketplaceView.js both import browser-only modules at module
 * scope, and standing up that much DOM to assert on a nav label would test the
 * stubs more than the code. What matters is that these strings are not typed
 * into the markup any more, and that is visible in the file.
 */
describe('the interface reads from the dictionary', () => {
  const HEADER = readFileSync('src/components/Header.js', 'utf8');
  const HOME = readFileSync('src/modules/marketplace/MarketplaceView.js', 'utf8');

  it('gives both files a t() bound to the current language', () => {
    for (const [name, src] of [['Header.js', HEADER], ['MarketplaceView.js', HOME]] as const) {
      expect(src, `${name} does not import getTranslation`).toContain('getTranslation');
      expect(src, `${name} has no t() helper`).toContain('const t = (key) => getTranslation(currentLang, key)');
    }
  });

  it('has no hardcoded English left in the header or the hero', () => {
    // Each of these was a literal in the markup until the dictionary was
    // wired in. Matched against the markup only - the comments above them
    // still say "Post an Ad" in English, which is fine.
    const markup = (src: string) => src.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '');

    const HEADER_STRINGS = [
      'Free Delivery on orders over RWF 50,000',
      '>All Categories<',
      '>Home</button>',
      '>Stores</button>',
      '>Vehicles</button>',
      '>Real Estate</button>',
      '>Services</button>',
      'Post an Ad',
    ];
    for (const literal of HEADER_STRINGS) {
      expect(markup(HEADER), `Header.js still hardcodes ${literal}`).not.toContain(literal);
    }

    const HOME_STRINGS = [
      'Everything you need,<br>all in one place.',
      'Buy, sell and discover thousands of products',
      '>Shop Now</button>',
      '>Explore Ads</button>',
      'placeholder="Search for products',
      '<h2>Flash Deals',
      '>View all deals</a>',
      '<div class="label">Hours</div>',
    ];
    for (const literal of HOME_STRINGS) {
      expect(markup(HOME), `MarketplaceView.js still hardcodes ${literal}`).not.toContain(literal);
    }
  });

  it('looks up only keys that exist, in every language', () => {
    const used = new Set<string>();
    for (const src of [HEADER, HOME]) {
      for (const m of src.matchAll(/\bt\('([a-z0-9_]+)'\)/g)) used.add(m[1]);
    }
    // If this drops to zero the regex has drifted and the assertion below
    // would pass vacuously.
    expect(used.size).toBeGreaterThan(20);

    for (const code of CODES) {
      const missing = [...used].filter((key) => !(key in translations[code]));
      expect(missing, `${code} has no value for: ${missing.join(', ')}`).toEqual([]);
    }
  });
});
