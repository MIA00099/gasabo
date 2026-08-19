/**
 * KIGALI MARKET PLATFORM - Enterprise Navigation Header & Layout
 * Supporting Bilingual Kinyarwanda & English Language Switching.
 */
import './styles/main.css';
import { stateEngine } from './store/stateEngine.js';
import { getTranslation } from './store/i18n.js';
import { renderMarketplaceView, cleanupFlashClock } from './modules/marketplace/MarketplaceView.js';
import { renderRealEstateView, openPropertyModal } from './modules/realestate/RealEstateView.js';
import { renderAdminDashboardView } from './modules/admin/AdminDashboardView.js';
import { renderLoginView } from './components/LoginView.js';
import {
  renderHeaderHtml, bindHeaderEvents,
  renderMobileTabBarHtml, bindMobileTabBarEvents,
} from './components/Header.js';
import { renderProductDetailModal } from './modules/marketplace/ProductDetailModal.js';
import {
  parseLocation, onRouteChange, pushHome, pushPath, pathForRoute,
  ROUTE_HOME, ROUTE_PRODUCT,
} from './store/router.js';

const ADMIN_URL_HASH = '#/admin-portal';

let notifDropdownOpen = false;
let openListingKey = null;
let openListingEl = null;

function listingKey(route) {
  return !route || route.kind === ROUTE_HOME || !route.id ? null : `${route.kind}:${route.id}`;
}

function closeOpenListing() {
  if (openListingEl) openListingEl.remove();
  document.body.style.overflow = 'auto';
  openListingEl = null;
  openListingKey = null;
}

function syncListingModal(state) {
  const key = listingKey(state.route);

  if (!key) {
    closeOpenListing();
    return;
  }
  if (key === openListingKey) return;

  if (!state.routeListing) {
    closeOpenListing();
    return;
  }

  closeOpenListing();
  openListingKey = key;

  const returnHome = () => {
    openListingKey = null;
    openListingEl = null;

    // Step back through history rather than pushing "/". Opening a listing
    // from the products page and closing it used to land on the homepage,
    // losing the category and sort the reader had chosen. history.back()
    // returns them to whichever page they opened it from, and popstate
    // re-syncs the route.
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    // Opened directly on a listing URL (a shared link) - there is nothing to
    // go back to, so fall through to the homepage.
    pushHome();
    stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
  };

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

  onRouteChange((route) => stateEngine.setRoute(route));

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
    const isAdminRole = currentUser.role === 'admin' || currentUser.role === 'sub_admin';
    const isSellerRole = currentUser.role === 'seller';
    const showAccountChip = isLoggedIn && (!isAdminRole || activePortal === 'admin');
    const showNotifBell = isLoggedIn && ((isAdminRole && activePortal === 'admin') || (isSellerRole && activePortal === 'marketplace'));

    if (showNotifBell && state.loading.notifications === undefined) {
      stateEngine.loadNotifications().catch(() => {});
    }
    const unreadNotifCount = state.notifications.filter(n => !n.isRead).length;

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
        goHome: () => {
          stateEngine.setUI({ marketplaceTab: 'products' });
          stateEngine.setPortal('marketplace');
        },
        goRealEstate: () => stateEngine.setPortal('realestate'),
        goStores: () => {
          stateEngine.setUI({ marketplaceTab: 'stores' });
          stateEngine.setPortal('marketplace');
        },
        goVehicles: () => {
          const cats = stateEngine.getState().categories || [];
          const vehicles = cats.find(c => /vehicle|car/i.test(c.name));
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({ marketplaceTab: 'catalog', marketplaceFilters: { ...filters, selectedCategory: vehicles ? vehicles.id : 'all' } });
          stateEngine.setPortal('marketplace');
          stateEngine.loadProducts({ category: vehicles ? vehicles.id : undefined }).catch(() => {});
        },
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
        search: (query) => {
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({
            marketplaceTab: 'catalog',
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

      if (appElement) appElement.style.paddingTop = '';
    }

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

    // Mobile tab bar
    let tabMount = document.getElementById('mobile-tabbar-mount');
    if (!tabMount) {
      tabMount = document.createElement('div');
      tabMount.id = 'mobile-tabbar-mount';
      document.body.appendChild(tabMount);
    }

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
