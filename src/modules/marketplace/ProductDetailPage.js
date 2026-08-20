/**
 * Product detail - ported from the delivered mockup product-detail.html.
 *
 * A full page, not an overlay: the mockup renders it as its own view with the
 * header and nav above it, so opening a listing navigates rather than
 * covering the page behind it. That also makes /product/:id a real
 * destination - shareable, linkable and crawlable.
 *
 * Structure, classes and copy are the mockup's: gallery with thumbnails on
 * the left, title / price / rating / condition / location / seller card and
 * the Call - Chat - Wishlist actions on the right, then "More <category>
 * Products" underneath.
 *
 * The mockup's discount badge and star rows are driven by originalPrice and
 * rating. Neither field exists yet, so those two ornaments stay out until
 * they do - a saving or a review score shown against a listing that has
 * neither is a claim about a seller nobody has made.
 */
import { stateEngine } from '../../store/stateEngine.js';
import { pushPath, pathForListing, ROUTE_PRODUCT } from '../../store/router.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

function starsHtml(rating) {
  const r = Number(rating) || 0;
  if (r <= 0) return '';
  let out = '';
  for (let i = 1; i <= 5; i++) {
    if (r >= i) out += '<i class="fa-solid fa-star"></i>';
    else if (r >= i - 0.5) out += '<i class="fa-solid fa-star-half-stroke"></i>';
    else out += '<i class="fa-regular fa-star"></i>';
  }
  return out;
}

function whatsappHref(product) {
  const phone = (product.sellerPhone || '').replace(/[^0-9+]/g, '').replace('+', '');
  const msg = encodeURIComponent(
    `Hello ${product.sellerName}, I found your listing "${product.title}" ` +
    `(${product.price.toLocaleString()} ${product.currency}) on Kigali Market ` +
    `(kigalimarket.com). Is it still available?`,
  );
  return `https://wa.me/${phone}?text=${msg}`;
}

// Grey blocks, no text. The row is fetched separately from the listing, so
// without this the page renders complete, then a whole section appears
// underneath it a moment later and pushes the footer down.
const RELATED_SKELETON = Array.from({ length: 5 }, () => `
  <div class="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
    <div class="bg-gray-100 h-48 animate-pulse"></div>
    <div class="p-4 space-y-3">
      <div class="h-3 bg-gray-100 rounded animate-pulse"></div>
      <div class="h-3 bg-gray-100 rounded w-2/3 animate-pulse"></div>
      <div class="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div>
    </div>
  </div>
`).join('');

function relatedCard(p) {
  const was = Number(p.originalPrice) || 0;
  const hasDiscount = was > p.price;
  const pct = hasDiscount ? Math.round((1 - p.price / was) * 100) : 0;
  const stars = starsHtml(p.rating);

  return `
    <div class="related-card bg-gray-50 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl transition transform hover:scale-105 border border-gray-100"
      data-id="${p.id}" role="button" tabindex="0">
      <div class="relative bg-gray-100 h-48 flex items-center justify-center overflow-hidden">
        ${p.images && p.images[0]
          ? `<img src="${p.images[0]}" alt="${escapeHtml(p.title)}" loading="lazy" class="h-3/4 object-contain drop-shadow-lg">`
          : '<i class="fa-solid fa-image text-4xl text-gray-300"></i>'}
        ${hasDiscount ? `<span class="absolute top-3 right-3 bg-brand-green text-white text-xs font-bold px-3 py-1 rounded-full">-${pct}%</span>` : ''}
      </div>
      <div class="p-4">
        <h3 class="font-bold text-gray-900 mb-3 line-clamp-2 text-sm">${escapeHtml(p.title)}</h3>
        <p class="text-brand-green font-black text-lg mb-2">${p.currency} ${p.price.toLocaleString()}</p>
        ${stars ? `
          <div class="flex items-center gap-1 text-yellow-400 text-sm">
            ${stars}${p.reviewCount ? `<span class="text-gray-600 text-xs ml-1">(${p.reviewCount})</span>` : ''}
          </div>
        ` : `
          <div class="flex items-center gap-1 text-gray-500 text-xs">
            <i class="fa-solid fa-location-dot text-brand-green"></i> ${escapeHtml(p.district)}
          </div>
        `}
      </div>
    </div>
  `;
}

export function renderProductDetailPage(container, product, handlers = {}) {
  const state = stateEngine.getState();
  const was = Number(product.originalPrice) || 0;
  const hasDiscount = was > product.price;
  const pct = hasDiscount ? Math.round((1 - product.price / was) * 100) : 0;
  const stars = starsHtml(product.rating);
  const images = Array.isArray(product.images) && product.images.length ? product.images : [''];

  // "More <category> Products" - fetched for this listing, not filtered out
  // of whatever the last grid returned. state.products is empty on a shared
  // link or a search result, which is where a related row earns its keep.
  if (state.relatedProductsFor !== product.id) {
    stateEngine.loadRelatedProducts(product.id).catch(() => {});
  }
  const relatedReady = state.relatedProductsFor === product.id;
  const related = (relatedReady ? state.relatedProducts : [])
    .filter((p) => p.id !== product.id)
    .slice(0, 6);
  const relatedLoading = !relatedReady;

  container.innerHTML = `
    <div id="view-product" class="py-4 bg-brand-light min-h-screen">
      <div class="compact-container">

        <button type="button" id="detail-back"
          class="mb-3 text-xs font-semibold text-gray-600 hover:text-brand-green flex items-center gap-1.5">
          <i class="fa-solid fa-arrow-left"></i> Back
        </button>

        <!-- ====== PRODUCT DETAIL SECTION ====== -->
        <div class="bg-white rounded-3xl shadow-md border border-gray-100 p-5 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">

            <!-- LEFT: PRODUCT IMAGE GALLERY -->
            <div>
              <div class="bg-gray-100 rounded-2xl h-64 md:h-72 flex items-center justify-center relative overflow-hidden mb-3 group shadow-lg">
                <img id="detail-main-img" src="${images[0]}" alt="${escapeHtml(product.title)}"
                  class="h-3/4 object-contain relative z-10 drop-shadow-2xl">
                ${hasDiscount ? `
                  <div class="absolute top-4 right-4 bg-brand-orange text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg">-${pct}%</div>
                ` : ''}
              </div>

              ${images.length > 1 ? `
                <div class="flex gap-3 items-center justify-center">
                  ${images.map((img, i) => `
                    <button type="button" class="detail-thumb relative w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition ${i === 0 ? 'border-2 border-brand-green' : 'border-2 border-gray-300 opacity-60 hover:opacity-100'}"
                      data-src="${img}" aria-label="Show image ${i + 1} of ${images.length}" aria-pressed="${i === 0}">
                      <img src="${img}" alt="" class="h-3/4 object-contain relative z-10">
                    </button>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <!-- RIGHT: PRODUCT DETAILS -->
            <div class="flex flex-col justify-start">
              <h1 class="text-2xl md:text-3xl font-black text-brand-dark mb-3 leading-tight">
                ${escapeHtml(product.title)}
              </h1>

              <div class="mb-4 pb-4 border-b border-gray-200">
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                  <span class="text-3xl md:text-4xl font-black text-brand-green">${escapeHtml(product.currency)} ${product.price.toLocaleString()}</span>
                  ${hasDiscount ? `<span class="text-lg text-gray-400 line-through font-semibold">${escapeHtml(product.currency)} ${was.toLocaleString()}</span>` : ''}
                </div>
                ${stars ? `
                  <div class="flex items-center gap-2">
                    <div class="text-yellow-400 text-sm">${stars}</div>
                    <span class="font-bold text-gray-800">${Number(product.rating).toFixed(1)}</span>
                    ${product.reviewCount ? `<span class="text-gray-600">(${product.reviewCount} reviews)</span>` : ''}
                  </div>
                ` : ''}
              </div>

              <div class="mb-4 space-y-2 text-sm">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600 font-semibold">Condition:</span>
                  <span class="font-bold text-gray-900">${escapeHtml(product.condition || '-')}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600 font-semibold">Location:</span>
                  <span class="font-bold text-gray-900">${escapeHtml(product.district || '-')}</span>
                </div>
                ${product.category ? `
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 font-semibold">Category:</span>
                    <span class="font-bold text-gray-900">${escapeHtml(product.category)}</span>
                  </div>
                ` : ''}
              </div>

              ${product.description ? `
                <p class="text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-4">
                  ${escapeHtml(product.description)}
                </p>
              ` : ''}

              <!-- SELLER INFO CARD -->
              <div class="bg-gradient-to-r from-brand-green/5 to-brand-orange/5 border border-brand-green rounded-2xl p-3 mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-white rounded-xl border-2 border-brand-green flex items-center justify-center shadow-sm shrink-0">
                    <i class="fa-solid fa-shop text-brand-green text-xl"></i>
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 class="font-bold text-base text-brand-green truncate">${escapeHtml(product.sellerName || 'Seller')}</h3>
                      <span class="bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <i class="fa-solid fa-circle-check"></i> Verified
                      </span>
                    </div>
                    <div class="text-xs text-gray-600 flex items-center gap-1">
                      <i class="fa-solid fa-location-dot text-brand-green"></i> ${escapeHtml(product.district || 'Rwanda')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- ACTION BUTTONS -->
              <div class="space-y-2 mt-auto">
                <div class="grid grid-cols-2 gap-3">
                  <a href="tel:${(product.sellerPhone || '').replace(/[^0-9+]/g, '')}"
                    class="bg-brand-green text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-green-800 transition shadow-md">
                    <i class="fa-solid fa-phone"></i> Call Now
                  </a>
                  <a href="${whatsappHref(product)}" target="_blank" rel="noopener"
                    class="bg-brand-green text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-green-800 transition shadow-md">
                    <i class="fa-regular fa-comment-dots"></i> Chat
                  </a>
                </div>
                <button type="button" data-soon="Wishlist"
                  class="w-full bg-white border-2 border-brand-green text-brand-green font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-green-50 transition shadow-sm">
                  <i class="fa-regular fa-heart"></i> Add to Wishlist
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== RELATED PRODUCTS SECTION ====== -->
        ${related.length || relatedLoading ? `
          <div class="bg-white rounded-3xl shadow-md border border-gray-100 p-8">
            <div class="mb-8">
              <h2 class="text-2xl md:text-4xl font-black text-brand-dark mb-2">
                More ${escapeHtml(product.category || 'Marketplace')} Products
              </h2>
              <p class="text-gray-600 text-base md:text-lg">Similar listings in the same category</p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              ${relatedLoading ? RELATED_SKELETON : related.map(relatedCard).join('')}
            </div>

            ${relatedLoading ? '' : `<div class="text-center mt-10">
              <button type="button" id="detail-view-all"
                class="bg-brand-dark text-white font-bold text-base md:text-lg px-10 py-4 rounded-2xl hover:bg-gray-800 transition shadow-lg transform hover:scale-105">
                View All ${escapeHtml(product.category || 'Marketplace')} Products
              </button>
            </div>`}
          </div>
        ` : ''}

      </div>
    </div>
  `;

  // Gallery thumbnails.
  const mainImg = container.querySelector('#detail-main-img');
  container.querySelectorAll('.detail-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      if (mainImg) mainImg.src = thumb.dataset.src;
      container.querySelectorAll('.detail-thumb').forEach((t) => {
        t.className = t.className
          .replace('border-brand-green', 'border-gray-300 opacity-60 hover:opacity-100');
        t.setAttribute('aria-pressed', 'false');
      });
      thumb.className = thumb.className
        .replace('border-gray-300 opacity-60 hover:opacity-100', 'border-brand-green');
      thumb.setAttribute('aria-pressed', 'true');
    });
  });

  container.querySelector('#detail-back')?.addEventListener('click', () => {
    if (handlers.onBack) handlers.onBack();
  });

  container.querySelector('#detail-view-all')?.addEventListener('click', () => {
    if (handlers.onViewAllInCategory) handlers.onViewAllInCategory(product.categoryId);
  });

  // Related listings navigate to their own page.
  container.querySelectorAll('.related-card').forEach((card) => {
    const open = () => {
      const id = card.dataset.id;
      pushPath(pathForListing(ROUTE_PRODUCT, id));
      stateEngine.setRoute({ kind: ROUTE_PRODUCT, id });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  container.querySelectorAll('[data-soon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelector('.km-toast')?.remove();
      const el = document.createElement('div');
      el.className = 'km-toast fixed left-1/2 -translate-x-1/2 bottom-7 bg-brand-dark text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl z-[12000]';
      el.setAttribute('role', 'status');
      el.textContent = `${btn.dataset.soon} is coming soon.`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    });
  });
}
