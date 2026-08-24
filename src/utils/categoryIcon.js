/**
 * Category icons are stored in a single Category.iconUrl column that holds
 * either an emoji ("📦") or an uploaded image URL. Both forms are live: every
 * category created before icon uploads existed holds an emoji, and there is
 * no migration that could turn one into the other - an emoji is not an image.
 *
 * So every render site has to branch, and this is the one place that decides
 * which is which.
 */

/** True when the stored icon is an image to load rather than text to print. */
export function isImageIcon(icon) {
  if (!icon) return false;
  return /^(https?:\/\/|\/uploads\/|data:image\/)/i.test(String(icon).trim());
}

function escapeAttr(str) {
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

/**
 * HTML for a category icon at a given pixel size.
 *
 * `fallback` renders when there is no icon at all - categories predating the
 * icon column, and the null a failed upload would leave behind.
 */
export function renderCategoryIcon(icon, { size = 24, alt = '', fallback = '<i class="fa-solid fa-tag"></i>' } = {}) {
  if (!icon) return fallback;

  if (isImageIcon(icon)) {
    // object-fit: contain, because an uploaded logo is any aspect ratio it
    // likes and cropping one to a square cuts the wordmark off.
    return `<img src="${escapeAttr(icon)}" alt="${escapeAttr(alt)}" ` +
      `style="width:${size}px;height:${size}px;object-fit:contain;display:inline-block;vertical-align:middle;" ` +
      `loading="lazy">`;
  }

  return `<span style="font-size:${Math.round(size * 0.85)}px;line-height:1;">${escapeAttr(icon)}</span>`;
}

/**
 * Plain-text form, for the places that cannot hold markup at all - notably
 * <option>, where a browser renders any child element as nothing.
 */
export function categoryIconText(icon) {
  return isImageIcon(icon) ? '' : (icon || '');
}

/**
 * Normalizes category display names so "realestate" renders formatted as "Real Estate".
 */
export function formatCategoryName(name) {
  if (!name) return '';
  const s = String(name).trim();
  if (/^real[\s_-]?estate$/i.test(s)) return 'Real Estate';
  return s;
}
