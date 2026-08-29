/**
 * The list behind a chevron.
 *
 * Every control in this app that shows a chevron is promising a menu, and this
 * is that menu. It started as the "All Categories" list and is now general,
 * because the Gasabo nav bar needs the same thing for Plots, Houses and
 * Services and a third bespoke copy would be the drift this file exists to
 * prevent.
 *
 * Appended to document.body rather than beside the control, because a
 * stateEngine notify re-renders the view the control lives in and would tear
 * an open panel out mid-use.
 */
import { renderCategoryIcon, formatCategoryName } from '../utils/categoryIcon.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

let closeOpenMenu = null;

/**
 * @param {HTMLElement} anchor               the control that was clicked
 * @param {object}      options
 * @param {Array}       options.items        [{ id, label, iconHtml?, meta? }]
 * @param {string}      [options.selectedId] the item to mark as current
 * @param {string}      [options.label]      accessible name for the menu
 * @param {Function}    options.onSelect     called with the chosen item's id
 */
export function openDropdownMenu(anchor, { items = [], selectedId = null, label = 'Menu', onSelect } = {}) {
  // A second click on the same control closes it rather than stacking another
  // panel; a click on a different one swaps.
  if (closeOpenMenu) {
    const wasOurs = closeOpenMenu.anchor === anchor;
    closeOpenMenu();
    if (wasOurs) return () => {};
  }
  if (!items.length) return () => {};

  const menu = document.createElement('div');
  menu.id = 'dropdown-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', label);
  menu.style.cssText =
    'position: fixed; z-index: 1200; background: #fff; border: 1px solid #E5E7EB; ' +
    'border-radius: 12px; box-shadow: 0 14px 40px rgba(15,23,42,0.16); padding: 6px; ' +
    'min-width: 240px; max-height: min(70vh, 480px); overflow-y: auto; overscroll-behavior: contain; ' +
    '-webkit-overflow-scrolling: touch; scrollbar-width: thin;';

  menu.innerHTML = items.map((it, i) => `
    <button type="button" role="menuitem" class="dd-item" data-id="${escapeHtml(it.id)}" data-index="${i}"
      style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
             background: ${it.id === selectedId ? '#F0F7F3' : 'transparent'}; border: none;
             border-radius: 8px; cursor: pointer; text-align: left; font-size: 13px;
             color: ${it.id === selectedId ? '#04562D' : '#334155'};
             font-weight: ${it.id === selectedId ? '700' : '500'};">
      ${it.iconHtml ? `<span style="width: 22px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">${it.iconHtml}</span>` : ''}
      <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(it.label)}</span>
      ${it.meta ? `<span style="color:#94A3B8; font-size:11px; flex-shrink:0;">${escapeHtml(it.meta)}</span>` : ''}
    </button>
  `).join('');

  document.body.appendChild(menu);
  position();

  const itemEls = [...menu.querySelectorAll('.dd-item')];

  function position() {
    const r = anchor.getBoundingClientRect();
    const w = menu.offsetWidth;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      menu.style.bottom = `${window.innerHeight - r.top + 6}px`;
      menu.style.top = 'auto';
      menu.style.maxHeight = `${Math.min(spaceAbove, 480)}px`;
    } else {
      menu.style.top = `${r.bottom + 6}px`;
      menu.style.bottom = 'auto';
      menu.style.maxHeight = `${Math.min(Math.max(spaceBelow, 200), 480)}px`;
    }
    menu.style.left = `${left}px`;
  }

  function close() {
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('mousedown', onOutside, true);
    window.removeEventListener('resize', close);
    window.removeEventListener('scroll', onScroll, true);
    menu.remove();
    anchor.setAttribute('aria-expanded', 'false');
    closeOpenMenu = null;
  }

  function focusItem(i) {
    itemEls[(i + itemEls.length) % itemEls.length]?.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      anchor.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const current = itemEls.indexOf(document.activeElement);
    if (e.key === 'Home') focusItem(0);
    else if (e.key === 'End') focusItem(itemEls.length - 1);
    else focusItem(current + (e.key === 'ArrowDown' ? 1 : -1));
  }

  function onOutside(e) {
    // The control handles its own toggle, so a click on it must not close here
    // as well - the two would cancel out and the menu would never open.
    if (menu.contains(e.target) || anchor.contains(e.target)) return;
    close();
  }

  function onScroll(e) {
    // Do not close the menu if scrolling occurs inside the dropdown menu itself
    if (menu.contains(e.target) || e.target === menu) return;
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
  window.addEventListener('scroll', onScroll, true);

  anchor.setAttribute('aria-expanded', 'true');
  itemEls[0]?.focus();

  close.anchor = anchor;
  closeOpenMenu = close;
  return close;
}

/**
 * The "All Categories" list, in terms of the generic menu above. `prefixItems`
 * lets the responsive header put hidden primary nav links above the category
 * list in the More menu.
 */
export function openCategoryDropdown(anchor, { categories = [], selectedId = 'all', prefixItems = [], onSelect } = {}) {
  return openDropdownMenu(anchor, {
    label: 'Browse categories',
    selectedId,
    onSelect,
    items: [
      ...prefixItems,
      { id: 'all', label: 'All Categories', iconHtml: '<i class="fa-solid fa-border-all" style="color:#04562D"></i>' },
      ...categories.map((c) => ({
        id: c.id,
        label: formatCategoryName(c.name),
        iconHtml: renderCategoryIcon(c.icon, { size: 18, alt: '' }),
        meta: typeof c.count === 'number' ? String(c.count) : null,
      })),
    ],
  });
}
