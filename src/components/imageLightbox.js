/**
 * Full-screen image viewer, shared by the admin approval queue and the public
 * listing page.
 *
 * It started life inside MarketplaceAdmin: moderators were approving listings
 * off an 84x84 thumbnail with no way to see the rest of a listing's photos.
 * The storefront gallery needs exactly the same thing behind its expand
 * control, so it lives here rather than being written twice and drifting.
 *
 * Appended to document.body, not to whichever container opened it - any
 * stateEngine notify() re-renders that container and would tear the overlay
 * out from under the reader mid-view.
 */
import { makeAccessibleModal } from './modalA11y.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

/**
 * @param {string[]} images    urls, in display order
 * @param {string}   title     listing title, announced and shown as a caption
 * @param {object}   [options]
 * @param {number}   [options.startIndex]   which photo to open on
 * @param {string}   [options.returnFocusTo] selector for focus on close
 */
export function openImageLightbox(images, title, { startIndex = 0, returnFocusTo } = {}) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  if (!list.length) return () => {};

  let idx = Math.min(Math.max(startIndex, 0), list.length - 1);
  let close = () => {};

  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position: fixed; inset: 0; background: rgba(2,6,23,0.88); z-index: 9999; ' +
    'display: flex; align-items: center; justify-content: center; padding: 2rem;';

  function paint() {
    overlay.innerHTML = `
      <div style="position: relative; max-width: min(92vw, 900px); max-height: 90vh; display: flex; flex-direction: column; align-items: center; gap: 0.85rem;">
        <button type="button" data-modal-close id="lightbox-close-btn" title="Close" aria-label="Close image viewer"
          style="position: absolute; top: -46px; right: 0; background: rgba(255,255,255,0.12); color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 1.1rem; cursor: pointer;">&#10005;</button>

        <img src="${escapeHtml(list[idx])}" alt="${escapeHtml(title)}${list.length > 1 ? ` - photo ${idx + 1} of ${list.length}` : ''}"
          style="max-width: 100%; max-height: 75vh; border-radius: 12px; object-fit: contain; background: #0F172A; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">

        <div style="color: #fff; font-weight: 700; font-size: 0.95rem; text-align: center;">${escapeHtml(title)}</div>

        ${list.length > 1 ? `
          <div style="display: flex; align-items: center; gap: 1rem; color: #fff; font-size: 0.85rem;">
            <button type="button" id="lightbox-prev-btn" aria-label="Previous photo"
              style="background: rgba(255,255,255,0.12); color: #fff; border: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">&lsaquo;</button>
            <span aria-live="polite">${idx + 1} / ${list.length}</span>
            <button type="button" id="lightbox-next-btn" aria-label="Next photo"
              style="background: rgba(255,255,255,0.12); color: #fff; border: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;">&rsaquo;</button>
          </div>
        ` : ''}
      </div>
    `;

    overlay.querySelector('#lightbox-close-btn').addEventListener('click', () => close());
    overlay.querySelector('#lightbox-prev-btn')?.addEventListener('click', () => step(-1));
    overlay.querySelector('#lightbox-next-btn')?.addEventListener('click', () => step(1));
  }

  function step(delta) {
    idx = (idx + delta + list.length) % list.length;
    paint();
    // paint() rebuilds the buttons, so focus has to be put back on the one
    // that was just used or a keyboard user is dropped to the top each press.
    overlay.querySelector(delta < 0 ? '#lightbox-prev-btn' : '#lightbox-next-btn')?.focus();
  }

  function onKey(e) {
    if (list.length < 2) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  paint();

  // Escape, the focus trap and focus restoration all come from here, so this
  // viewer behaves like the app's other modals rather than inventing its own.
  const modal = makeAccessibleModal(overlay, {
    label: `${title} - image viewer`,
    returnFocusTo,
    onClose: () => document.removeEventListener('keydown', onKey),
  });
  close = modal.close;

  document.addEventListener('keydown', onKey);
  return close;
}
