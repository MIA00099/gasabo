export function isSpotlightProduct(product) {
  return !!(product?.isFeatured || product?.isTrending);
}

export function getHomeProductSections({ products = [], flashDeals = [], moreLimit = 15 } = {}) {
  const allProducts = Array.isArray(products) ? products : [];
  const allFlashDeals = Array.isArray(flashDeals) ? flashDeals : [];

  const spotlightProducts = allProducts.filter(isSpotlightProduct);
  // Featured and trending listings must still appear in their real category.
  // Spotlight is a promotional view, not an alternative product category.
  const regularProducts = allProducts;
  // Flash Deals are an independent promotion: if an admin sets a countdown on
  // a product, the Flash Deals panel should work even when that product is
  // also Featured or Trending. The spotlight-only rule only applies to the
  // regular category/grid sections below.
  const visibleFlashDeals = allFlashDeals;

  return {
    spotlightProducts,
    visibleFlashDeals,
    featuredDeal: visibleFlashDeals[0] || null,
    moreProducts: regularProducts,
  };
}
