/**
 * KIGALI MARKET PLATFORM - Enterprise Navigation Header & Layout
 * Supporting Bilingual Kinyarwanda & English Language Switching.
 */
import './styles/main.css';
import { stateEngine } from './store/stateEngine.js';
import { getTranslation } from './store/i18n.js';
import { renderMarketplaceView, cleanupFlashClock, cleanupHeroSlider } from './modules/marketplace/MarketplaceView.js';
import {
  renderHelpCenterPage, renderFaqPage,
  renderAboutPage, renderTermsPage, renderPrivacyPage,
  renderContactPage, resetContactDraft,
} from './modules/marketplace/SupportPages.js';
import { renderRealEstateView, openPropertyModal } from './modules/realestate/RealEstateView.js';
import { renderAdminDashboardView } from './modules/admin/AdminDashboardView.js';
import { renderLoginView } from './components/LoginView.js';
import {
  renderHeaderHtml, bindHeaderEvents,
  renderMobileTabBarHtml, bindMobileTabBarEvents,
  notReadyToast,
} from './components/Header.js';
// Listings render as a full page now (product-detail.html), not an overlay.
import { renderProductDetailPage, cleanupProductDetailPage } from './modules/marketplace/ProductDetailPage.js';
import { getMarketplaceFooterHtml, bindMarketplaceFooterEvents } from './components/Footer.js';
import { openCategoryDropdown } from './components/dropdownMenu.js';
import {
  parseLocation, onRouteChange, pushHome, pushPath, pathForRoute,
  ROUTE_AUTH, ROUTE_HOME, ROUTE_POST_AD, ROUTE_PRODUCT, ROUTE_PRODUCTS, ROUTE_STORES, ROUTE_HELP_CENTER, ROUTE_FAQS,
  ROUTE_ABOUT, ROUTE_TERMS, ROUTE_PRIVACY, ROUTE_CONTACT,
} from './store/router.js';

// Route kind -> the SupportPages renderer that draws it. All render inside the
// public marketplace shell with the site footer beneath (see the switch in
// renderApp). Adding an info page is: a route here, a footer link, done.
const SUPPORT_PAGE_RENDERERS = {
  [ROUTE_HELP_CENTER]: renderHelpCenterPage,
  [ROUTE_FAQS]: renderFaqPage,
  [ROUTE_ABOUT]: renderAboutPage,
  [ROUTE_TERMS]: renderTermsPage,
  [ROUTE_PRIVACY]: renderPrivacyPage,
  [ROUTE_CONTACT]: renderContactPage,
};

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

  // Keep the visitor on the same portal across a reload. setPortal() never
  // touches the URL, so the Gasabo (real estate) landing page used to fall back
  // to the marketplace on refresh. Restore the last portal only when the URL
  // itself doesn't already point somewhere specific (a product/property link or
  // the admin hash win).
  try {
    if (
      window.location.hash !== ADMIN_URL_HASH &&
      initialRoute.kind === ROUTE_HOME &&
      sessionStorage.getItem('km_portal') === 'realestate'
    ) {
      stateEngine.setPortal('realestate');
    }
  } catch { /* sessionStorage can throw in private mode; portal just won't persist */ }


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
    pushPath(pathForRoute(ROUTE_PRODUCTS));
    stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
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
    const role = stateEngine.getState().currentUser.role;
    if (role === 'guest') {
      pushPath(pathForRoute(ROUTE_AUTH));
      stateEngine.setRoute({ kind: ROUTE_AUTH, id: null });
      stateEngine.setPortal('signup');
      return;
    }
    pushPath(pathForRoute(ROUTE_POST_AD));
    stateEngine.setRoute({ kind: ROUTE_POST_AD, id: null });
    if (role === 'seller') {
      stateEngine.setUI({ marketplaceTab: 'seller_portal' });
      stateEngine.setPortal('marketplace');
    } else if (role === 'admin' || role === 'sub_admin') {
      stateEngine.setPortal('admin');
    } else {
      stateEngine.setPortal('marketplace');
    }
  }

  // All the SupportPages routes (Help Center, FAQs, About, Terms, Privacy)
  // navigate the same way: push the flat path, set the route, scroll to top.
  function goSupportPage(kind) {
    pushPath(pathForRoute(kind));
    stateEngine.setRoute({ kind, id: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const goHelpCenter = () => goSupportPage(ROUTE_HELP_CENTER);
  const goFaqs = () => goSupportPage(ROUTE_FAQS);
  const goAbout = () => goSupportPage(ROUTE_ABOUT);
  const goTerms = () => goSupportPage(ROUTE_TERMS);
  const goPrivacy = () => goSupportPage(ROUTE_PRIVACY);
  const goContact = () => { resetContactDraft(); goSupportPage(ROUTE_CONTACT); };

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
    // Remember the portal so a reload can return here (see the boot restore).
    try { sessionStorage.setItem('km_portal', activePortal); } catch { /* ignore */ }
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
    cleanupProductDetailPage();

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
        categories: state.categories || [],
        selectedCategory: state.ui.marketplaceFilters?.selectedCategory || 'all',
      });

      bindHeaderEvents(headerMount, {
        goHome: handleGoHome,
        selectCategory: (id) => {
          pushPath(pathForRoute(ROUTE_PRODUCTS));
          stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({
            marketplaceTab: 'catalog',
            marketplaceFilters: { ...filters, selectedCategory: id },
          });
          stateEngine.setPortal('marketplace');
          stateEngine.loadProducts({ category: id === 'all' ? undefined : id }).catch(() => {});
        },
        goRealEstate: () => {
          pushHome();
          stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
          stateEngine.setPortal('realestate');
        },
        goStores: () => {
          pushPath(pathForRoute(ROUTE_STORES));
          stateEngine.setRoute({ kind: ROUTE_STORES, id: null });
          stateEngine.setUI({ marketplaceTab: 'stores' });
          stateEngine.setPortal('marketplace');
        },
        goVehicles: () => {
          pushPath(pathForRoute(ROUTE_PRODUCTS));
          stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
          const cats = stateEngine.getState().categories || [];
          const vehicles = cats.find(c => /vehicle|car|auto|motorcycle|moto|bike/i.test(c.name));
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({ marketplaceTab: 'catalog', marketplaceFilters: { ...filters, selectedCategory: vehicles ? vehicles.id : 'all' } });
          stateEngine.setPortal('marketplace');
          stateEngine.loadProducts({ category: vehicles ? vehicles.id : undefined }).catch(() => {});
        },
        goRealEstateCategory: () => {
          pushPath(pathForRoute(ROUTE_PRODUCTS));
          stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
          const cats = stateEngine.getState().categories || [];
          const re = cats.find((c) => /real[\s_-]?estate|propert|house|land|plot/i.test(c.name));
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
            pushPath(pathForRoute(ROUTE_PRODUCTS));
            stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
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
            pushPath(pathForRoute(ROUTE_PRODUCTS));
            stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
            const filters = stateEngine.getState().ui.marketplaceFilters || {};
            stateEngine.setUI({
              marketplaceTab: 'catalog',
              marketplaceFilters: { ...filters, selectedCategory: 'all', searchQuery: 'Jobs' },
            });
            stateEngine.setPortal('marketplace');
            stateEngine.loadProducts({ search: 'Jobs' }).catch(() => {});
          }
        },
        openMore: async (anchor) => {
          let s = stateEngine.getState();
          if (!s.categories || s.categories.length === 0) {
            await stateEngine.loadCategories().catch(() => {});
            s = stateEngine.getState();
          }
          const tNav = (key) => getTranslation(currentLang, key);
          const hiddenNavActions = new Set(
            [...document.querySelectorAll('#header-mount .nav-fixed-item[hidden]')]
              .map((el) => el.dataset.navAction)
              .filter(Boolean),
          );
          const prefixItems = [
            { action: 'home', id: '__home', label: tNav('ui_home'), iconHtml: '<i class="fa-solid fa-house" style="color:#04562D"></i>' },
            { action: 'stores', id: '__stores', label: tNav('ui_stores'), iconHtml: '<i class="fa-solid fa-shop" style="color:#04562D"></i>' },
            { action: 'vehicles', id: '__vehicles', label: tNav('ui_vehicles'), iconHtml: '<i class="fa-solid fa-car" style="color:#04562D"></i>' },
            { action: 'realestate', id: '__realestate', label: tNav('ui_real_estate'), iconHtml: '<i class="fa-solid fa-house-chimney-window" style="color:#04562D"></i>' },
            { action: 'services', id: '__services', label: tNav('ui_services'), iconHtml: '<i class="fa-solid fa-screwdriver-wrench" style="color:#04562D"></i>' },
            { action: 'jobs', id: '__jobs', label: tNav('ui_jobs'), iconHtml: '<i class="fa-solid fa-briefcase" style="color:#04562D"></i>' },
          ].filter((item) => hiddenNavActions.has(item.action));

          const alreadyInNav = /vehicle|car|auto|motorcycle|moto|bike|real[\s_-]?estate|propert|house|land|plot|service|job|employ|career|vacanc/i;
          const rest = (s.categories || []).filter((c) => !alreadyInNav.test(c.name));
          const listToShow = rest.length > 0 ? rest : (s.categories || []);
          openCategoryDropdown(anchor, {
            categories: listToShow,
            selectedId: s.ui.marketplaceFilters?.selectedCategory || 'all',
            prefixItems,
            onSelect: (id) => {
              if (id === '__home') { handleGoHome(); return; }
              if (id === '__stores') {
                pushPath(pathForRoute(ROUTE_STORES));
                stateEngine.setRoute({ kind: ROUTE_STORES, id: null });
                stateEngine.setUI({ marketplaceTab: 'stores' });
                stateEngine.setPortal('marketplace');
                return;
              }
              if (id === '__vehicles') {
                const cats = stateEngine.getState().categories || [];
                const vehicles = cats.find(c => /vehicle|car|auto|motorcycle|moto|bike/i.test(c.name));
                pushPath(pathForRoute(ROUTE_PRODUCTS));
                stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
                const filters = stateEngine.getState().ui.marketplaceFilters || {};
                stateEngine.setUI({ marketplaceTab: 'catalog', marketplaceFilters: { ...filters, selectedCategory: vehicles ? vehicles.id : 'all' } });
                stateEngine.setPortal('marketplace');
                stateEngine.loadProducts({ category: vehicles ? vehicles.id : undefined }).catch(() => {});
                return;
              }
              if (id === '__realestate') {
                pushPath(pathForRoute(ROUTE_PRODUCTS));
                stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
                const cats = stateEngine.getState().categories || [];
                const re = cats.find((c) => /real[\s_-]?estate|propert|house|land|plot/i.test(c.name));
                const filters = stateEngine.getState().ui.marketplaceFilters || {};
                stateEngine.setUI({
                  marketplaceTab: 'catalog',
                  marketplaceFilters: { ...filters, selectedCategory: re ? re.id : 'all' },
                });
                stateEngine.setPortal('marketplace');
                stateEngine.loadProducts({ category: re ? re.id : undefined }).catch(() => {});
                return;
              }
              if (id === '__services') {
                const found = goCategoryByName(/service/i);
                if (!found) {
                  pushPath(pathForRoute(ROUTE_PRODUCTS));
                  stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
                  const filters = stateEngine.getState().ui.marketplaceFilters || {};
                  stateEngine.setUI({
                    marketplaceTab: 'catalog',
                    marketplaceFilters: { ...filters, selectedCategory: 'all', searchQuery: 'Services' },
                  });
                  stateEngine.setPortal('marketplace');
                  stateEngine.loadProducts({ search: 'Services' }).catch(() => {});
                }
                return;
              }
              if (id === '__jobs') {
                const found = goCategoryByName(/job|employ|career|vacanc/i);
                if (!found) {
                  pushPath(pathForRoute(ROUTE_PRODUCTS));
                  stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
                  const filters = stateEngine.getState().ui.marketplaceFilters || {};
                  stateEngine.setUI({
                    marketplaceTab: 'catalog',
                    marketplaceFilters: { ...filters, selectedCategory: 'all', searchQuery: 'Jobs' },
                  });
                  stateEngine.setPortal('marketplace');
                  stateEngine.loadProducts({ search: 'Jobs' }).catch(() => {});
                }
                return;
              }

              pushPath(pathForRoute(ROUTE_PRODUCTS));
              stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
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
              pushPath(pathForRoute(ROUTE_PRODUCTS));
              stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
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
      const footerHandlers = {
        goHome: handleGoHome,
        postAd: goAccountOrSignup,
        goSeller: () => stateEngine.routeToDashboard(),
        goHelp: goHelpCenter,
        goFaqs,
        goAbout,
        goTerms,
        goPrivacy,
        goContact,
        goVehicles: () => {
          pushPath(pathForRoute(ROUTE_PRODUCTS));
          stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
          const filters = stateEngine.getState().ui.marketplaceFilters || {};
          stateEngine.setUI({
            marketplaceTab: 'catalog',
            marketplaceFilters: { ...filters, searchQuery: 'vehicles', selectedCategory: 'all' },
          });
          stateEngine.loadProducts({ search: 'vehicles' }).catch(() => {});
          stateEngine.setPortal('marketplace');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      };
      const appendMarketplaceFooter = () => {
        appElement.insertAdjacentHTML('beforeend', getMarketplaceFooterHtml());
        bindMarketplaceFooterEvents(appElement, footerHandlers);
      };

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
            pushPath(pathForRoute(ROUTE_PRODUCTS));
            stateEngine.setRoute({ kind: ROUTE_PRODUCTS, id: null });
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
      } else if (SUPPORT_PAGE_RENDERERS[state.route.kind]) {
        cleanupFlashClock();
        cleanupHeroSlider();
        cleanupProductDetailPage();
        SUPPORT_PAGE_RENDERERS[state.route.kind](appElement, { goHome: handleGoHome });
        appendMarketplaceFooter();
      } else if (activePortal === 'marketplace') {
        renderMarketplaceView(appElement);
        // Site footer at the bottom of the public marketplace pages (home,
        // catalog, stores). Rendered here, not inside the view, so it survives
        // the view's per-tab early returns. NOT on the seller dashboard - that
        // is a working area, not a storefront page, so it gets no footer.
        if (state.ui.marketplaceTab !== 'seller_portal') {
          appendMarketplaceFooter();
        }
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
          pushPath(pathForRoute(ROUTE_STORES));
          stateEngine.setRoute({ kind: ROUTE_STORES, id: null });
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

  // Keep the shop fresh without a manual browser refresh.
  //
  // The catalogue, flash deals and hero ads are fetched once on cold load and
  // then cached, so someone who leaves the tab open - or comes back after an
  // admin adds a product, sets a deal or changes a banner - keeps seeing the
  // old page until they hit reload. When the tab becomes visible again we
  // quietly re-fetch the homepage data. It is throttled so flicking between
  // tabs does not hammer the API, only runs on the marketplace where this data
  // lives, and leaves the on-screen products in place while the new ones load
  // (the grid only shows skeletons when it has nothing at all), so the refresh
  // is invisible until fresher content actually arrives.
  let lastAutoRefresh = Date.now();
  const AUTO_REFRESH_MIN_GAP = 30000;
  function refreshMarketplaceData() {
    const state = stateEngine.getState();
    if (state.activePortal !== 'marketplace') return;
    const f = state.ui.marketplaceFilters || {};
    // One batched refresh that updates everything in a single re-render, instead
    // of three separate loaders that re-rendered the whole page ~7 times (the
    // "shaking" on tab return). force:true re-fetches even though the data was
    // loaded already; the current page stays on screen until the new data lands.
    stateEngine
      .loadMarketplaceHomeData(
        { category: f.selectedCategory, district: f.selectedDistrict, search: f.searchQuery },
        { force: true },
      )
      .catch(() => {});
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - lastAutoRefresh < AUTO_REFRESH_MIN_GAP) return;
    lastAutoRefresh = now;
    refreshMarketplaceData();
  });
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
