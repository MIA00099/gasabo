/**
 * KIGALI MARKET PLATFORM - Reactive State Engine
 * Session and UI state are kept locally; all substantive data (products,
 * categories, sellers, real estate content, approvals, audit logs) is
 * fetched from and written to the real backend API - nothing here is the
 * source of truth anymore, it's a reactive cache the views read from.
 */
import { api, getSession, setSession } from '../api/client.js';

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
      categories: [],
      sellers: [],
      banners: [],
      realEstate: { hero: null, about: null, services: [], gallery: [], contact: null, projects: [] },
      approvalRequests: [],
      auditLogs: [],
      systemUsers: [],
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

  // --- Auth ---

  isAdmin() {
    return this.data.currentUser.role === 'admin' || this.data.currentUser.role === 'sub_admin';
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

  async resetSellerPassword(sellerId) {
    return this._run('sellers', () => api.post(`/sellers/${sellerId}/reset-password`, {}));
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

  async addRealEstateProject(projectData) {
    return this._run('realEstate', async () => {
      const { projects } = await api.post('/realestate/projects', projectData);
      this.data.realEstate = { ...this.data.realEstate, projects };
      this.notify();
      return projects;
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

  // --- RBAC ---

  async loadRbacUsers() {
    return this._run('systemUsers', async () => {
      const { users } = await api.get('/rbac/users');
      this.data.systemUsers = users;
      this.notify();
      return users;
    });
  }

  async requestPermissionChange(userId, targetName) {
    return this._run('approvalRequests', async () => {
      const { request } = await api.post(`/rbac/users/${userId}/request-permission-change`, { targetName });
      this.data.approvalRequests = [request, ...this.data.approvalRequests];
      this.notify();
      return request;
    });
  }
}

export const stateEngine = new StateEngine();
