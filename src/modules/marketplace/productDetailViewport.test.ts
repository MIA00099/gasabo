import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const DETAIL = readFileSync('src/modules/marketplace/ProductDetailPage.js', 'utf8');
const CSS = readFileSync('src/styles/main.css', 'utf8');

describe('product detail desktop viewport layout', () => {
  it('keeps the existing page pieces addressable without rebuilding the component', () => {
    for (const cls of [
      'product-detail-page',
      'product-detail-main-card',
      'product-detail-gallery-frame',
      'product-detail-info',
      'product-detail-seller-card',
      'product-detail-actions',
      'product-detail-related-section',
      'product-detail-related-grid',
    ]) {
      expect(DETAIL, `${cls} missing`).toContain(cls);
    }
  });

  it('uses viewport-aware desktop sizing so related products begin in the first viewport', () => {
    expect(CSS).toContain('@media (min-width: 1024px)');
    expect(CSS).toContain('--product-detail-main-budget: calc(100dvh');
    expect(CSS).toContain('--product-detail-preview-space: clamp(');
    expect(CSS).toContain('.product-detail-gallery-frame');
    expect(CSS).toContain('height: clamp(260px, calc(var(--product-detail-main-budget) - 96px), 430px) !important');
    expect(CSS).toContain('@media (min-width: 1024px) and (max-height: 820px)');
  });

  it('keeps normal document scrolling instead of nesting a scroll area inside the product card', () => {
    const pageStart = DETAIL.indexOf('<div id="view-product"');
    const relatedStart = DETAIL.indexOf('<!-- ====== RELATED PRODUCTS SECTION ====== -->');
    const mainProductMarkup = DETAIL.slice(pageStart, relatedStart);

    expect(mainProductMarkup).not.toContain('overflow-y-auto');
    expect(mainProductMarkup).not.toContain('max-h-[');
  });
});
