export function isSpotlightProduct(product) {
  return !!(product?.isFeatured || product?.isTrending);
}

export function getHomeProductSections({ products = [], flashDeals = [], moreLimit = 15 } = {}) {
  const allProducts = Array.isArray(products) ? products : [];
  const allFlashDeals = Array.isArray(flashDeals) ? flashDeals : [];

  const spotlightProducts = allProducts.filter(isSpotlightProduct);
  const spotlightIds = new Set(spotlightProducts.map((product) => product.id).filter(Boolean));
  const regularProducts = allProducts.filter((product) => (
    !isSpotlightProduct(product) && !spotlightIds.has(product.id)
  ));
  const visibleFlashDeals = allFlashDeals.filter((deal) => (
    !isSpotlightProduct(deal) && !spotlightIds.has(deal.id)
  ));

  return {
    spotlightProducts,
    visibleFlashDeals,
    featuredDeal: visibleFlashDeals[0] || null,
    moreProducts: regularProducts.slice(0, moreLimit),
  };
}
