import { makeAccessibleModal } from '../../components/modalA11y.js';

/**
 * Product Detail Modal Component - Ported from delivered mockup product-detail.html.
 */
export function renderProductDetailModal(product, onClose, returnFocusTo) {
  const modalContainer = document.createElement('div');
  modalContainer.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 overflow-y-auto';

  const cleanPhone = (product.sellerPhone || '0788350555').replace(/[^0-9+]/g, '');
  const whatsappMessage = encodeURIComponent(
    `Hello ${product.sellerName || 'Seller'}, I found your product "${product.title}" (${product.price.toLocaleString()} RWF) on Kigali Market (kigalimarket.com). Is it still available?`
  );

  const images = product.images && product.images.length > 0
    ? product.images
    : ['/03454683-fd32-47bb-89ad-8a441c5169b1.png'];

  const wasPrice = Number(product.originalPrice) || 0;
  const hasDiscount = wasPrice > product.price;
  const pctOff = hasDiscount ? Math.round((1 - product.price / wasPrice) * 100) : 20;

  modalContainer.innerHTML = `
    <div class="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto my-auto">

      <!-- Close Button -->
      <button id="modal-close-btn" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition z-20" aria-label="Close product details">
        <i class="fa-solid fa-xmark text-base"></i>
      </button>

      <!-- ====== PRODUCT DETAIL SECTION ====== -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">

        <!-- LEFT: PRODUCT IMAGE GALLERY -->
        <div>
          <!-- MAIN IMAGE - LARGE & VISIBLE -->
          <div class="bg-gradient-to-br from-[#0b1c11] to-[#052614] rounded-2xl h-64 md:h-72 flex items-center justify-center relative overflow-hidden mb-3 group cursor-zoom-in shadow-lg">
            <div class="absolute inset-0 bg-gradient-to-tr from-[#052614] to-[#1a4d2e] opacity-70"></div>
            <img id="main-prod-img" src="${images[0]}" alt="${escapeHtml(product.title)}" class="h-3/4 object-contain relative z-10 drop-shadow-2xl">

            <div class="absolute top-4 right-4 bg-brand-orange text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg">
              -${pctOff}%
            </div>

            <div class="absolute bottom-4 right-4 bg-black/60 text-white w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-lg">
              <i class="fa-solid fa-expand"></i>
            </div>
          </div>

          <!-- IMAGE THUMBNAILS -->
          <div class="flex gap-3 items-center justify-center overflow-x-auto py-1">
            ${images.map((img, idx) => `
              <button type="button" class="thumb-img-btn relative w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 ${idx === 0 ? 'border-brand-green' : 'border-gray-300'} bg-[#0b1c11] flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition shrink-0" data-src="${img}">
                <div class="absolute inset-0 bg-gradient-to-tr from-[#052614] to-[#124b2b] opacity-70"></div>
                <img src="${img}" alt="Thumbnail ${idx + 1}" class="h-3/4 object-contain relative z-10">
              </button>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT: PRODUCT DETAILS -->
        <div class="flex flex-col justify-start">

          <!-- TITLE -->
          <h1 class="text-2xl md:text-3xl font-black text-brand-dark mb-3 leading-tight">
            ${escapeHtml(product.title)}
          </h1>

          <!-- PRICE SECTION -->
          <div class="mb-4 pb-4 border-b border-gray-200">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-3xl md:text-4xl font-black text-brand-green">RWF ${product.price.toLocaleString()}</span>
              ${wasPrice ? `<span class="text-lg text-gray-400 line-through font-semibold">RWF ${wasPrice.toLocaleString()}</span>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <div class="text-yellow-400 text-sm">
                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
              </div>
              <span class="font-bold text-gray-800">${product.rating || 4.8}</span>
              <span class="text-gray-600">(${product.reviewCount || 120} reviews)</span>
            </div>
          </div>

          <!-- PRODUCT INFO -->
          <div class="mb-4 space-y-2 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-gray-600 font-semibold">Condition:</span>
              <span class="font-bold text-gray-900">${escapeHtml(product.condition || 'Brand New')}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 font-semibold">Location:</span>
              <span class="font-bold text-gray-900">District: ${escapeHtml(product.district || 'Gasabo')}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 font-semibold">Description:</span>
              <span class="font-normal text-gray-700 max-w-[240px] truncate">${escapeHtml(product.description || 'Quality guaranteed.')}</span>
            </div>
          </div>

          <!-- SELLER INFO CARD -->
          <div class="bg-gradient-to-r from-brand-green/5 to-brand-orange/5 border border-brand-green rounded-2xl p-3 mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-white rounded-xl border-2 border-brand-green flex items-center justify-center shadow-sm shrink-0">
                <i class="fa-solid fa-shop text-brand-green text-xl"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-bold text-base text-brand-green">${escapeHtml(product.sellerName || 'Mike Rwagasabo')}</h3>
                  <span class="bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <i class="fa-solid fa-circle-check"></i> Verified
                  </span>
                </div>
                <div class="flex items-center gap-1 text-sm">
                  <div class="text-yellow-400 text-xs">
                    <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                  </div>
                  <span class="font-bold text-gray-800">4.8 <span class="text-gray-500 font-normal">(120 reviews)</span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="space-y-2 mt-auto text-xs">
            <div class="grid grid-cols-2 gap-3">
              <a href="tel:${cleanPhone}" class="bg-brand-green text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-green-800 transition shadow-md">
                <i class="fa-solid fa-phone"></i> Call Now
              </a>
              <a href="https://wa.me/${cleanPhone.replace('+', '')}?text=${whatsappMessage}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-emerald-700 transition shadow-md">
                <i class="fa-regular fa-comment-dots"></i> Chat WhatsApp
              </a>
            </div>
            <button id="wishlist-btn" class="w-full bg-white border-2 border-brand-green text-brand-green font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 hover:bg-green-50 transition shadow-sm">
              <i class="fa-regular fa-heart"></i> Add to Wishlist
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modalContainer);

  const { close } = makeAccessibleModal(modalContainer, {
    label: `Product details: ${product.title}`,
    onClose,
    returnFocusTo,
  });

  modalContainer.querySelector('#modal-close-btn').addEventListener('click', close);
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) close();
  });

  const mainImg = modalContainer.querySelector('#main-prod-img');
  const thumbs = modalContainer.querySelectorAll('.thumb-img-btn');
  thumbs.forEach((t) => {
    t.addEventListener('click', () => {
      mainImg.src = t.dataset.src;
      thumbs.forEach((x) => x.classList.replace('border-brand-green', 'border-gray-300'));
      t.classList.replace('border-gray-300', 'border-brand-green');
    });
  });

  const wishlistBtn = modalContainer.querySelector('#wishlist-btn');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', () => {
      wishlistBtn.innerHTML = '<i class="fa-solid fa-heart text-red-500"></i> Added to Wishlist';
    });
  }

  return modalContainer;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
