/**
 * URWAGASABO MARKETPLACE - Product Detail Modal Component
 */

// Same rotating backdrop palette as the product grid cards
// (MarketplaceView.js's PRODUCT_CARD_ACCENTS) - duplicated rather than
// imported since it's a tiny presentation-only constant, not shared logic.
// Picked deterministically from the product id (not the grid position this
// modal happened to be opened from) so reopening the same listing always
// shows the same mat color.
const PRODUCT_CARD_ACCENTS = ['#F3D9B1', '#D9D6F5', '#CFEAD9', '#F6D3DC', '#CFE4F5', '#F5E3B3'];
function accentForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PRODUCT_CARD_ACCENTS[hash % PRODUCT_CARD_ACCENTS.length];
}

export function renderProductDetailModal(product, onClose) {
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-overlay';

  const whatsappMessage = encodeURIComponent(
    `Hello ${product.sellerName}, I found your product "${product.title}" (${product.price.toLocaleString()} RWF) on Kigali Marketplace (kigalimarket.com). Is it still available?`
  );
  const cleanPhone = product.sellerPhone.replace(/[^0-9+]/g, '');
  const mat = accentForId(product.id);

  modalContainer.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <div>
          <span class="badge badge-${product.status}">${product.status.replace('_', ' ').toUpperCase()}</span>
          <h2 style="margin-top: 0.25rem; font-size: 1.4rem; color: #0F172A;">${escapeHtml(product.title)}</h2>
        </div>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>

      <div class="grid-2" style="gap: 1.5rem;">
        <!-- Left: Image Showcase - same colored-mat + object-fit:contain
             treatment as the grid card this modal was opened from. -->
        <div>
          <div style="width: 100%; height: 320px; border-radius: 18px; overflow: hidden; background: ${mat}; position: relative;">
            <img id="main-prod-img" src="${product.images[0]}" alt="${escapeHtml(product.title)}" style="width: 100%; height: 100%; object-fit: contain; padding: 1.75rem; box-sizing: border-box;">
          </div>
          ${product.images.length > 1 ? `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; overflow-x: auto;">
              ${product.images.map((img, idx) => `
                <img src="${img}" class="thumb-img" data-src="${img}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; cursor: pointer; background: ${mat}; border: 2px solid ${idx===0 ? 'var(--primary-green)': 'transparent'};">
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Right: Details & Direct Contact -->
        <div style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary-green); margin-bottom: 0.75rem;">
              ${product.price.toLocaleString()} RWF
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
              <span style="background: #E6F4EA; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: #475569;">
                📍 District: <strong style="color: #004B00;">${escapeHtml(product.district)}</strong>
              </span>
              <span style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: #475569;">
                🏷️ Condition: <strong style="color: #0F172A;">${escapeHtml(product.condition)}</strong>
              </span>
              <span style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: #475569;">
                📅 Posted: <strong style="color: #0F172A;">${product.postedDate}</strong>
              </span>
            </div>

            <p style="font-size: 0.92rem; color: #475569; line-height: 1.6; margin-bottom: 1.5rem; background: #F8FAFC; padding: 1rem; border-radius: 14px; border: 1px solid #E2E8F0;">
              ${escapeHtml(product.description)}
            </p>

            <div style="background: #E6F4EA; padding: 1rem; border-radius: 14px; border: 1px solid #CDE9D5; margin-bottom: 1.5rem;">
              <div style="font-size: 0.8rem; color: #4B7A4E; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Seller Information</div>
              <div style="font-weight: 700; font-size: 1.05rem; color: #0F172A;">${escapeHtml(product.sellerName)}</div>
              <div style="font-size: 0.85rem; color: var(--primary-green);">✔ Verified Rwandan Seller (${product.district} District)</div>
            </div>
          </div>

          <!-- Contact Buttons -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <a href="https://wa.me/${cleanPhone}?text=${whatsappMessage}" target="_blank" class="btn btn-primary" style="background: #25D366; color: #000; font-weight: 700; font-size: 1rem; padding: 0.85rem;">
              💬 Chat on WhatsApp with Seller
            </a>
            <a href="tel:${cleanPhone}" class="btn" style="font-size: 0.95rem; padding: 0.75rem; background: transparent; border: 2px solid var(--primary-green); color: var(--primary-green); font-weight: 700;">
              📞 Call Seller Directly (${escapeHtml(product.sellerPhone)})
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  modalContainer.querySelector('#modal-close-btn').addEventListener('click', () => {
    modalContainer.remove();
    if (onClose) onClose();
  });

  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      modalContainer.remove();
      if (onClose) onClose();
    }
  });

  // Image thumb switcher
  const thumbs = modalContainer.querySelectorAll('.thumb-img');
  const mainImg = modalContainer.querySelector('#main-prod-img');
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      mainImg.src = t.dataset.src;
      thumbs.forEach(x => x.style.borderColor = 'transparent');
      t.style.borderColor = 'var(--primary)';
    });
  });

  document.body.appendChild(modalContainer);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
