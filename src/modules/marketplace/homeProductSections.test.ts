import { describe, it, expect } from 'vitest';
import { getHomeProductSections, isSpotlightProduct } from './homeProductSections.js';

describe('home product section bucketing', () => {
  it('treats only Featured and Trending as spotlight products', () => {
    expect(isSpotlightProduct({ isFeatured: true })).toBe(true);
    expect(isSpotlightProduct({ isTrending: true })).toBe(true);
    expect(isSpotlightProduct({ isRecommended: true })).toBe(false);
    expect(isSpotlightProduct({})).toBe(false);
  });

  it('keeps Featured and Trending products out of the regular product sections', () => {
    const featured = { id: 'toyota', title: 'Toyota', isFeatured: true, isTrending: false };
    const trending = { id: 'coffee', title: 'Coffee', isFeatured: false, isTrending: true };
    const regular = { id: 'phone', title: 'Phone', isFeatured: false, isTrending: false };

    const sections = getHomeProductSections({
      products: [featured, trending, regular],
      flashDeals: [featured, trending, regular],
      moreLimit: 15,
    });

    expect(sections.spotlightProducts.map((product) => product.id)).toEqual(['toyota', 'coffee']);
    expect(sections.moreProducts.map((product) => product.id)).toEqual(['phone']);
    expect(sections.visibleFlashDeals.map((product) => product.id)).toEqual(['toyota', 'coffee', 'phone']);
    expect(sections.featuredDeal?.id).toBe('toyota');
  });

  it('keeps Flash Deals independent from the Featured and Trending rail', () => {
    const sections = getHomeProductSections({
      products: [{ id: 'coffee', title: 'Coffee', isFeatured: true }],
      flashDeals: [{ id: 'coffee', title: 'Coffee deal' }],
    });

    expect(sections.spotlightProducts.map((product) => product.id)).toEqual(['coffee']);
    expect(sections.visibleFlashDeals.map((product) => product.id)).toEqual(['coffee']);
    expect(sections.featuredDeal?.id).toBe('coffee');
  });
});
