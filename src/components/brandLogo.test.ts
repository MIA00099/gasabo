/**
 * The brand logo, and the file behind it.
 *
 * The supplied artwork is used unaltered - no crop, no keying, no re-encode.
 * That matters here because the previous logo went through both: it was cut
 * out of a larger lockup and had its background keyed away. This one was
 * asked for "as it is", so the file on disk is the file that was sent.
 *
 * The thing most likely to go wrong later is someone deciding the wordmark
 * beside the logo is redundant, because the artwork contains its own. On
 * paper it is redundant. In practice the artwork's text is about 7% of a
 * square that renders 36-44px tall, which measures 3.3px on a phone - texture
 * rather than words. Removing the HTML wordmark was the first thing tried
 * here and it left the brand name unreadable at every size the header uses.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';

const HEADER = readFileSync('src/components/Header.js', 'utf8');
const FOOTER = readFileSync('src/components/Footer.js', 'utf8');
const INDEX = readFileSync('index.html', 'utf8');

const LOGO = 'public/logo-kigali-market.jpg';

describe('the logo file', () => {
  it('is on disk where the markup points', () => {
    expect(existsSync(LOGO), `${LOGO} is missing`).toBe(true);
  });

  it('is the artwork as supplied, not a re-cut of it', () => {
    // 1080x1080, ~83KB. A crop or a re-encode would move both numbers, which
    // is the cheapest way to notice that "as it is" stopped being true.
    const bytes = statSync(LOGO).size;
    expect(bytes).toBeGreaterThan(70_000);
    expect(bytes).toBeLessThan(100_000);

    // JPEG SOF carries the dimensions; read them rather than trusting a note.
    const b = readFileSync(LOGO);
    let dims: { w: number; h: number } | null = null;
    for (let i = 2; i < b.length; ) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        dims = { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
        break;
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    expect(dims, 'could not read the JPEG dimensions').toBeTruthy();
    expect(dims!.w).toBe(1080);
    expect(dims!.h).toBe(1080);
  });
});

describe('where it is used', () => {
  it('is the marketplace header mark', () => {
    expect(HEADER).toContain('/logo-kigali-market.jpg');
  });

  it('has replaced the old mark everywhere', () => {
    for (const [name, src] of [['Header.js', HEADER], ['Footer.js', FOOTER], ['index.html', INDEX]] as const) {
      expect(src, `${name} still points at the old logo`).not.toContain('logo-km.png');
    }
  });

  it('is the favicon, declared as a JPEG', () => {
    // It was declared type="image/png" for the old file; leaving that on a
    // JPEG is the kind of thing a browser forgives and a validator does not.
    expect(INDEX).toContain('href="/logo-kigali-market.jpg"');
    expect(INDEX).toMatch(/rel="icon"[^>]*type="image\/jpeg"/);
  });

  it('keeps the readable wordmark beside it', () => {
    // See the note at the top of this file: the artwork's own wordmark is
    // 3.3px tall at header size.
    const brand = HEADER.slice(HEADER.indexOf('id="nav-brand-home"'), HEADER.indexOf('id="nav-brand-home"') + 900);
    expect(brand, 'the brand name is no longer rendered as text').toContain("'KIGALI'");
    expect(brand).toContain("'MARKET'");
  });

  it('leaves Gasabo its own mark', () => {
    expect(HEADER).toContain('/real-estate-logo.png');
  });
});
