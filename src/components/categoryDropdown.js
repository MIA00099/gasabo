/**
 * The list behind an "All Categories" chip.
 *
 * Both chips - the one in the hero search and the one in the navigation bar -
 * carry a chevron, which promises a menu. Neither opened one: the hero chip
 * switched to the catalog and the nav chip went home. This is that menu, built
 * once so the two cannot drift.
 *
 * Appended to document.body rather than beside the chip, because every
 * stateEngine notify re-renders the view the chip lives in and would tear an
 * open panel out mid-use.
 */
import { renderCategoryIcon } from '../utils/categoryIcon.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

let closeOpenMenu = null;

/**
 * @param {HTMLElement} anchor        the chip that was clicked
 * @param {object}      options
 * @param {Array}       options.categories  [{ id, name, icon, count }]
 * @param {string}      [options.selectedId] currently filtered category, or 'all'
 * @param {Function}    options.onSelect     called with a category id, or 'all'
 */
export function openCategoryDropdown(anchor, { categories = [], selectedId = 'all', onSelect } = {}) {
  // A second click on the chip closes it rather than stacking another panel.
  if (closeOpenMenu) {
    const wasOurs = closeOpenMenu.anchor === anchor;
    closeOpenMenu();
    if (wasOurs) return;
  }

  const items = [
    { id: 'all', name: 'All Categories', icon: null, count: null },
    ...categories,
  ];

  const menu = document.createElement('div');
  menu.id = 'category-dropdown';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Browse categories');
  menu.style.cssText =
    'position: fixed; z-index: 1200; background: #fff; border: 1px solid #E5E7EB; ' +
    'border-radius: 12px; box-shadow: 0 14px 40px rgba(15,23,42,0.16); padding: 6px; ' +
    'min-width: 232px; max-height: min(60vh, 420px); overflow-y: auto;';

  menu.innerHTML = items.map((c, i) => `
    <button type="button" role="menuitem" class="cat-dd-item" data-id="${escapeHtml(c.id)}" data-index="${i}"
      style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
             background: ${c.id === selectedId ? '#F0F7F3' : 'transparent'}; border: none;
             border-radius: 8px; cursor: pointer; text-align: left; font-size: 13px;
             color: ${c.id === selectedId ? '#04562D' : '#334155'};
             font-weight: ${c.id === selectedId ? '700' : '500'};">
      <span style="width: 22px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
        ${c.id === 'all'
          ? '<i class="fa-solid fa-border-all" style="color:#04562D"></i>'
          : renderCategoryIcon(c.icon, { size: 18, alt: '' })}
      </span>
      <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(c.name)}</span>
      ${typeof c.count === 'number'
        ? `<span style="color:#94A3B8; font-size:11px; flex-shrink:0;">${c.count}</span>`
        : ''}
    </button>
  `).join('');

  document.body.appendChild(menu);
  position();

  const itemEls = [...menu.querySelectorAll('.cat-dd-item')];

  function position() {
    const r = anchor.getBoundingClientRect();
    const w = menu.offsetWidth;
    // Prefer left-aligned under the chip; pull it back inside the viewport
    // when the chip sits near the right edge.
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${r.bottom + 6}px`;
  }

  function close() {
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('mousedown', onOutside, true);
    window.removeEventListener('resize', close);
    window.removeEventListener('scroll', close, true);
    menu.remove();
    anchor.setAttribute('aria-expanded', 'false');
    closeOpenMenu = null;
  }

  function focusItem(i) {
    const next = (i + itemEls.length) % itemEls.length;
    itemEls[next]?.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      anchor.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const current = itemEls.indexOf(document.activeElement);
    if (e.key === 'Home') focusItem(0);
    else if (e.key === 'End') focusItem(itemEls.length - 1);
    else focusItem(current + (e.key === 'ArrowDown' ? 1 : -1));
  }

  function onOutside(e) {
    // The chip handles its own toggle, so a click on it must not close here
    // as well - the two would cancel out and the menu would never open.
    if (menu.contains(e.target) || anchor.contains(e.target)) return;
    close();
  }

  itemEls.forEach((el) => {
    el.addEventListener('mouseenter', () => { el.style.background = '#F1F5F9'; });
    el.addEventListener('mouseleave', () => {
      el.style.background = el.dataset.id === selectedId ? '#F0F7F3' : 'transparent';
    });
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      close();
      if (onSelect) onSelect(id);
    });
  });

  document.addEventListener('keydown', onKey, true);
  document.addEventListener('mousedown', onOutside, true);
  window.addEventListener('resize', close);
  // Capture phase: the page scrolls in a container, not always on window.
  window.addEventListener('scroll', close, true);

  anchor.setAttribute('aria-expanded', 'true');
  itemEls[0]?.focus();

  close.anchor = anchor;
  closeOpenMenu = close;
  return close;
}
