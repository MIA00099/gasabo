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
import { openImageLightbox } from '../../components/imageLightbox.js';

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
              <div class="bg-gray-100 rounded-2xl h-64 md:h-80 flex items-center justify-center relative overflow-hidden mb-3 group shadow-lg">
                <img id="detail-main-img" src="${images[0]}" alt="${escapeHtml(product.title)}"
                  class="h-3/4 object-contain relative z-10 drop-shadow-2xl">

                ${hasDiscount ? `
                  <div class="absolute top-4 right-4 bg-brand-orange text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg">-${pct}%</div>
                ` : ''}


                ${images.length > 1 ? `
                  <!-- Prev/next on the image itself. The thumbnail strip below
                       scrolls; these change the photo, which is the gesture
                       most people reach for first. They wrap rather than
                       disable - there is nowhere to get stuck in a loop of
                       six pictures, and the strip underneath already shows
                       which one is current. -->
                  <button type="button" id="main-prev"
                    class="main-nav absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-brand-dark shadow-md flex items-center justify-center transition"
                    aria-label="Previous photo">
                    <i class="fa-solid fa-arrow-left text-sm"></i>
                  </button>
                  <button type="button" id="main-next"
                    class="main-nav absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-brand-dark shadow-md flex items-center justify-center transition"
                    aria-label="Next photo">
                    <i class="fa-solid fa-arrow-right text-sm"></i>
                  </button>

                  <span id="main-counter"
                    class="absolute bottom-3 left-3 z-20 bg-black/55 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    aria-live="polite">1 / ${images.length}</span>
                ` : ''}
                <!-- Opens the shared lightbox. A listing photo is the only
                     thing a buyer has to judge condition by, and the inline
                     frame caps out at 320px tall. -->
                <button type="button" id="detail-zoom-btn"
                  class="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-brand-dark shadow-md flex items-center justify-center transition"
                  aria-label="View ${escapeHtml(product.title)} full size">
                  <i class="fa-solid fa-up-right-and-down-left-from-center text-xs"></i>
                </button>
              </div>

              ${images.length > 1 ? `
                <div class="flex items-center gap-2">
                  <!-- Arrows scroll the strip rather than changing the main
                       image: with more than four photos the later thumbnails
                       are off-screen and were unreachable without a trackpad
                       swipe. Hidden when everything already fits. -->
                  <button type="button" id="thumb-prev"
                    class="thumb-nav shrink-0 w-7 h-7 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green disabled:opacity-30 disabled:cursor-default flex items-center justify-center transition"
                    aria-label="Scroll thumbnails left">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                  </button>

                  <div id="detail-thumb-strip" class="flex gap-3 items-center overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0 py-1">
                    ${images.map((img, i) => `
                      <button type="button" class="detail-thumb shrink-0 relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition ${i === 0 ? 'border-2 border-brand-green' : 'border-2 border-gray-300 opacity-60 hover:opacity-100'}"
                        data-src="${img}" data-index="${i}"
                        aria-label="Show photo ${i + 1} of ${images.length}" aria-pressed="${i === 0}">
                        <img src="${img}" alt="" class="w-full h-full object-cover">
                      </button>
                    `).join('')}
                  </div>

                  <button type="button" id="thumb-next"
                    class="thumb-nav shrink-0 w-7 h-7 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green disabled:opacity-30 disabled:cursor-default flex items-center justify-center transition"
                    aria-label="Scroll thumbnails right">
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                  </button>
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

  // ---- Gallery -----------------------------------------------------------
  const mainImg = container.querySelector('#detail-main-img');
  const strip = container.querySelector('#detail-thumb-strip');
  const counter = container.querySelector('#main-counter');
  const thumbs = [...container.querySelectorAll('.detail-thumb')];
  let activeIndex = 0;

  function selectImage(i) {
    if (i < 0 || i >= images.length) return;
    activeIndex = i;
    if (mainImg) mainImg.src = images[i];

    thumbs.forEach((t, n) => {
      const on = n === i;
      t.className = t.className
        .replace('border-brand-green', 'border-gray-300 opacity-60 hover:opacity-100')
        .replace('border-gray-300 opacity-60 hover:opacity-100', on ? 'border-brand-green' : 'border-gray-300 opacity-60 hover:opacity-100');
      t.setAttribute('aria-pressed', String(on));
    });

    // Keep the selected thumbnail on screen when selection moves by keyboard
    // or by the arrows, not only when it was clicked into view.
    if (counter) counter.textContent = `${i + 1} / ${images.length}`;

    thumbs[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => selectImage(Number(thumb.dataset.index)));
  });

  function step(delta) {
    // Wraps. See the markup comment - the strip below shows position, so
    // there is nothing to be lost by looping.
    selectImage((activeIndex + delta + images.length) % images.length);
  }

  container.querySelector('#main-prev')?.addEventListener('click', () => step(-1));
  container.querySelector('#main-next')?.addEventListener('click', () => step(1));

  // Swipe. Most of this marketplace is read on a phone, where reaching for a
  // 36px arrow is worse than the gesture people already use on every other
  // photo they look at.
  const frame = mainImg?.parentElement;
  if (frame && images.length > 1) {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    frame.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    frame.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Horizontal intent only, or every attempt to scroll the page past the
      // image would flick the gallery instead.
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  // Left/Right move between photos while the strip has focus, which is what a
  // row of images implies to anyone not using a mouse.
  strip?.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = (activeIndex + (e.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length;
    selectImage(next);
    thumbs[next]?.focus();
  });

  const prevBtn = container.querySelector('#thumb-prev');
  const nextBtn = container.querySelector('#thumb-next');

  function syncArrows() {
    if (!strip || !prevBtn || !nextBtn) return;
    // A strip that already fits has nothing to scroll, and two permanently
    // dead arrows read as broken rather than as "no more photos".
    const scrollable = strip.scrollWidth - strip.clientWidth > 2;
    prevBtn.hidden = !scrollable;
    nextBtn.hidden = !scrollable;
    if (!scrollable) return;
    prevBtn.disabled = strip.scrollLeft <= 1;
    nextBtn.disabled = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 1;
  }

  function scrollStrip(dir) {
    if (!strip) return;
    // Roughly one thumbnail plus its gap, so a press advances by a photo
    // rather than an arbitrary distance.
    const step = (thumbs[0]?.offsetWidth || 72) + 12;
    strip.scrollBy({ left: dir * step * 2, behavior: 'smooth' });
  }

  prevBtn?.addEventListener('click', () => scrollStrip(-1));
  nextBtn?.addEventListener('click', () => scrollStrip(1));
  strip?.addEventListener('scroll', syncArrows, { passive: true });
  // Three passes, because each catches a case the others miss:
  //   now      - so the arrows are never briefly wrong, and so they are
  //              still right where requestAnimationFrame is throttled
  //              (background tab, hidden view) and never fires.
  //   next frame - layout has settled and scrollWidth is final.
  //   on load  - thumbnails arriving late change scrollWidth again.
  syncArrows();
  requestAnimationFrame(syncArrows);
  thumbs.forEach((t) => {
    const img = t.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', syncArrows, { once: true });
  });
  window.addEventListener('resize', syncArrows);

  container.querySelector('#detail-zoom-btn')?.addEventListener('click', () => {
    openImageLightbox(images, product.title, {
      startIndex: activeIndex,
      returnFocusTo: '#detail-zoom-btn',
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
