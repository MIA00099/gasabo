/**
 * KIGALI MARKET PLATFORM - Enterprise Navigation Header & Layout
 * Supporting Bilingual Kinyarwanda & English Language Switching.
 */
import './styles/main.css';
import { stateEngine } from './store/stateEngine.js';
import { getTranslation } from './store/i18n.js';
import { renderMarketplaceView, cleanupFlashClock, cleanupHeroSlider } from './modules/marketplace/MarketplaceView.js';
import { renderRealEstateView, openPropertyModal } from './modules/realestate/RealEstateView.js';
import { renderAdminDashboardView } from './modules/admin/AdminDashboardView.js';
import { renderLoginView } from './components/LoginView.js';
import {
  renderHeaderHtml, bindHeaderEvents,
  renderMobileTabBarHtml, bindMobileTabBarEvents,
  notReadyToast,
} from './components/Header.js';
// Listings render as a full page now (product-detail.html), not an overlay.
import { renderProductDetailPage } from './modules/marketplace/ProductDetailPage.js';
import { openCategoryDropdown } from './components/dropdownMenu.js';
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
  document.body.style.removeProperty('overflow');
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

  // Products render as a full page (see renderProductDetailPage in the portal
  // switch below); only real-estate properties still use an overlay.
  if (state.route.kind === ROUTE_PRODUCT) {
    return;
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


  /**
   * Send the catalog to a category matched by name.
   *
   * The same shape as goVehicles / goRealEstateCategory: an admin creates and
   * names these rows, so they are found by pattern rather than by id.
   *
   * Returns false without navigating when nothing matches, so a caller can
   * decide what that means. Opening the unfiltered catalog instead would show
   * every listing on the site under a heading the reader asked to filter by -
   * which is exactly how the old category strip behaved, and it read as
   * broken rather than as empty.
   */
  function goCategoryByName(pattern) {
    const cats = stateEngine.getState().categories || [];
    const match = cats.find((c) => pattern.test(c.name));
    if (!match) return false;
    pushHome();
    stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
    const filters = stateEngine.getState().ui.marketplaceFilters || {};
    stateEngine.setUI({
      marketplaceTab: 'catalog',
      marketplaceFilters: { ...filters, selectedCategory: match.id },
    });
    stateEngine.setPortal('marketplace');
    stateEngine.loadProducts({ category: match.id }).catch(() => {});
    return true;
  }

  /**
   * Where a click on "Post an Ad", the account chip or the mobile Account tab
   * should go.
   *
   * All three used to call setPortal('signup') unconditionally, so a seller
   * who was already signed in got a form to create the account they were
   * signed into. Signed in, go to your own dashboard; signed out, sign up.
   */
  function goAccountOrSignup() {
    pushHome();
    stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
    const role = stateEngine.getState().currentUser.role;
    if (role === 'guest') {
      stateEngine.setPortal('signup');
      return;
    }
    stateEngine.routeToDashboard();
  }

  function handleGoHome() {
    pushHome();
    stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
    const filters = stateEngine.getState().ui.marketplaceFilters || {};
    stateEngine.setUI({
      marketplaceTab: 'products',
      marketplaceFilters: { ...filters, searchQuery: '', selectedCategory: 'all', selectedDistrict: 'all' },
    });
    stateEngine.setPortal('marketplace');
    stateEngine.loadProducts({}).catch(() => {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    // Same reason as the clock: this view is about to be replaced, and the
    // slider's interval would keep firing against slides that no longer exist.
    cleanupHeroSlider();

    // Header Mount
    const headerMount = document.getElementById('header-mount');
    if (headerMount) {
      // The Gasabo portal carries its own nav bar and nothing else: no
      // marketplace header, and no announcement strip advertising delivery on
      // a property page. This is the "nav must be this only" instruction -
      // the bar in RealEstateView is the whole navigation there.
      if (activePortal === 'realestate') {
        headerMount.innerHTML = '';
      } else {
      headerMount.innerHTML = renderHeaderHtml({
        activePortal,
        currentUser,
        currentLang,
        showAccountChip,
        showNotifBell,
        unreadNotifCount,
        notifications: state.notifications,
        notifDropdownOpen,
      });

      bindHeaderEvents(headerMount, {
        goHome: handleGoHome,
        goRealEstate: () => {
          pushHome();
          stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
          stateEngine.setPortal('realestate');
        },
        goStores: () => {
          pushHome();
          stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
          stateEngine.setUI({ marketplaceTab: 'stores' });
          stateEngine.setPortal('marketplace');
        },
        goVehicles: () => {
          pushHome();
          stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
          const cats = stateEngine.getState().categories || [];
          const vehicles = cats.find(c => /vehicle|car/i.test(c.name));
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({ marketplaceTab: 'catalog', marketplaceFilters: { ...filters, selectedCategory: vehicles ? vehicles.id : 'all' } });
          stateEngine.setPortal('marketplace');
          stateEngine.loadProducts({ category: vehicles ? vehicles.id : undefined }).catch(() => {});
        },
        // The nav item is a category filter now, like Vehicles beside it -
        // Gasabo has its own brand in the middle of the header, so this no
        // longer needs to be the way into that portal.
        //
        // The pattern is loose because the category is named by an admin and
        // has been spelt "realestate" in production and "Real Estate" in the
        // mockups; "propert" catches "Property" and "Properties" too.
        goRealEstateCategory: () => {
          pushHome();
          stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
          const cats = stateEngine.getState().categories || [];
          const re = cats.find((c) => /real[\s_-]?estate|propert/i.test(c.name));
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({
            marketplaceTab: 'catalog',
            marketplaceFilters: { ...filters, selectedCategory: re ? re.id : 'all' },
          });
          stateEngine.setPortal('marketplace');
          stateEngine.loadProducts({ category: re ? re.id : undefined }).catch(() => {});
        },
        goSignup: goAccountOrSignup,
        goServices: () => {
          const found = goCategoryByName(/service/i);
          if (!found) {
            pushHome();
            stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
            const filters = stateEngine.getState().ui.marketplaceFilters || {};
            stateEngine.setUI({
              marketplaceTab: 'catalog',
              marketplaceFilters: { ...filters, selectedCategory: 'all', searchQuery: 'Services' },
            });
            stateEngine.setPortal('marketplace');
            stateEngine.loadProducts({ search: 'Services' }).catch(() => {});
          }
        },
        goJobs: () => {
          const found = goCategoryByName(/job|employ|career|vacanc/i);
          if (!found) {
            pushHome();
            stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
            const filters = stateEngine.getState().ui.marketplaceFilters || {};
            stateEngine.setUI({
              marketplaceTab: 'catalog',
              marketplaceFilters: { ...filters, selectedCategory: 'all', searchQuery: 'Jobs' },
            });
            stateEngine.setPortal('marketplace');
            stateEngine.loadProducts({ search: 'Jobs' }).catch(() => {});
          }
        },
        openMore: (anchor) => {
          // Everything that is not already its own item in the nav row.
          const s = stateEngine.getState();
          const alreadyInNav = /vehicle|car|real[\s_-]?estate|propert|job|employ|career|vacanc/i;
          const rest = (s.categories || []).filter((c) => !alreadyInNav.test(c.name));
          openCategoryDropdown(anchor, {
            categories: rest,
            selectedId: s.ui.marketplaceFilters?.selectedCategory || 'all',
            onSelect: (id) => {
              pushHome();
              stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
              const filters = stateEngine.getState().ui.marketplaceFilters || {};
              stateEngine.setUI({
                marketplaceTab: 'catalog',
                marketplaceFilters: { ...filters, selectedCategory: id },
              });
              stateEngine.setPortal('marketplace');
              stateEngine.loadProducts({ category: id === 'all' ? undefined : id }).catch(() => {});
            },
          });
        },
        goDashboard: () => stateEngine.routeToDashboard(),
        logout: () => {
          stateEngine.logout();
          stateEngine.setPortal('marketplace');
        },
        setLanguage: (lang) => stateEngine.setLanguage(lang),
        // So the menu can mark the language already in use.
        currentLangCode: currentLang,
        toggleNotifications: () => {
          notifDropdownOpen = !notifDropdownOpen;
          renderApp();
        },
        markAllRead: () => stateEngine.markAllNotificationsRead().catch(() => {}),
        markRead: (id) => stateEngine.markNotificationRead(id).catch(() => {}),
        openCategories: (anchor) => {
          const s = stateEngine.getState();
          openCategoryDropdown(anchor, {
            categories: s.categories || [],
            selectedId: s.ui.marketplaceFilters?.selectedCategory || 'all',
            onSelect: (id) => {
              pushHome();
              stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
              const filters = stateEngine.getState().ui.marketplaceFilters || {};
              stateEngine.setUI({
                marketplaceTab: 'catalog',
                marketplaceFilters: { ...filters, selectedCategory: id },
              });
              // The chip is in the header, so it is reachable from the admin
              // and real-estate portals too - land back on the marketplace.
              stateEngine.setPortal('marketplace');
              stateEngine.loadProducts({
                category: id === 'all' ? undefined : id,
                search: filters.searchQuery || undefined,
                district: filters.selectedDistrict,
              }).catch(() => {});
            },
          });
        },
      });

      }
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
      if (activePortal === 'realestate') {
        renderRealEstateView(appElement);
      } else if (activePortal === 'admin') {
        renderAdminDashboardView(appElement);
      } else if (activePortal === 'login' || activePortal === 'signup') {
        renderLoginView(appElement, activePortal);
      } else if (state.route.kind === ROUTE_PRODUCT && state.routeListing) {
        renderProductDetailPage(appElement, state.routeListing, {
          onBack: () => {
            if (window.history.length > 1) { window.history.back(); return; }
            pushHome();
            stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
          },
          onViewAllInCategory: (categoryId) => {
            const filters = stateEngine.getState().ui.marketplaceFilters || {};
            stateEngine.setUI({
              marketplaceTab: 'catalog',
              marketplaceFilters: { ...filters, selectedCategory: categoryId || 'all' },
            });
            stateEngine.loadProducts({ category: categoryId }).catch(() => {});
            pushHome();
            stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
          },
        });
      } else if (state.route.kind === ROUTE_PRODUCT && state.routeListingMissing) {
        appElement.innerHTML = `
          <div class="compact-container py-24 text-center">
            <i class="fa-solid fa-circle-exclamation text-4xl text-gray-300 mb-3"></i>
            <h1 class="text-xl font-bold text-gray-900 mb-1">Listing not available</h1>
            <p class="text-sm text-gray-500">It may have been sold or removed.</p>
          </div>
        `;
      } else if (activePortal === 'marketplace') {
        renderMarketplaceView(appElement);
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
      tabMount.innerHTML = renderMobileTabBarHtml({ activePortal, currentUser, currentLang });
      bindMobileTabBarEvents(tabMount, {
        goHome: handleGoHome,
        goSignup: goAccountOrSignup,
        goStores: () => {
          pushHome();
          stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
          stateEngine.setUI({ marketplaceTab: 'stores' });
          stateEngine.setPortal('marketplace');
        },
        goAccount: goAccountOrSignup,
      });
    }

    syncListingModal(state);
  }

  stateEngine.subscribe(renderApp);
  renderApp();

  // Paint first, then check the stored session against the server.
  //
  // Everything the UI decides about a signed-in person comes from the `user`
  // object in localStorage, which is only who they were when they signed in.
  // Tokens last 7 days, so a deleted, suspended or demoted account kept its
  // old shell for a week, and a Sub-Administrator whose permissions changed
  // this morning kept seeing modules that now refuse every request.
  //
  // Deliberately after the first render: the check is a network round trip,
  // and blocking the whole app on it would trade a stale role for a blank
  // screen on every cold load. A 401 signs the person out through the API
  // client's expiry path; anything else leaves the session alone.
  stateEngine.verifySession();
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
