/**
 * URWAGASABO MARKETPLACE - Product Detail Modal Component
 */

export function renderProductDetailModal(product, onClose) {
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-overlay';

  const whatsappMessage = encodeURIComponent(
    `Hello ${product.sellerName}, I found your product "${product.title}" (${product.price.toLocaleString()} RWF) on Kigali Marketplace (kigalimarket.com). Is it still available?`
  );
  const cleanPhone = product.sellerPhone.replace(/[^0-9+]/g, '');

  modalContainer.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <div>
          <span class="badge badge-${product.status}">${product.status.replace('_', ' ').toUpperCase()}</span>
          <h2 style="margin-top: 0.25rem; font-size: 1.4rem; color: #fff;">${escapeHtml(product.title)}</h2>
        </div>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      
      <div class="grid-2" style="gap: 1.5rem;">
        <!-- Left: Image Showcase -->
        <div>
          <div style="width: 100%; height: 320px; border-radius: var(--radius-md); overflow: hidden; background: #000; position: relative;">
            <img id="main-prod-img" src="${product.images[0]}" alt="${escapeHtml(product.title)}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          ${product.images.length > 1 ? `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; overflow-x: auto;">
              ${product.images.map((img, idx) => `
                <img src="${img}" class="thumb-img" data-src="${img}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; cursor: pointer; border: 2px solid ${idx===0 ? 'var(--primary)': 'transparent'};">
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Right: Details & Direct Contact -->
        <div style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary); margin-bottom: 0.75rem;">
              ${product.price.toLocaleString()} RWF
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
              <span style="background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: var(--text-muted);">
                📍 District: <strong style="color: #fff;">${escapeHtml(product.district)}</strong>
              </span>
              <span style="background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: var(--text-muted);">
                🏷️ Condition: <strong style="color: #fff;">${escapeHtml(product.condition)}</strong>
              </span>
              <span style="background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: var(--text-muted);">
                📅 Posted: <strong style="color: #fff;">${product.postedDate}</strong>
              </span>
            </div>

            <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 1.5rem; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--navy-border);">
              ${escapeHtml(product.description)}
            </p>

            <div style="background: var(--navy-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--navy-border); margin-bottom: 1.5rem;">
              <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Seller Information</div>
              <div style="font-weight: 700; font-size: 1.05rem; color: #fff;">${escapeHtml(product.sellerName)}</div>
              <div style="font-size: 0.85rem; color: var(--primary);">✔ Verified Rwandan Seller (${product.district} District)</div>
            </div>
          </div>

          <!-- Contact Buttons -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <a href="https://wa.me/${cleanPhone}?text=${whatsappMessage}" target="_blank" class="btn btn-primary" style="background: #25D366; color: #000; font-weight: 700; font-size: 1rem; padding: 0.85rem;">
              💬 Chat on WhatsApp with Seller
            </a>
            <a href="tel:${cleanPhone}" class="btn btn-secondary" style="font-size: 0.95rem; padding: 0.75rem;">
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
