/**
 * KIGALI MARKET PLATFORM - Reactive State Engine
 * Session and UI state are kept locally; all substantive data (products,
 * categories, sellers, real estate content, approvals, audit logs) is
 * fetched from and written to the real backend API - nothing here is the
 * source of truth anymore, it's a reactive cache the views read from.
 */
import { api, getSession, setSession } from '../api/client.js';
import { parseLocation, ROUTE_HOME, ROUTE_PRODUCT } from './router.js';

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

class StateEngine {
  constructor() {
    this.listeners = [];
    const session = getSession();
    this.data = {
      activePortal: 'marketplace',
      currentLang: localStorage.getItem(LANG_KEY) || 'en',
      currentUser: session?.user ? normalizeUser(session.user) : guestUser(),
      districts: DISTRICTS,
      products: [],
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
      route: parseLocation(),
      // The listing behind a /product/:id or /property/:id URL, fetched on
      // demand. Deep links cannot rely on state.products: on a cold load it
      // is empty, and even once loaded the listing may be filtered out of the
      // current result set.
      routeListing: null,
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
    this.listeners.forEach((l) => l(this.data));
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

    // Only the two listing routes carry an id to resolve. Everything else is
    // a page: an earlier version treated "anything that is not a product" as
    // real estate, which sent /products and /stores to the wrong portal.
    const isProperty = route.kind === 'property';

    if (isProperty) {
      this.data.activePortal = 'realestate';
    } else {
      this.data.activePortal = 'marketplace';
      if (route.kind === ROUTE_PRODUCT) this.setUI({ marketplaceTab: 'products' });
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
    this.data.currentUser = guestUser();
    this.data.activePortal = 'marketplace';
    this.notify();
  }

  // --- Products (Marketplace) ---

  async loadProducts(filters = {}) {
    return this._run('products', async () => {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.district && filters.district !== 'all') params.set('district', filters.district);
      if (filters.search) params.set('search', filters.search);
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

  async createProduct(productData) {
    return this._run('productForm', async () => {
      const { product } = await api.post('/products', {
        title: productData.title,
        categoryId: productData.category,
        price: Number(productData.price),
        district: productData.district,
        condition: productData.condition,
        description: productData.description,
        images: [productData.image].filter(Boolean),
      });
      this.data.myProducts = [product, ...this.data.myProducts];
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

  async updateCategoryIcon(categoryId, icon) {
    return this._run('categories', async () => {
      const { category } = await api.patch(`/categories/${categoryId}/icon`, { icon });
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

  async addRealEstateProperty(propertyData) {
    return this._run('realEstate', async () => {
      const { properties } = await api.post('/realestate/properties', propertyData);
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

  // --- Advertisements / Banners ---

  async loadBanners() {
    return this._run('banners', async () => {
      const { banners } = await api.get('/advertisements');
      this.data.banners = banners;
      this.notify();
      return banners;
    });
  }

  async createBanner(title, imageUrl) {
    return this._run('banners', async () => {
      const { banner } = await api.post('/advertisements', { title, imageUrl });
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
