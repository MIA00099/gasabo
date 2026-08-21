/**
 * The star row for a listing's rating.
 *
 * The rating is a number an administrator assigns - there is no review model
 * behind it - so this returns nothing at all when none has been set. The
 * cards used to print a fixed four-and-a-half stars with "(128)" beside them
 * on every listing regardless, which is worse than showing nothing.
 */
export function starsHtml(rating) {
  const r = Number(rating) || 0;
  if (r <= 0) return '';
  let out = '';
  for (let i = 1; i <= 5; i++) {
    if (r >= i) out += '<i class="fa-solid fa-star"></i>';
    else if (r >= i - 0.5) out += '<i class="fa-solid fa-star-half-stroke"></i>';
    else out += '<i class="fa-regular fa-star text-gray-300"></i>';
  }
  return out;
}
