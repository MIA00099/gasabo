/**
 * KIGALI MARKET PLATFORM - Reactive State Engine
 * Session and UI state are kept locally; all substantive data (products,
 * categories, sellers, real estate content, approvals, audit logs) is
 * fetched from and written to the real backend API - nothing here is the
 * source of truth anymore, it's a reactive cache the views read from.
 */
import { api, getSession, setSession, setSessionExpiredHandler } from '../api/client.js';
import {
  parseLocation,
  ROUTE_AUTH,
  ROUTE_HOME,
  ROUTE_POST_AD,
  ROUTE_PRODUCT,
  ROUTE_PRODUCTS,
  ROUTE_STORES,
} from './router.js';

// Cheap content-equality check for a background refresh's result against
// what is already on screen. Used only to decide whether a forced marketplace
// refresh is worth rendering at all - see loadMarketplaceHomeData. False
// positives (reporting "different" over something harmless like key order)
// just cost one needless render; a false negative is what this exists to
// rule out, and JSON.stringify never produces one for the plain JSON arrays
// the API returns here.
function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const LANG_KEY = 'KIGALIMARKET_LANG';

const ROLE_MAP = {
  ADMINISTRATOR: 'admin',
  SUB_ADMINISTRATOR: 'sub_admin',
  SELLER: 'seller',
  USER: 'user',
};

const DISTRICTS = [
  'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo',
  'Gicumbi', 'Gisagara', 'Huye', 'Kamonyi', 'Karongi',
  'Kayonza', 'Kicukiro', 'Kirehe', 'Muhanga', 'Musanze',
  'Ngoma', 'Ngororero', 'Nyabihu', 'Nyagatare', 'Nyamagabe',
  'Nyamasheke', 'Nyanza', 'Nyarugenge', 'Nyaruguru', 'Rubavu',
  'Ruhango', 'Rulindo', 'Rusizi', 'Rutsiro', 'Rwamagana',
];

function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: ROLE_MAP[user.role] || 'guest',
    phone: user.phone || '',
    district: user.district || '',
    permissions: user.permissions || {},
  };
}

function guestUser() {
  return { id: null, name: 'Guest', email: '', role: 'guest', phone: '', district: '', permissions: {} };
}

/**
 * The state a signed-out browser starts with.
 *
 * Extracted so logout() can return to it. It used to reset only currentUser
 * and activePortal, which left the previous person's sellers directory,
 * approval queue, audit logs, pending products and notifications sitting in
 * memory - and rendering - for whoever signed in next on the same browser
 * without a page reload. A Sub-Administrator with no audit permission would
 * inherit an Administrator's audit logs that way.
 *
 * `currentLang` and `route` are passed through rather than reset: the chosen
 * language is a browser preference, not session data, and logging out should
 * leave you on the page you were reading, not throw you to the homepage.
 */
function initialData({ currentUser, currentLang, route }) {
  return {
    activePortal: 'marketplace',
    currentLang,
    currentUser,
    districts: DISTRICTS,
    products: [],
    flashDeals: [],
    myProducts: [],
    pendingProducts: [],
    categories: [],
    sellers: [],
    // Storefront seller directory (GET /sellers/public). Kept apart from
    // `sellers` above, which holds the admin-only records.
    publicSellers: [],
    banners: [],
    realEstate: { hero: null, about: null, services: [], contact: null, properties: [] },
    approvalRequests: [],
    auditLogs: [],
    systemUsers: [],
    notifications: [],
    // Current URL route (see store/router.js). Seeded from the address bar
    // so a cold load of /product/<id> already knows what to open before
    // anything renders.
    route,
    // The listing behind a /product/:id or /property/:id URL, fetched on
    // demand. Deep links cannot rely on state.products: on a cold load it
    // is empty, and even once loaded the listing may be filtered out of the
    // current result set.
    routeListing: null,
    // Siblings of routeListing, for the "More <category> Products" row.
    // Keyed by listing id so a stale response from the previously viewed
    // listing cannot paint under the current one.
    // Per-listing like state, keyed by product id: { liked, likeCount }.
    likes: {},
    relatedProducts: [],
    relatedProductsFor: null,
    routeListingMissing: false,
    loading: {},
    error: null,
    // Every stateEngine mutation (even just a loading-flag flip) notifies subscribers,
    // and main.js's subscriber fully remounts whichever view is on screen. Views that
    // trigger an async stateEngine call from within their own tab/wizard/filter state
    // would otherwise lose that local state to the remount mid-interaction - so any UI
    // state that needs to survive across such a call lives here instead of in a local
    // closure variable.
    ui: {},
  };
}

class StateEngine {
  constructor() {
    this.listeners = [];
    const session = getSession();
    this.data = initialData({
      currentUser: session?.user ? normalizeUser(session.user) : guestUser(),
      currentLang: localStorage.getItem(LANG_KEY) || 'en',
      route: parseLocation(),
    });

    // A 401 from anywhere ends the session in the UI, not just in storage.
    setSessionExpiredHandler((message) => this.sessionExpired(message));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  setUI(patch) {
    this.data.ui = { ...this.data.ui, ...patch };
    this.notify();
  }

  notify() {
    // Coalesce renders to one per microtask instead of one per state mutation.
    //
    // main.js's subscriber rebuilds the whole header and view on every call,
    // and a homepage boot fires notify ~19 times in the first few hundred ms:
    // each loader flips its loading flag (one notify) and flips it back with
    // its data (another), and setPortal/setRoute/setUI pile on top. Rendering
    // every one of those separately is what makes the page flash and the nav
    // flicker while it settles. Collapsing the notifies that land in the same
    // task into a single render removes the flash without dropping any state -
    // the flush always reads the latest this.data.
    //
    // A microtask (not requestAnimationFrame) so the flush fires even when the
    // tab is backgrounded or not painting, where rAF callbacks are throttled.
    if (this._notifyScheduled) return;
    this._notifyScheduled = true;
    const flush = () => {
      this._notifyScheduled = false;
      this.listeners.forEach((l) => l(this.data));
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(flush);
    else Promise.resolve().then(flush);
  }

  getState() {
    return this.data;
  }

  // Wraps an async API call with a per-key loading flag and shared error surface,
  // so any view can show a spinner while `state.loading[key]` is true and read
  // `state.error` for the last failure message.
  async _run(key, fn) {
    this.data.loading = { ...this.data.loading, [key]: true };
    this.data.error = null;
    this.notify();
    try {
      return await fn();
    } catch (e) {
      this.data.error = e.message || 'Something went wrong. Please try again.';
      this.notify();
      throw e;
    } finally {
      this.data.loading = { ...this.data.loading, [key]: false };
      this.notify();
    }
  }

  clearError() {
    this.data.error = null;
    this.notify();
  }

  // --- Navigation / UI-only state ---

  setPortal(portalName) {
    this.data.activePortal = portalName;
    if (portalName !== 'marketplace' && this.data.route?.kind === ROUTE_PRODUCT) {
      this.data.route = { kind: ROUTE_HOME, id: null };
    }
    this.notify();
  }

  setLanguage(lang) {
    this.data.currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    this.notify();
  }

  // --- URL routing ---

  /**
   * Adopt a route (from a click, Back/Forward, or the initial page load) and
   * switch to the portal that owns it, so /property/:id lands on real estate
   * rather than leaving the visitor on the marketplace.
   */
  setRoute(route) {
    this.data.route = route;
    this.data.routeListing = null;
    this.data.routeListingMissing = false;
    const patchUI = (patch) => {
      this.data.ui = { ...this.data.ui, ...patch };
    };

    // Only the two listing routes carry an id to resolve. Everything else is
    // a page: an earlier version treated "anything that is not a product" as
    // real estate, which sent /products and /stores to the wrong portal.
    const isProperty = route.kind === 'property';

    if (isProperty) {
      this.data.activePortal = 'realestate';
    } else if (route.kind === ROUTE_PRODUCT) {
      this.data.activePortal = 'marketplace';
      patchUI({ marketplaceTab: 'products' });
    } else if (route.kind === ROUTE_PRODUCTS) {
      this.data.activePortal = 'marketplace';
      patchUI({ marketplaceTab: 'catalog' });
    } else if (route.kind === ROUTE_STORES) {
      this.data.activePortal = 'marketplace';
      patchUI({ marketplaceTab: 'stores' });
    } else if (route.kind === ROUTE_POST_AD) {
      if (this.data.currentUser.role === 'guest') {
        this.data.activePortal = 'signup';
      } else if (this.data.currentUser.role === 'seller') {
        this.data.activePortal = 'marketplace';
        patchUI({ marketplaceTab: 'seller_portal' });
      } else if (this.isAdmin()) {
        this.data.activePortal = 'admin';
      } else {
        this.data.activePortal = 'marketplace';
      }
    } else if (route.kind === ROUTE_AUTH) {
      this.data.activePortal = 'login';
    }

    this.notify();

    if (route.kind === ROUTE_PRODUCT || isProperty) {
      this.loadRouteListing(route).catch(() => {});
    }
  }

  /**
   * Resolve the listing a listing URL points at.
   *
   * Products come from the API. Real-estate properties live inside the
   * realEstate CMS payload rather than having their own endpoint, so they are
   * resolved from that once it is loaded.
   */
  // --- Ratings and likes -------------------------------------------------

  // Admin-assigned, 0-5 in half steps, or null to clear it.
  async setProductRating(productId, rating) {
    return this._run('products', async () => {
      const { product } = await api.patch(`/products/${productId}/rating`, { rating });
      const swap = (list) => list.map((p) => (p.id === product.id ? product : p));
      this.data.products = swap(this.data.products);
      this.data.myProducts = swap(this.data.myProducts);
      if (this.data.routeListing?.id === product.id) this.data.routeListing = product;
      this.notify();
      return product;
    });
  }

  // Whether this visitor already liked a listing, and how many likes it has.
  async loadLikeState(productId) {
    const { liked, likeCount } = await api.get(`/products/${productId}/like`);
    this.data.likes = { ...this.data.likes, [productId]: { liked, likeCount } };
    this.notify();
    return { liked, likeCount };
  }

  // Deliberately not wrapped in _run: a heart that greys the whole page out
  // while it saves feels broken. The button paints its new state immediately
  // and this reconciles it against what the server actually recorded.
  async toggleLike(productId) {
    const current = this.data.likes?.[productId] || { liked: false, likeCount: 0 };
    const optimistic = {
      liked: !current.liked,
      likeCount: Math.max(0, current.likeCount + (current.liked ? -1 : 1)),
    };
    this.data.likes = { ...this.data.likes, [productId]: optimistic };
    this.notify();

    try {
      const res = current.liked
        ? await api.delete(`/products/${productId}/like`)
        : await api.post(`/products/${productId}/like`, {});
      this.data.likes = {
        ...this.data.likes,
        [productId]: { liked: res.liked, likeCount: res.likeCount },
      };
      this.notify();
      return res;
    } catch (e) {
      // Put the old state back rather than leaving a heart that lies.
      this.data.likes = { ...this.data.likes, [productId]: current };
      this.data.error = 'Could not save that. Please try again.';
      this.notify();
      throw e;
    }
  }

  // Siblings come from the server rather than being filtered out of
  // this.data.products, which only ever holds the last grid fetch. On a
  // shared link or a search result nothing has fetched a grid, so the
  // in-memory filter had nothing to match and the row vanished.
  async loadRelatedProducts(productId) {
    if (!productId) return this.data.relatedProducts;
    if (this.data.relatedProductsFor === productId) return this.data.relatedProducts;

    // In-flight guard, and it is load-bearing rather than an optimisation.
    // _run() flips its loading flag and calls notify() BEFORE it awaits, and
    // this loader is called from render(). Without this the notify re-enters
    // render synchronously, which calls this again, which notifies again -
    // recursion until the stack blows, with a fetch fired at every level.
    // The visible symptom is a related row stuck on its skeletons forever,
    // because relatedProductsFor is never reached.
    if (this._relatedInFlight === productId) return this.data.relatedProducts;
    this._relatedInFlight = productId;

    try {
      return await this._run('relatedProducts', async () => {
        const { products } = await api.get(`/products/${encodeURIComponent(productId)}/related`);
        // The reader may have moved on while this was in flight.
        if (this.data.route.id !== productId) return this.data.relatedProducts;
        this.data.relatedProducts = products;
        this.data.relatedProductsFor = productId;
        this.notify();
        return products;
      });
    } finally {
      this._relatedInFlight = null;
    }
  }

  async loadRouteListing(route = this.data.route) {
    if (!route || route.kind === ROUTE_HOME || !route.id) return null;

    if (route.kind === ROUTE_PRODUCT) {
      // Navigating from the grid - the listing is already in hand, so open
      // immediately instead of round-tripping for data we have.
      const alreadyLoaded = this.data.products.find((p) => p.id === route.id);
      if (alreadyLoaded) {
        this.data.routeListing = alreadyLoaded;
        this.data.routeListingMissing = false;
        this.notify();
        return alreadyLoaded;
      }

      return this._run('routeListing', async () => {
        try {
          const { product } = await api.get(`/products/${encodeURIComponent(route.id)}`);
          // A slower earlier request must not overwrite a newer route.
          if (this.data.route.id !== route.id) return null;
          this.data.routeListing = product;
          this.data.routeListingMissing = false;
          this.notify();
          return product;
        } catch (e) {
          if (this.data.route.id !== route.id) return null;
          this.data.routeListing = null;
          // Removed, expired, or never existed - the view shows a "listing
          // unavailable" state rather than an empty modal.
          this.data.routeListingMissing = true;
          this.notify();
          return null;
        }
      });
    }

    const properties = this.data.realEstate?.properties || [];
    const found = properties.find((p) => p.id === route.id) || null;

    // Real estate content may not have loaded yet on a cold deep link. Pull
    // it, then look again.
    if (!found && !properties.length) {
      await this.loadRealEstate().catch(() => {});
      if (this.data.route.id !== route.id) return null;
      const retry = (this.data.realEstate?.properties || []).find((p) => p.id === route.id) || null;
      this.data.routeListing = retry;
      this.data.routeListingMissing = !retry;
      this.notify();
      return retry;
    }

    this.data.routeListing = found;
    this.data.routeListingMissing = !found;
    this.notify();
    return found;
  }

  // --- Auth ---

  isAdmin() {
    return this.data.currentUser.role === 'admin' || this.data.currentUser.role === 'sub_admin';
  }

  // Sends a just-authenticated user to their actual home screen instead of
  // always dropping everyone on the generic marketplace browse page - e.g.
  // logging in as a seller through the general /login form (not just via
  // "Start Selling") should land on the seller dashboard, and an admin
  // should land on the admin panel, not appear "logged in" with no visible
  // way back to what they logged in to do.
  routeToDashboard() {
    this.data.route = { kind: ROUTE_HOME, id: null };
    const role = this.data.currentUser.role;
    if (role === 'seller') {
      this.setUI({ marketplaceTab: 'seller_portal' });
      this.setPortal('marketplace');
    } else if (role === 'admin' || role === 'sub_admin') {
      this.setPortal('admin');
    } else {
      this.setPortal('marketplace');
    }
  }

  async login(email, password) {
    return this._run('auth', async () => {
      const { token, user } = await api.post('/auth/login', { email, password });
      setSession({ token, user });
      this.data.currentUser = normalizeUser(user);
      this.notify();
      return this.data.currentUser;
    });
  }

  async registerSeller(form) {
    return this._run('auth', async () => {
      const { token, user } = await api.post('/auth/register/seller', {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        district: form.district,
        password: form.password,
      });
      setSession({ token, user });
      this.data.currentUser = normalizeUser(user);
      this.notify();
      return this.data.currentUser;
    });
  }

  logout() {
    setSession(null);
    this._resetToSignedOut();
    this.notify();
  }

  /**
   * Back to a signed-out browser, keeping the language and the current page.
   *
   * Everything else goes. Resetting only currentUser left the previous
   * person's sellers directory, approval queue, audit logs, pending products
   * and notifications in memory for whoever signed in next on the same
   * browser without a reload.
   */
  _resetToSignedOut() {
    this.data = initialData({
      currentUser: guestUser(),
      currentLang: this.data.currentLang,
      route: this.data.route,
    });
  }

  /**
   * The server has stopped accepting our credentials mid-session - an expired
   * token, a deleted account, a suspension, a revoked role.
   *
   * The API client clears storage on any 401; this is what makes the UI agree.
   * Without it the person stayed on the dashboard, name and role and all,
   * while every click failed, signed out and with no way of knowing it.
   *
   * The message is carried into state so the sign-in screen can explain what
   * happened rather than just appearing for no reason.
   */
  sessionExpired(message) {
    if (this.data.currentUser.role === 'guest') return; // already out; nothing to announce

    // Where they were decides where they end up. Someone in the admin portal
    // or the seller dashboard cannot stay there signed out, so they go to the
    // sign-in screen with an explanation. Someone browsing the marketplace
    // can simply carry on as a guest - throwing a shopper onto a login form
    // because a background call expired would be the more annoying bug.
    const wasInProtectedArea =
      this.data.activePortal === 'admin' ||
      this.data.ui?.marketplaceTab === 'seller_portal';

    const notice = message || 'Your session has expired. Please sign in again.';
    this._resetToSignedOut();
    this.data.error = notice;

    if (wasInProtectedArea) {
      this.data.activePortal = 'login';
      this.data.ui = { ...this.data.ui, authNotice: notice };
    }
    this.notify();
  }

  /**
   * Drop the "why are you seeing this sign-in screen" message.
   *
   * The notice lives in state and the login view reads it on every render,
   * rather than consuming it on mount. Two earlier attempts got this wrong:
   * clearing it through setUI re-rendered the view, which then read the value
   * it had just cleared; and reading-and-clearing on mount lost it to the
   * next notify(), since every notify rebuilds the view and re-runs its
   * initialisers. Either way the explanation was gone a frame before anyone
   * could read it.
   *
   * So it stays until the person does something with the form - types,
   * switches tab, submits - at which point they have seen it.
   *
   * Does not notify: it is called from inside handlers that re-render anyway,
   * and notifying here would recurse.
   */
  clearAuthNotice() {
    if (this.data.ui?.authNotice) {
      this.data.ui = { ...this.data.ui, authNotice: null };
    }
  }

  /**
   * Check a stored session against the server before trusting it.
   *
   * Everything the UI decides about a person - which dashboard they land on,
   * which admin modules appear - comes from the `user` object in
   * localStorage, which is only a snapshot of who they were when they signed
   * in. Tokens last 7 days, so without this a deleted, suspended or demoted
   * account keeps its old shell for a week, and a Sub-Administrator whose
   * permissions were changed this morning keeps seeing modules that now
   * refuse every request.
   *
   * GET /auth/me answers from the database, so the answer is current. A 401
   * there is handled by the client's own expiry path.
   */
  async verifySession() {
    const session = getSession();
    if (!session?.token) return null;
    try {
      const { user } = await api.get('/auth/me');
      setSession({ ...session, user });
      this.data.currentUser = normalizeUser(user);
      this.notify();
      return this.data.currentUser;
    } catch {
      // A 401 has already signed us out through setSessionExpiredHandler.
      // Anything else (offline, server restarting) is not a reason to throw
      // someone out of a session that may well still be good.
      return null;
    }
  }

  // --- Products (Marketplace) ---

  /**
   * Batches initial homepage fetches (products, categories, flashDeals, banners)
   * into parallel requests and updates state with a single notification to
   * prevent multiple rapid re-renders / re-paints on cold load.
   */
  async loadMarketplaceHomeData(filters = {}, { force = false } = {}) {
    if (this._marketplaceHomeDataLoading) return;
    // Cold load: fetch whatever has not been attempted. Forced refresh (the
    // tab-return auto-refresh): re-fetch products, flash deals and banners, but
    // not categories - they are stable and the slowest query, and re-pulling
    // them on every tab focus is wasted work.
    const needProducts = force || this.data.loading.products === undefined;
    const needCategories = !force && this.data.loading.categories === undefined;
    const needFlashDeals = force || this.data.loading.flashDeals === undefined;
    const needBanners = force || this.data.loading.banners === undefined;

    if (!needProducts && !needCategories && !needFlashDeals && !needBanners) return;

    this._marketplaceHomeDataLoading = true;

    // A forced refresh keeps the current page on screen and swaps the new data
    // in with the SINGLE notify at the end - no loading flags flipped, so it
    // neither flashes a skeleton nor triggers a second re-render. This is what
    // fixes the "shaking": the old refresh fired three separate loaders whose
    // loading/data/done notifies re-rendered the whole page ~7 times. A cold
    // load still shows the loading state first.
    if (!force) {
      const nextLoading = { ...this.data.loading };
      if (needProducts) nextLoading.products = true;
      if (needCategories) nextLoading.categories = true;
      if (needFlashDeals) nextLoading.flashDeals = true;
      if (needBanners) nextLoading.banners = true;
      this.data.loading = nextLoading;
      this.notify();
    }

    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.district && filters.district !== 'all') params.set('district', filters.district);
      if (filters.search) params.set('search', filters.search);
      const qs = params.toString();

      const promises = [
        needProducts ? api.get(`/products${qs ? `?${qs}` : ''}`) : Promise.resolve(null),
        needCategories ? api.get('/categories') : Promise.resolve(null),
        needFlashDeals ? api.get('/products/flash-deals') : Promise.resolve(null),
        needBanners ? api.get('/advertisements') : Promise.resolve(null),
      ];

      const [prodsRes, catsRes, flashRes, banRes] = await Promise.allSettled(promises);

      // Whether this refresh is actually worth rendering. A cold load always
      // is - the loading flags below have to flip off to clear the skeleton,
      // and there is no "before" to compare against. A forced (tab-return)
      // refresh only is if the server actually returned something different:
      // skipping notify() when it did not is what stops the "shaking" - main.js's
      // renderApp() rebuilds the ENTIRE header and view on every notify, which
      // tears down and reloads every product image, and unconditionally resets
      // the hero slider to slide one and restarts its clock (see
      // startHeroSlider). Without this, coming back to the tab after 30+
      // seconds visibly snapped the whole page - hero included - back to its
      // starting state even when not one row on the server had changed, which
      // for an ordinary browsing session is the common case, not the rare one.
      let changed = !force;

      if (needProducts && prodsRes.status === 'fulfilled' && prodsRes.value?.products) {
        const next = prodsRes.value.products;
        if (!force || !sameJson(this.data.products, next)) {
          this.data.products = next;
          if (force) changed = true;
        }
      }
      if (needCategories && catsRes.status === 'fulfilled' && catsRes.value?.categories) {
        this.data.categories = catsRes.value.categories;
      }
      if (needFlashDeals && flashRes.status === 'fulfilled' && flashRes.value?.products) {
        const next = flashRes.value.products;
        if (!force || !sameJson(this.data.flashDeals, next)) {
          this.data.flashDeals = next;
          if (force) changed = true;
        }
      }
      if (needBanners && banRes.status === 'fulfilled' && banRes.value?.banners) {
        const next = banRes.value.banners;
        if (!force || !sameJson(this.data.banners, next)) {
          this.data.banners = next;
          if (force) changed = true;
        }
      }

      if (!force) {
        const doneLoading = { ...this.data.loading };
        if (needProducts) doneLoading.products = false;
        if (needCategories) doneLoading.categories = false;
        if (needFlashDeals) doneLoading.flashDeals = false;
        if (needBanners) doneLoading.banners = false;
        this.data.loading = doneLoading;
      }

      if (changed) this.notify();
    } finally {
      this._marketplaceHomeDataLoading = false;
    }
  }

  async loadProducts(filters = {}) {
    return this._run('products', async () => {
      const params = new URLSearchParams();
      const category = filters.category ?? filters.selectedCategory;
      const district = filters.district ?? filters.selectedDistrict;
      const search = filters.search ?? filters.searchQuery;
      if (category && category !== 'all') params.set('category', category);
      if (district && district !== 'all') params.set('district', district);
      if (search) params.set('search', search);
      const qs = params.toString();
      const { products } = await api.get(`/products${qs ? `?${qs}` : ''}`);
      this.data.products = products;
      this.notify();
      return products;
    });
  }

  async loadMyProducts() {
    return this._run('myProducts', async () => {
      const { products } = await api.get('/products/mine');
      this.data.myProducts = products;
      this.notify();
      return products;
    });
  }

  async uploadProductImage(file) {
    return this._run('imageUpload', async () => {
      const { url } = await api.uploadFile('/uploads', file);
      return url;
    });
  }

  // Uploads run concurrently rather than one after another - a seller adding
  // eight photos on a Kigali mobile connection should not wait for eight
  // sequential round trips. Each file is a separate request to the same
  // endpoint, so one failure loses one photo instead of the whole batch;
  // the caller gets back only what actually landed, plus what did not.
  async uploadProductImages(files) {
    return this._run('imageUpload', async () => {
      const results = await Promise.allSettled(
        Array.from(files).map((file) => api.uploadFile('/uploads', file)),
      );

      const urls = [];
      const failed = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value?.url) urls.push(r.value.url);
        else failed.push(Array.from(files)[i]?.name || 'image');
      });

      return { urls, failed };
    });
  }

  async createProduct(productData) {
    return this._run('productForm', async () => {
      const { product } = await api.post('/products', {
        title: productData.title,
        categoryId: productData.category,
        price: Number(productData.price),
        district: productData.district,
        condition: productData.condition,
        description: productData.description,
        // A list now. The single `image` form is still accepted because
        // RealEstateAdmin passes one.
        images: (productData.images && productData.images.length
          ? productData.images
          : [productData.image]).filter(Boolean),
      });
      this.data.myProducts = [product, ...this.data.myProducts];
      this.notify();
      return product;
    });
  }

  async updateProduct(productId, productData) {
    return this._run('productForm', async () => {
      const { product } = await api.put(`/products/${productId}`, {
        title: productData.title,
        categoryId: productData.category,
        price: Number(productData.price),
        district: productData.district,
        condition: productData.condition,
        description: productData.description,
        images: (productData.images && productData.images.length
          ? productData.images
          : [productData.image]).filter(Boolean),
      });
      this.data.myProducts = this.data.myProducts.map((p) => (p.id === productId ? product : p));
      this.data.products = this.data.products.map((p) => (p.id === productId ? product : p));
      this.notify();
      return product;
    });
  }

  async renewProduct(productId) {

    return this._run('productForm', async () => {
      const { product } = await api.post(`/products/${productId}/renew`);
      this.data.myProducts = this.data.myProducts.map((p) => (p.id === productId ? product : p));
      this.notify();
      return product;
    });
  }

  // --- Product moderation (admin) ---

  async loadPendingProducts() {
    return this._run('pendingProducts', async () => {
      const { products } = await api.get('/products/pending');
      this.data.pendingProducts = products;
      this.notify();
      return products;
    });
  }

  async approveProduct(productId) {
    const { product } = await api.post(`/products/${productId}/approve`);
    this.data.pendingProducts = this.data.pendingProducts.filter((p) => p.id !== productId);
    this.notify();
    return product;
  }

  async rejectProduct(productId, reason) {
    const { product } = await api.post(`/products/${productId}/reject`, { reason });
    this.data.pendingProducts = this.data.pendingProducts.filter((p) => p.id !== productId);
    this.notify();
    return product;
  }

  async deleteProduct(productId) {
    return this._run('productForm', async () => {
      await api.delete(`/products/${productId}`);
      this.data.myProducts = this.data.myProducts.filter((p) => p.id !== productId);
      this.data.products = this.data.products.filter((p) => p.id !== productId);
      this.notify();
    });
  }

  // The homepage flash card and its "View all deals" modal. Active flash
  // deals are ACTIVE products with a future end time; the server filters by
  // that deadline, so an expired one simply stops coming back.
  async loadFlashDeals() {
    if (this._flashDealsInFlight) return this.data.flashDeals;
    this._flashDealsInFlight = true;
    try {
      return await this._run('flashDeals', async () => {
        const { products } = await api.get('/products/flash-deals');
        this.data.flashDeals = products;
        this.notify();
        return products;
      });
    } finally {
      this._flashDealsInFlight = false;
    }
  }

  // Admin: set a product's flash-deal end time (ISO string) or clear it
  // with null. The patch response is authoritative for this product, so update
  // the public deals cache directly instead of racing it with a background
  // reload that can briefly return stale data.
  async setProductFlashDeal(productId, endsAt) {
    return this._run('products', async () => {
      const { product } = await api.patch(`/products/${productId}/flash-deal`, { endsAt });
      this.data.products = this.data.products.map((p) => (p.id === productId ? product : p));
      const dealEndsAt = product.flashDealEndsAt ? new Date(product.flashDealEndsAt).getTime() : 0;
      const isActiveDeal = dealEndsAt > Date.now() && product.status === 'active';
      const withoutCurrent = (this.data.flashDeals || []).filter((p) => p.id !== product.id);
      this.data.flashDeals = isActiveDeal
        ? [...withoutCurrent, product].sort((a, b) => new Date(a.flashDealEndsAt).getTime() - new Date(b.flashDealEndsAt).getTime())
        : withoutCurrent;
      this.notify();
      return product;
    });
  }
  async toggleProductFlag(productId, flag) {
    return this._run('products', async () => {
      const current = this.data.products.find((p) => p.id === productId);
      const { product } = await api.patch(`/products/${productId}/flags`, {
        flag,
        value: current ? !current[flag] : true,
      });
      this.data.products = this.data.products.map((p) => (p.id === productId ? product : p));
      this.notify();
      return product;
    });
  }

  // --- Categories ---

  async loadCategories() {
    return this._run('categories', async () => {
      const { categories } = await api.get('/categories');
      this.data.categories = categories;
      this.notify();
      return categories;
    });
  }

  async addCategory(name, icon) {
    return this._run('categories', async () => {
      const { category } = await api.post('/categories', { name, icon });
      this.data.categories = [...this.data.categories, category];
      this.notify();
      return category;
    });
  }

  // The uploaded file becomes the category's iconUrl. It goes through the
  // same /uploads endpoint product photos use, so it lands in Supabase
  // Storage in production and on local disk in a bare checkout - a category
  // icon written to Railway's ephemeral filesystem would vanish on redeploy.
  async uploadCategoryIcon(file) {
    return this._run('categoryIconUpload', async () => {
      const { url } = await api.uploadFile('/uploads', file);
      return url;
    });
  }

  // Generic image upload for the ad/banner section - same /uploads endpoint,
  // returns the stored URL. Kept separate from uploadCategoryIcon only so the
  // two carry their own loading flag.
  async uploadImage(file) {
    return this._run('imageUpload', async () => {
      const { url } = await api.uploadFile('/uploads', file);
      return url;
    });
  }

  async updateCategoryIcon(categoryId, icon) {
    return this._run('categories', async () => {
      const { category } = await api.patch(`/categories/${categoryId}/icon`, { icon });
      this.data.categories = this.data.categories.map((c) => (c.id === category.id ? category : c));
      this.notify();
      return category;
    });
  }


  async renameCategory(categoryId, name) {
    return this._run('categories', async () => {
      const { category } = await api.patch(`/categories/${categoryId}`, { name });
      this.data.categories = this.data.categories.map((c) => (c.id === category.id ? category : c));
      this.notify();
      return category;
    });
  }

  async requestDeleteCategory(categoryId) {
    return this._run('approvalRequests', async () => {
      const { request } = await api.post(`/categories/${categoryId}/request-delete`, {});
      this.data.approvalRequests = [request, ...this.data.approvalRequests];
      this.notify();
      return request;
    });
  }

  // Self-service account edits (any signed-in user for the password; sellers
  // for the profile). Server verifies the current password / seller role.
  // "Forgot password?" on the sign-in screen. Deliberately not wrapped in
  // _run(): the caller is signed out, there is no loading key for it, and the
  // reply carries the message the form shows. Always resolves the same way
  // whether or not the address has an account (see auth.routes.ts).
  async requestPasswordReset(email) {
    const res = await api.post('/auth/forgot-password', { email });
    return res?.message || '';
  }

  async changePassword(currentPassword, newPassword) {
    return this._run('accountForm', async () => {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      return true;
    });
  }

  async updateSellerProfile({ name, phone }) {
    return this._run('accountForm', async () => {
      const { user } = await api.patch('/auth/profile', { name, phone });
      this.data.currentUser = { ...this.data.currentUser, name: user.name, phone: user.phone };
      this.notify();
      return user;
    });
  }

  // --- Sellers (Admin) ---

  async loadSellers() {
    return this._run('sellers', async () => {
      const { sellers } = await api.get('/sellers');
      this.data.sellers = sellers;
      this.notify();
      return sellers;
    });
  }

  /**
   * Public seller directory for the storefront stores page.
   *
   * Deliberately separate from loadSellers() above: that one hits the
   * admin-only GET /sellers and 401s for a shopper. This reads the public
   * endpoint, which returns only what a store card shows - name, district,
   * phone, member-since, and the seller's live listings.
   */
  async loadPublicSellers() {
    return this._run('publicSellers', async () => {
      const { sellers } = await api.get('/sellers/public');
      this.data.publicSellers = sellers;
      this.notify();
      return sellers;
    });
  }

  async resetSellerPassword(sellerId) {
    return this._run('sellers', () => api.post(`/sellers/${sellerId}/reset-password`, {}));
  }

  async toggleSellerStatus(sellerId) {
    return this._run('sellers', async () => {
      const { status } = await api.post(`/sellers/${sellerId}/toggle-status`, {});
      this.data.sellers = this.data.sellers.map((s) => (s.id === sellerId ? { ...s, status } : s));
      this.notify();
      return status;
    });
  }

  async requestDeleteSeller(sellerId, reason) {
    return this._run('approvalRequests', async () => {
      const { request } = await api.post(`/sellers/${sellerId}/request-delete`, { reason });
      this.data.approvalRequests = [request, ...this.data.approvalRequests];
      this.notify();
      return request;
    });
  }

  // --- Gasabo Real Estate CMS ---

  async loadRealEstate() {
    return this._run('realEstate', async () => {
      const data = await api.get('/realestate');
      this.data.realEstate = data;
      this.notify();
      return data;
    });
  }

  async saveRealEstateHero(hero) {
    return this._run('realEstate', async () => {
      const { hero: updated } = await api.put('/realestate/hero', hero);
      this.data.realEstate = { ...this.data.realEstate, hero: updated };
      this.notify();
      return updated;
    });
  }

  async saveRealEstateSection(sectionKey, content) {
    return this._run('realEstate', async () => {
      const normalized = String(sectionKey).toLowerCase();
      const data = await api.put(`/realestate/${sectionKey}`, content);
      const updated = data[normalized];
      this.data.realEstate = { ...this.data.realEstate, [normalized]: updated };
      this.notify();
      return updated;
    });
  }

  async addRealEstateProperty(propertyData) {
    return this._run('realEstate', async () => {
      const { properties } = await api.post('/realestate/properties', propertyData);
      this.data.realEstate = { ...this.data.realEstate, properties };
      this.notify();
      return properties;
    });
  }

  async updateRealEstateProperty(propertyId, propertyData) {
    return this._run('realEstate', async () => {
      const { properties } = await api.put(`/realestate/properties/${propertyId}`, propertyData);
      this.data.realEstate = { ...this.data.realEstate, properties };
      this.notify();
      return properties;
    });
  }

  async deleteRealEstateProperty(propertyId) {

    return this._run('realEstate', async () => {
      const { properties } = await api.delete(`/realestate/properties/${propertyId}`);
      this.data.realEstate = { ...this.data.realEstate, properties };
      this.notify();
      return properties;
    });
  }

  // --- Multi-Admin Approval Workflow ---

  async loadApprovals() {
    return this._run('approvalRequests', async () => {
      const { requests } = await api.get('/approvals');
      this.data.approvalRequests = requests;
      this.notify();
      return requests;
    });
  }

  async approveRequest(requestId) {
    return this._run('approvalRequests', async () => {
      const { request } = await api.post(`/approvals/${requestId}/approve`, {});
      this.data.approvalRequests = this.data.approvalRequests.map((r) => (r.id === requestId ? request : r));
      this.notify();
      return request;
    });
  }

  async rejectRequest(requestId, note = '') {
    return this._run('approvalRequests', async () => {
      const { request } = await api.post(`/approvals/${requestId}/reject`, { note });
      this.data.approvalRequests = this.data.approvalRequests.map((r) => (r.id === requestId ? request : r));
      this.notify();
      return request;
    });
  }

  // --- Audit Logs & Backups ---

  async loadAuditLogs() {
    return this._run('auditLogs', async () => {
      const { logs } = await api.get('/audit-logs');
      this.data.auditLogs = logs;
      this.notify();
      return logs;
    });
  }

  async triggerBackup() {
    return this._run('auditLogs', () => api.post('/audit-logs/backup', {}));
  }

  async submitRealEstateInquiry(payload) {
    return this._run('realEstateInquiry', () => api.post('/realestate/inquiries', payload));
  }

  // --- Advertisements / Banners ---

  async loadBanners() {
    return this._run('banners', async () => {
      const { banners } = await api.get('/advertisements');
      this.data.banners = banners;
      this.notify();
      return banners;
    });
  }

  // No `type`: HERO_SLIDER is the only one, and the server fills it in. The
  // other two types the admin form used to offer rendered nowhere.
  async createBanner(title, imageUrl, { targetUrl = null } = {}) {
    return this._run('banners', async () => {
      const { banner } = await api.post('/advertisements', { title, imageUrl, targetUrl });
      // Re-fetch rather than hand-append: the list endpoint reshapes each
      // record (id/title/subtitle/image/status) differently from what POST
      // returns (the raw Advertisement row), so appending the raw response
      // directly would render inconsistently with the rest of the list.
      await this.loadBanners();
      return banner;
    });
  }

  async deleteBanner(bannerId) {
    return this._run('banners', async () => {
      await api.delete(`/advertisements/${bannerId}`);
      this.data.banners = this.data.banners.filter((b) => b.id !== bannerId);
      this.notify();
    });
  }

  // --- RBAC ---

  async loadRbacUsers() {
    return this._run('systemUsers', async () => {
      const { users } = await api.get('/rbac/users');
      this.data.systemUsers = users;
      this.notify();
      return users;
    });
  }

  async loadNotifications() {
    return this._run('notifications', async () => {
      const { notifications } = await api.get('/notifications');
      this.data.notifications = notifications;
      this.notify();
      return notifications;
    });
  }

  async markNotificationRead(notificationId) {
    await api.post(`/notifications/${notificationId}/read`, {});
    this.data.notifications = this.data.notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
    this.notify();
  }

  async markAllNotificationsRead() {
    await api.post('/notifications/mark-all-read', {});
    this.data.notifications = this.data.notifications.map((n) => ({ ...n, isRead: true }));
    this.notify();
  }

  async requestPermissionChange(userId, targetName, permissions) {
    return this._run('approvalRequests', async () => {
      const { request } = await api.post(`/rbac/users/${userId}/request-permission-change`, { targetName, permissions });
      this.data.approvalRequests = [request, ...this.data.approvalRequests];
      this.notify();
      return request;
    });
  }

  // Creating a Sub-Administrator account now goes through the same
  // dual-authorization queue as changing one's permissions - nothing is
  // written to the SubAdministrator table until a different Administrator
  // approves the request (see executeApprovedAction in
  // server/src/routes/approvals.routes.ts). This returns an ApprovalRequest,
  // not a user - there's no account to add to systemUsers yet.
  async requestCreateSubAdmin(name, email, password, permissions) {
    return this._run('approvalRequests', async () => {
      const { request } = await api.post('/rbac/sub-admins/request-create', { name, email, password, permissions });
      this.data.approvalRequests = [request, ...this.data.approvalRequests];
      this.notify();
      return request;
    });
  }

  // A second full Administrator - not another Sub-Administrator - is what
  // breaks the dual-authorization deadlock: with only one Administrator
  // account, self-approval being blocked means no critical request (like a
  // Sub-Administrator permission grant) can ever be approved.
  async createAdministrator(name, email, password) {
    return this._run('systemUsers', async () => {
      const { user } = await api.post('/rbac/administrators', { name, email, password });
      this.data.systemUsers = [...this.data.systemUsers, user];
      this.notify();
      return user;
    });
  }

  async requestDeleteSubAdmin(subAdminId, reason) {
    return this._run('approvalRequests', async () => {
      const { request } = await api.post(`/rbac/sub-admins/${subAdminId}/request-delete`, { reason });
      this.data.approvalRequests = [request, ...this.data.approvalRequests];
      this.notify();
      return request;
    });
  }

  async resetSubAdminPassword(subAdminId) {
    return this._run('systemUsers', () => api.post(`/rbac/sub-admins/${subAdminId}/reset-password`, {}));
  }

  async changeSubAdminEmail(subAdminId, email) {
    return this._run('systemUsers', async () => {
      const { email: updatedEmail } = await api.post(`/rbac/sub-admins/${subAdminId}/change-email`, { email });
      this.data.systemUsers = this.data.systemUsers.map((u) => (u.id === subAdminId ? { ...u, email: updatedEmail } : u));
      this.notify();
      return updatedEmail;
    });
  }

  async changeSellerEmail(sellerId, email) {
    return this._run('sellers', async () => {
      const { email: updatedEmail } = await api.post(`/sellers/${sellerId}/change-email`, { email });
      this.data.sellers = this.data.sellers.map((s) => (s.id === sellerId ? { ...s, email: updatedEmail } : s));
      this.notify();
      return updatedEmail;
    });
  }
}

export const stateEngine = new StateEngine();
