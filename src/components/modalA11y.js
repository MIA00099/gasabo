/**
 * Shared modal accessibility wiring.
 *
 * Both detail modals in this app (marketplace product, real-estate property)
 * were built as plain divs appended to <body>. They rendered and were in the
 * DOM, but nothing marked them as dialogs: no role, no aria-modal, no
 * accessible name, so a screen reader announced them as an anonymous group
 * rather than something that had taken over the page.
 *
 * Keyboard handling was the bigger gap. Focus stayed on whatever was behind
 * the modal, Tab walked straight out of it into the page underneath, Escape
 * did nothing, and dismissing it dropped focus onto <body> so the next Tab
 * restarted from the top of the document.
 *
 * This centralises the fix so the two modals cannot drift apart:
 *   - announces the element as a dialog (role, aria-modal, a label)
 *   - Escape closes
 *   - Tab and Shift+Tab cycle within the modal instead of escaping it
 *   - focus moves into the modal on open, and returns to whatever the user
 *     was on when it closes, so the page does not jump to the top
 *
 * Usage: build the overlay, append it, then call this and use the returned
 * close() everywhere the modal can be dismissed.
 */

// Deliberately excludes [tabindex="-1"] - those are programmatically
// focusable but must not appear in the tab cycle.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Build a selector that can find this element again after a re-render.
 *
 * Holding the element itself is not enough here. Closing a listing modal
 * changes the route, which re-renders the whole view and throws away the very
 * card button that opened it - focusing that detached node then does nothing
 * and focus silently lands on <body>, i.e. the top of the page. Product and
 * property cards carry data-id, which survives the re-render, so the fresh
 * element can be found again.
 */
function describeElement(el) {
  if (!el || el === document.body || el === document.documentElement) return null;

  const id = el.dataset && el.dataset.id;
  if (id) {
    const cls = Array.from(el.classList || [])[0];
    const idPart = `[data-id="${CSS.escape(id)}"]`;
    return cls ? `.${CSS.escape(cls)}${idPart}` : idPart;
  }

  if (el.id) return `#${CSS.escape(el.id)}`;
  return null;
}

export function makeAccessibleModal(overlay, { label, onClose, returnFocusTo } = {}) {
  // Captured before focus moves, so it can be handed back on close. Both the
  // node and a way to re-find it - see describeElement above.
  //
  // `returnFocusTo` (a selector) wins when supplied, and callers driven by a
  // route change MUST supply it: navigating re-renders the view before the
  // modal is built, so by the time this runs the control that was clicked is
  // already gone and document.activeElement has fallen back to <body>. There
  // is nothing useful left here to capture.
  const previouslyFocused = document.activeElement;
  const previousSelector = returnFocusTo || describeElement(previouslyFocused);

  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  if (label) overlay.setAttribute('aria-label', label);

  function focusableItems() {
    // offsetParent is null for anything display:none - a hidden control must
    // not become an invisible tab stop.
    return Array.from(overlay.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null,
    );
  }

  let closed = false;

  function restoreFocus() {
    // Selector first: an explicit returnFocusTo always describes the element
    // as it exists *after* the closing re-render, which is what we want.
    if (previousSelector) {
      const target = document.querySelector(previousSelector);
      if (target && typeof target.focus === 'function') {
        target.focus();
        return;
      }
    }

    // Otherwise the original node, when it survived the close.
    if (previouslyFocused && document.body.contains(previouslyFocused)) {
      previouslyFocused.focus();
    }
  }

  function close() {
    if (closed) return;
    closed = true;

    document.removeEventListener('keydown', onKeydown, true);
    overlay.remove();
    document.body.style.overflow = 'auto';

    // onClose FIRST, then focus. Closing a listing modal changes the route,
    // and the resulting re-render replaces the card that was focused - so
    // restoring focus beforehand would target a node that is about to be
    // discarded, dropping focus to <body> and sending the user back to the
    // top of the page.
    if (onClose) onClose();

    restoreFocus();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    const items = focusableItems();
    if (items.length === 0) {
      // Nothing to focus inside - keep focus on the dialog rather than
      // letting Tab wander into the page behind it.
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Capture phase: the handler must run even when focus sits on a child that
  // stops propagation.
  document.addEventListener('keydown', onKeydown, true);

  // Move focus in. Prefer the close button so the first thing a keyboard or
  // screen-reader user reaches is the way out.
  const closeButton = overlay.querySelector('[data-modal-close]');
  const target = closeButton || focusableItems()[0] || overlay;
  if (target === overlay) overlay.setAttribute('tabindex', '-1');
  target.focus();

  return { close };
}
