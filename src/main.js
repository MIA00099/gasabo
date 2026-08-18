/**
 * KIGALI MARKET PLATFORM - Enterprise Navigation Header & Layout
 * Supporting Bilingual Kinyarwanda & English Language Switching.
 */
import './styles/main.css';
import { stateEngine } from './store/stateEngine.js';
import { getTranslation } from './store/i18n.js';
import { renderMarketplaceView, cleanupHeroAnimation, cleanupBannerRotation, cleanupFlashClock } from './modules/marketplace/MarketplaceView.js';
import { renderRealEstateView, openPropertyModal } from './modules/realestate/RealEstateView.js';
import { renderAdminDashboardView } from './modules/admin/AdminDashboardView.js';
import { renderLoginView } from './components/LoginView.js';
import {
  renderHeaderHtml, bindHeaderEvents,
  renderMobileTabBarHtml, bindMobileTabBarEvents,
} from './components/Header.js';
import { renderProductDetailModal } from './modules/marketplace/ProductDetailModal.js';
import { parseLocation, onRouteChange, pushHome, ROUTE_HOME, ROUTE_PRODUCT } from './store/router.js';

// The admin portal is intentionally NOT linked from any public nav/footer - it's
// only reachable by visiting this exact URL directly (bookmark it). This is on
// top of, not instead of, the real Administrator/Sub-Administrator login gate
// inside AdminDashboardView - the URL just keeps it off the public UI.
const ADMIN_URL_HASH = '#/admin-portal';

// Module scope, not a renderApp() local - renderApp() is called on every
// single stateEngine notify (any state change anywhere), which would reset
// a closure-local "is the dropdown open" back to false the instant anything
// else in the app changed while it was open.
let notifDropdownOpen = false;

// Which listing detail is currently on screen, and the element showing it.
// Module scope for the same reason as notifDropdownOpen: renderApp() runs on
// every state change, and a closure-local would forget the open modal the
// instant anything else in the app changed.
let openListingKey = null;
let openListingEl = null;

function listingKey(route) {
  return !route || route.kind === ROUTE_HOME || !route.id ? null : `${route.kind}:${route.id}`;
}

function closeOpenListing() {
  if (openListingEl) openListingEl.remove();
  // openPropertyModal locks body scroll while open; releasing it here covers
  // the case where we removed the element rather than its own close running.
  document.body.style.overflow = 'auto';
  openListingEl = null;
  openListingKey = null;
}

/**
 * Keep the visible listing detail in agreement with the URL.
 *
 * Every route into a detail view - a card click, a shared link opened cold,
 * Back/Forward - ends up here, so there is one place that decides what is on
 * screen rather than three.
 */
function syncListingModal(state) {
  const key = listingKey(state.route);

  if (!key) {
    closeOpenListing();
    return;
  }
  // Already showing the right one; don't rebuild it and lose the chosen
  // thumbnail or scroll position.
  if (key === openListingKey) return;

  // The listing is still being fetched, or turned out not to exist. Leave
  // any previous detail closed and wait - loadRouteListing() notifies again
  // when it resolves.
  if (!state.routeListing) {
    closeOpenListing();
    return;
  }

  closeOpenListing();
  openListingKey = key;

  const returnHome = () => {
    openListingKey = null;
    openListingEl = null;
    pushHome();
    stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
  };

  // Where keyboard focus should land once the detail closes: the card that
  // opened it. Passed as a selector rather than an element because closing
  // re-renders the grid - the original node is gone by then, and only the
  // freshly-rendered replacement can be focused. data-id survives the
  // re-render, so it is what identifies the card.
  const returnFocusTo =
    state.route.kind === ROUTE_PRODUCT
      ? `.product-card-action[data-id="${state.route.id}"]`
      : `.re-property-card[data-id="${state.route.id}"]`;

  if (state.route.kind === ROUTE_PRODUCT) {
    openListingEl = renderProductDetailModal(state.routeListing, returnHome, returnFocusTo);
  } else {
    openListingEl = openPropertyModal(
      state.routeListing,
      state.realEstate?.contact,
      returnHome,
      returnFocusTo,
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');

  function checkAdminRoute() {
    if (window.location.hash === ADMIN_URL_HASH) {
      stateEngine.setPortal('admin');
    }
  }
  window.addEventListener('hashchange', checkAdminRoute);
  checkAdminRoute();

  // Back/Forward between listings and the marketplace. The state engine seeds
  // state.route from the address bar at construction, so a cold load of
  // /product/<id> is already correct before the first render; this only has
  // to handle subsequent history moves.
  onRouteChange((route) => stateEngine.setRoute(route));

  // Kick off the fetch for a listing URL opened directly.
  const initialRoute = parseLocation();
  if (initialRoute.kind !== ROUTE_HOME) {
    stateEngine.setRoute(initialRoute);
  }

  function renderApp() {
    const state = stateEngine.getState();
    const activePortal = state.activePortal;
    const currentUser = state.currentUser;
    const currentLang = state.currentLang || 'en';
    const isLoggedIn = currentUser.role !== 'guest';
    // Admin/sub-admin identity and logout are only shown while actually
    // inside the admin panel - the admin portal is deliberately unlinked
    // from public nav (reachable only via its hidden URL), so surfacing
    // "Jean-Luc / ADMINISTRATOR" on the public marketplace page would
    // broadcast that an admin is logged in on this device to anyone looking
    // at the screen, and give away a control (Logout) that shouldn't be
    // visible outside the admin area at all.
    const isAdminRole = currentUser.role === 'admin' || currentUser.role === 'sub_admin';
    const isSellerRole = currentUser.role === 'seller';
    const showAccountChip = isLoggedIn && (!isAdminRole || activePortal === 'admin');
    // GET /api/notifications now serves both admin roles (approvals,
    // removals, etc.) and sellers (listing-expiry reminders) - shown exactly
    // where each role's identity chip is, i.e. inside the admin portal for
    // admins, and anywhere in the marketplace portal for a logged-in seller
    // (their dashboard lives inside it, not as a separate top-level portal).
    const showNotifBell = isLoggedIn && ((isAdminRole && activePortal === 'admin') || (isSellerRole && activePortal === 'marketplace'));
    if (showNotifBell && state.loading.notifications === undefined) {
      stateEngine.loadNotifications().catch(() => {});
    }
    const unreadNotifCount = state.notifications.filter(n => !n.isRead).length;

    const t = (key) => getTranslation(currentLang, key);

    cleanupHeroAnimation();
    cleanupBannerRotation();
    cleanupFlashClock();

    // Header Mount
    const headerMount = document.getElementById('header-mount');
    if (headerMount) {
      headerMount.innerHTML = renderHeaderHtml({
        activePortal,
        currentUser,
        currentLang,
        searchQuery: state.ui.marketplaceFilters?.searchQuery || '',
        showAccountChip,
        showNotifBell,
        unreadNotifCount,
        notifications: state.notifications,
        notifDropdownOpen,
      });

      bindHeaderEvents(headerMount, {
        // The brand and the Home tab must land on the browse page from
        // anywhere - not merely flip activePortal and leave marketplaceTab
        // wherever it was (e.g. still 'seller_portal'), which would appear to
        // do nothing when activePortal is already 'marketplace'.
        goHome: () => {
          stateEngine.setUI({ marketplaceTab: 'products' });
          stateEngine.setPortal('marketplace');
        },
        goRealEstate: () => stateEngine.setPortal('realestate'),
        goSignup: () => stateEngine.setPortal('signup'),
        logout: () => {
          stateEngine.logout();
          stateEngine.setPortal('marketplace');
        },
        setLanguage: (lang) => stateEngine.setLanguage(lang),
        toggleNotifications: () => {
          notifDropdownOpen = !notifDropdownOpen;
          renderApp();
        },
        markAllRead: () => stateEngine.markAllNotificationsRead().catch(() => {}),
        markRead: (id) => stateEngine.markNotificationRead(id).catch(() => {}),
        // Search lives in the header now, so it drives the marketplace
        // filters the grid already reads from.
        search: (query) => {
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({
            marketplaceTab: 'products',
            marketplaceFilters: { ...filters, searchQuery: query },
          });
          stateEngine.setPortal('marketplace');
          stateEngine.loadProducts({
            search: query,
            category: filters.selectedCategory,
            district: filters.selectedDistrict,
          }).catch(() => {});
        },
      });

      // .main-navbar is position:fixed (see main.css), which removes it from
      // normal document flow - without this, the fixed bar would sit on top
      // of and hide the first row of whatever's rendered below it. Measure
      // the navbar itself, not #header-mount: a fixed child contributes
      // nothing to its (non-fixed) parent's box size, so header-mount always
      // reads back 0 even though the navbar inside it is rendering normally.
      const navbarEl = headerMount.querySelector('.main-navbar');
      if (appElement && navbarEl) {
        appElement.style.paddingTop = navbarEl.offsetHeight + 'px';
      }
    }

    // Keep the address bar in sync with the admin portal's dedicated URL, without
    // triggering an extra hashchange/scroll jump (replaceState, not location.hash=).
    const onAdminRoute = window.location.hash === ADMIN_URL_HASH;
    if (activePortal === 'admin' && !onAdminRoute) {
      history.replaceState(null, '', ADMIN_URL_HASH);
    } else if (activePortal !== 'admin' && onAdminRoute) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Main Portal Rendering
    if (appElement) {
      appElement.innerHTML = '';
      if (activePortal === 'marketplace') {
        renderMarketplaceView(appElement);
      } else if (activePortal === 'realestate') {
        renderRealEstateView(appElement);
      } else if (activePortal === 'admin') {
        renderAdminDashboardView(appElement);
      } else if (activePortal === 'login' || activePortal === 'signup') {
        renderLoginView(appElement, activePortal);
      }
    }

    // After the portal is mounted, so the detail sits over a page that has
    // finished rendering. The modal lives on document.body and therefore
    // survives the appElement.innerHTML reset above.
    // Mobile tab bar. Mounted outside #app so the portal re-render above does
    // not tear it down, and hidden by CSS above 900px where the header
    // already carries these actions.
    let tabMount = document.getElementById('mobile-tabbar-mount');
    if (!tabMount) {
      tabMount = document.createElement('div');
      tabMount.id = 'mobile-tabbar-mount';
      document.body.appendChild(tabMount);
    }
    // The admin portal has its own dedicated navigation and is deliberately
    // unlinked from the public UI - a Post Ad button over it makes no sense.
    if (activePortal === 'admin') {
      tabMount.innerHTML = '';
    } else {
      tabMount.innerHTML = renderMobileTabBarHtml({ activePortal, currentUser });
      bindMobileTabBarEvents(tabMount, {
        goHome: () => {
          stateEngine.setUI({ marketplaceTab: 'products' });
          stateEngine.setPortal('marketplace');
        },
        goSignup: () => stateEngine.setPortal('signup'),
      });
    }

    syncListingModal(state);
  }

  stateEngine.subscribe(renderApp);
  renderApp();
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
