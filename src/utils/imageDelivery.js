import { API_BASE } from '../api/client.js';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const AUTO_EAGER_IMAGE_COUNT = 6;
let renderedImageCount = 0;
const OPTIMIZABLE_EXT = /\.(?:jpe?g|png|webp)(?:[?#].*)?$/i;

export const IMAGE_WIDTHS = Object.freeze({
  tiny: [96, 144, 192],
  card: [240, 320, 480],
  related: [240, 360, 540],
  detail: [480, 768, 960, 1280],
  hero: [640, 960, 1280, 1600],
});

function escapeAttr(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

function normalizedWidths(widths) {
  return [...new Set((widths || []).map((w) => Number(w)).filter((w) => Number.isFinite(w) && w > 0))]
    .sort((a, b) => a - b);
}

function sourcePathname(src) {
  try {
    if (/^https?:\/\//i.test(src)) return new URL(src).pathname;
    return new URL(src, 'https://kigalimarket.local').pathname;
  } catch {
    return '';
  }
}

export function canOptimizeImage(src) {
  if (!src || typeof src !== 'string') return false;
  if (/^(?:data:|blob:)/i.test(src)) return false;
  const pathname = sourcePathname(src);
  return (
    (pathname.startsWith('/uploads/') || pathname.includes('/storage/v1/object/public/product-images/')) &&
    OPTIMIZABLE_EXT.test(pathname)
  );
}

export function imageVariantUrl(src, width, { quality = 74 } = {}) {
  const base = API_BASE ? `${API_BASE}/api/images/optimized` : '/api/images/optimized';
  const params = new URLSearchParams({
    src: String(src || ''),
    w: String(width),
    q: String(quality),
  });
  return `${base}?${params.toString()}`;
}

export function responsiveImageAttrs(src, {
  alt = '',
  className = '',
  style = '',
  widths = IMAGE_WIDTHS.card,
  sizes = '100vw',
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  quality = 74,
  fallbackWidth,
  defer = false,
} = {}) {
  const source = String(src || '');
  // The first visible product images are usually above the fold. Native lazy
  // loading can delay them until after layout/scroll heuristics, which makes a
  // fast page feel unfinished. Eager-load only this small initial budget;
  // everything after it remains lazy so bandwidth and memory stay bounded.
  const isInitialViewportImage = loading === 'lazy' && !defer && renderedImageCount < AUTO_EAGER_IMAGE_COUNT;
  if (!defer) renderedImageCount += 1;
  const effectiveLoading = isInitialViewportImage ? 'eager' : loading;
  const effectiveFetchPriority = isInitialViewportImage && !fetchPriority ? 'high' : fetchPriority;
  const candidates = normalizedWidths(widths);
  const canOptimize = canOptimizeImage(source) && candidates.length > 0;
  const fallback = fallbackWidth || candidates[Math.max(0, Math.floor(candidates.length / 2))] || width || 640;
  const displaySrc = source
    ? (canOptimize ? imageVariantUrl(source, fallback, { quality }) : source)
    : TRANSPARENT_PIXEL;
  const srcset = canOptimize
    ? candidates.map((candidate) => `${imageVariantUrl(source, candidate, { quality })} ${candidate}w`).join(', ')
    : '';

  const attrs = [
    defer ? `src="${TRANSPARENT_PIXEL}"` : `src="${escapeAttr(displaySrc)}"`,
    defer ? `data-src="${escapeAttr(displaySrc)}"` : '',
    defer && srcset ? `data-srcset="${escapeAttr(srcset)}"` : '',
    defer && srcset ? `data-sizes="${escapeAttr(sizes)}"` : '',
    !defer && srcset ? `srcset="${escapeAttr(srcset)}"` : '',
    !defer && srcset ? `sizes="${escapeAttr(sizes)}"` : '',
    `alt="${escapeAttr(alt)}"`,
    width ? `width="${Math.round(Number(width))}"` : '',
    height ? `height="${Math.round(Number(height))}"` : '',
    effectiveLoading ? `loading="${escapeAttr(effectiveLoading)}"` : '',
    decoding ? `decoding="${escapeAttr(decoding)}"` : '',
    effectiveFetchPriority ? `fetchpriority="${escapeAttr(effectiveFetchPriority)}"` : '',
    className ? `class="${escapeAttr(className)}"` : '',
    style ? `style="${escapeAttr(style)}"` : '',
  ].filter(Boolean);

  return attrs.join(' ');
}

export function hydrateResponsiveImage(img) {
  if (!img?.dataset?.src) return;
  if (img.dataset.srcset) img.setAttribute('srcset', img.dataset.srcset);
  if (img.dataset.sizes) img.setAttribute('sizes', img.dataset.sizes);
  img.setAttribute('src', img.dataset.src);
  delete img.dataset.src;
  delete img.dataset.srcset;
  delete img.dataset.sizes;
}

export function applyResponsiveImageSource(img, src, options = {}) {
  if (!img) return;
  const attrs = responsiveImageAttrs(src, {
    ...options,
    alt: img.getAttribute('alt') || options.alt || '',
    className: img.getAttribute('class') || options.className || '',
    style: img.getAttribute('style') || options.style || '',
  });
  const template = document.createElement('template');
  template.innerHTML = `<img ${attrs}>`;
  const next = template.content.firstElementChild;
  ['src', 'srcset', 'sizes', 'width', 'height', 'loading', 'decoding', 'fetchpriority'].forEach((name) => {
    if (next.hasAttribute(name)) img.setAttribute(name, next.getAttribute(name));
    else img.removeAttribute(name);
  });
}
