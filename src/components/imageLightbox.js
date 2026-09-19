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
  let wheelLocked = false;
  let startX = 0;
  let startY = 0;
  let trackingTouch = false;

  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 9999; ' +
    'display: flex; flex-direction: column; align-items: center; justify-content: center; ' +
    'padding: 12px; touch-action: none; overscroll-behavior: contain;';

  function paint() {
    overlay.innerHTML = `
      <button type="button" data-modal-close id="lightbox-close-btn" title="Close" aria-label="Close image viewer"
        style="position: fixed; top: 16px; right: 16px; z-index: 10000; background: rgba(0, 0, 0, 0.6); color: #fff; border: 1px solid rgba(255,255,255,0.25); width: 44px; height: 44px; border-radius: 50%; font-size: 1.25rem; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px);">✕</button>

      ${list.length > 1 ? `
        <button type="button" id="lightbox-prev-btn" aria-label="Previous photo"
          style="position: fixed; left: 16px; top: 50%; transform: translateY(-50%); z-index: 10000; background: rgba(0,0,0,0.6); color: #fff; border: 1px solid rgba(255,255,255,0.25); width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 1.6rem; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);">&lsaquo;</button>
        <button type="button" id="lightbox-next-btn" aria-label="Next photo"
          style="position: fixed; right: 16px; top: 50%; transform: translateY(-50%); z-index: 10000; background: rgba(0,0,0,0.6); color: #fff; border: 1px solid rgba(255,255,255,0.25); width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 1.6rem; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);">&rsaquo;</button>
      ` : ''}

      <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0;">
        <img src="${escapeHtml(list[idx])}" alt="${escapeHtml(title)}${list.length > 1 ? ` - photo ${idx + 1} of ${list.length}` : ''}"
          style="width: auto; height: auto; max-width: 98vw; max-height: calc(100vh - 90px); object-fit: contain; filter: drop-shadow(0 12px 40px rgba(0,0,0,0.8));">

        <div style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; color: #fff; text-align: center; max-width: 90vw; pointer-events: none;">
          <div style="font-weight: 700; font-size: 0.95rem; text-shadow: 0 2px 8px rgba(0,0,0,0.9);">${escapeHtml(title)}</div>
          ${list.length > 1 ? `
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.85); text-shadow: 0 2px 6px rgba(0,0,0,0.9); font-weight: 600;">
              <span aria-live="polite">${idx + 1} / ${list.length}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    overlay.querySelector('#lightbox-close-btn').addEventListener('click', () => close());
    overlay.querySelector('#lightbox-prev-btn')?.addEventListener('click', () => step(-1));
    overlay.querySelector('#lightbox-next-btn')?.addEventListener('click', () => step(1));
  }

  function step(delta, { restoreButtonFocus = true } = {}) {
    idx = (idx + delta + list.length) % list.length;
    paint();
    // paint() rebuilds the buttons, so focus has to be put back on the one
    // that was just used or a keyboard user is dropped to the top each press.
    if (restoreButtonFocus) {
      overlay.querySelector(delta < 0 ? '#lightbox-prev-btn' : '#lightbox-next-btn')?.focus();
    }
  }

  function onKey(e) {
    if (list.length < 2) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  }

  function onWheel(e) {
    if (list.length < 2) return;
    const primaryDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(primaryDelta) < 24 || wheelLocked) return;
    e.preventDefault();
    wheelLocked = true;
    step(primaryDelta > 0 ? 1 : -1, { restoreButtonFocus: false });
    window.setTimeout(() => { wheelLocked = false; }, 320);
  }

  function onTouchStart(e) {
    if (list.length < 2 || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    trackingTouch = true;
  }

  function onTouchMove(e) {
    if (!trackingTouch || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12 && e.cancelable) {
      e.preventDefault();
    }
  }

  function onTouchEnd(e) {
    if (!trackingTouch) return;
    trackingTouch = false;
    const touch = e.changedTouches?.[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy)) return;
    if (e.cancelable) e.preventDefault();
    step(dx < 0 ? 1 : -1, { restoreButtonFocus: false });
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('wheel', onWheel, { passive: false });
  overlay.addEventListener('touchstart', onTouchStart, { passive: true });
  overlay.addEventListener('touchmove', onTouchMove, { passive: false });
  overlay.addEventListener('touchend', onTouchEnd, { passive: false });
  document.body.style.overflow = 'hidden';
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
