import { describe, it, expect } from 'vitest';
import { canOptimizeImage, imageVariantUrl, responsiveImageAttrs } from './imageDelivery.js';

describe('responsive image delivery helpers', () => {
  it('generates optimized srcset candidates for uploaded product images', () => {
    const attrs = responsiveImageAttrs('/uploads/example.png', {
      alt: 'Example',
      widths: [120, 240],
      sizes: '50vw',
      width: 240,
      height: 160,
    });

    expect(canOptimizeImage('/uploads/example.png')).toBe(true);
    expect(attrs).toContain('/api/images/optimized?');
    expect(attrs).toContain('srcset=');
    expect(attrs).toContain('120w');
    expect(attrs).toContain('240w');
    expect(attrs).toContain('sizes="50vw"');
    expect(attrs).toContain('width="240"');
    expect(attrs).toContain('height="160"');
    expect(attrs).toContain('loading="lazy"');
  });

  it('keeps non-product images direct and gives empty images a transparent placeholder', () => {
    expect(canOptimizeImage('/logo-kigali-market.jpg')).toBe(false);
    expect(imageVariantUrl('/uploads/a.jpg', 320)).toContain('w=320');

    const direct = responsiveImageAttrs('/logo-kigali-market.jpg', { alt: 'Logo' });
    expect(direct).toContain('src="/logo-kigali-market.jpg"');
    expect(direct).not.toContain('srcset=');

    const empty = responsiveImageAttrs('', { alt: 'Missing' });
    expect(empty).toContain('data:image/gif;base64');
    expect(empty).not.toContain('src=""');
  });
});
