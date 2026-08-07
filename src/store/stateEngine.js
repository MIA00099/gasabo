/**
 * KIGALI MARKET PLATFORM - Enterprise Reactive State & Storage Engine
 * Apple/Stripe-Grade Architecture supporting Wishlist, Cart, Messages, Search, Seller Analytics & Approvals.
 */

const STORAGE_KEY = 'KIGALIMARKET_PLATFORM_STATE_V4';

const initialData = {
  activePortal: 'marketplace',
  currentLang: 'en', // 'en' | 'rw'
  
  // Current Session Context
  currentUser: {
    id: 'user_admin_super',
    name: 'Jean-Luc Habimana',
    email: 'admin@kigalimarket.com',
    role: 'super_admin', // 'super_admin' | 'admin' | 'sub_admin' | 'seller' | 'guest'
    phone: '+250 788 123 456',
    district: 'Gasabo',
    permissions: {
      product_mgmt: true,
      seller_mgmt: true,
      category_mgmt: true,
      banner_mgmt: true,
      realestate_content: true,
      reports: true,
      user_mgmt: true,
      system_settings: true
    }
  },

  // Wishlist & Cart Engine
  wishlistIds: ['prod_101', 'prod_104'],
  cartItems: [
    { productId: 'prod_101', quantity: 1 }
  ],

  // Recent Searches & Popular Autocomplete
  recentSearches: ['Musanze Coffee', 'Toyota RAV4', 'Agaseke Baskets', 'MacBook Pro'],
  popularSearches: ['Specialty Arabica', 'Kigali Eco Villa', 'Solid Teak Table', 'iPhone 15 Pro'],

  // Categories with Product Counts & Icons
  categories: [
    { id: 'cat_electronics', name: 'Electronics & Tech', icon: '💻', count: 42, enabled: true },
    { id: 'cat_agri', name: 'Agri-Business & Produce', icon: '☕', count: 86, enabled: true },
    { id: 'cat_vehicles', name: 'Vehicles & Automotive', icon: '🚗', count: 24, enabled: true },
    { id: 'cat_fashion', name: 'Fashion & Handcrafts', icon: '👗', count: 58, enabled: true },
    { id: 'cat_home', name: 'Home & Furniture', icon: '🛋️', count: 35, enabled: true },
    { id: 'cat_services', name: 'Professional Services', icon: '🛠️', count: 19, enabled: true }
  ],

  districts: [
    'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo',
    'Gicumbi', 'Gisagara', 'Huye', 'Kamonyi', 'Karongi',
    'Kayonza', 'Kicukiro', 'Kirehe', 'Muhanga', 'Musanze',
    'Ngoma', 'Ngororero', 'Nyabihu', 'Nyagatare', 'Nyamagabe',
    'Nyamasheke', 'Nyanza', 'Nyarugenge', 'Nyaruguru', 'Rubavu',
    'Ruhango', 'Rulindo', 'Rusizi', 'Rutsiro', 'Rwamagana'
  ],

  // Verified Marketplace Products with Ratings & Seller Reviews
  products: [
    {
      id: 'prod_101',
      title: 'Musanze High-Altitude Specialty Bourbon Coffee (1kg)',
      category: 'cat_agri',
      price: 18000,
      currency: 'RWF',
      district: 'Musanze',
      condition: 'Fresh Roast',
      rating: 4.9,
      reviewCount: 38,
      isVerifiedSeller: true,
      description: 'Single-origin washed 100% Arabica coffee cultivated on the volcanic slopes of Virunga Mountains, Musanze. Rich chocolate & floral notes.',
      images: [
        'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80'
      ],
      sellerId: 'seller_1',
      sellerName: 'Eric Mugisha (AgriCoop)',
      sellerPhone: '+250 788 345 678',
      postedDate: '2026-05-15',
      expiryDate: '2026-11-15',
      status: 'active',
      isFeatured: true,
      isTrending: true
    },
    {
      id: 'prod_102',
      title: 'Toyota RAV4 Hybrid AWD 2021 (Kigali Registered)',
      category: 'cat_vehicles',
      price: 34500000,
      currency: 'RWF',
      district: 'Gasabo',
      condition: 'Used - Mint Condition',
      rating: 4.8,
      reviewCount: 14,
      isVerifiedSeller: true,
      description: 'Fully loaded Toyota RAV4 2021 Hybrid. AWD, leather seats, panoramic sunroof, Kigali plate RAF 890X, complete maintenance record at Akagera Motors.',
      images: [
        'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80'
      ],
      sellerId: 'seller_2',
      sellerName: 'Marie Claire Uwase',
      sellerPhone: '+250 789 987 654',
      postedDate: '2026-02-12',
      expiryDate: '2026-08-12', // Expiring in 6 days
      status: 'expiring_soon',
      isFeatured: true,
      isTrending: true
    },
    {
      id: 'prod_103',
      title: 'Authentic Rwandan Handwoven Agaseke Baskets (Set of 3)',
      category: 'cat_fashion',
      price: 55000,
      currency: 'RWF',
      district: 'Nyarugenge',
      condition: 'Handcrafted',
      rating: 5.0,
      reviewCount: 52,
      isVerifiedSeller: true,
      description: 'Set of 3 traditional Agaseke peace baskets handwoven by local women artisan cooperatives in Nyarugenge using organic sisal fibers.',
      images: [
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80'
      ],
      sellerId: 'seller_1',
      sellerName: 'Eric Mugisha (AgriCoop)',
      sellerPhone: '+250 788 345 678',
      postedDate: '2026-01-01',
      expiryDate: '2026-07-01',
      status: 'expired',
      isFeatured: false,
      isTrending: false
    },
    {
      id: 'prod_104',
      title: 'Apple MacBook Pro M3 Max 16" (36GB RAM, 1TB SSD)',
      category: 'cat_electronics',
      price: 3200000,
      currency: 'RWF',
      district: 'Kicukiro',
      condition: 'Brand New In Box',
      rating: 4.95,
      reviewCount: 22,
      isVerifiedSeller: true,
      description: 'Space Black MacBook Pro with M3 Max 14-core CPU and 30-core GPU. Official Apple 1-year warranty included.',
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80'
      ],
      sellerId: 'seller_3',
      sellerName: 'Patrick Ndayishimiye (TechHub)',
      sellerPhone: '+250 783 112 233',
      postedDate: '2026-06-10',
      expiryDate: '2026-12-10',
      status: 'active',
      isFeatured: true,
      isTrending: true
    },
    {
      id: 'prod_105',
      title: 'Handcrafted Solid Teak Wood 8-Seater Dining Table',
      category: 'cat_home',
      price: 950000,
      currency: 'RWF',
      district: 'Rubavu',
      condition: 'Custom Build',
      rating: 4.85,
      reviewCount: 19,
      isVerifiedSeller: true,
      description: 'Solid high-grade teak wood dining table with 8 ergonomic matching chairs, finished with anti-scratch UV polyurethane lacquer.',
      images: [
        'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=1000&q=80'
      ],
      sellerId: 'seller_2',
      sellerName: 'Marie Claire Uwase',
      sellerPhone: '+250 789 987 654',
      postedDate: '2026-04-18',
      expiryDate: '2026-10-18',
      status: 'active',
      isFeatured: true,
      isTrending: false
    }
  ],

  // Popular Verified Sellers (Sellers Directory)
  sellers: [
    {
      id: 'seller_1',
      name: 'Eric Mugisha (AgriCoop)',
      email: 'eric.m@rwandaagri.rw',
      phone: '+250 788 345 678',
      district: 'Musanze',
      status: 'active',
      rating: 4.9,
      joinedDate: '2025-11-10',
      productsCount: 12,
      salesCompleted: 145
    },
    {
      id: 'seller_2',
      name: 'Marie Claire Uwase',
      email: 'uwase.mc@gmail.com',
      phone: '+250 789 987 654',
      district: 'Gasabo',
      status: 'active',
      rating: 4.8,
      joinedDate: '2026-01-15',
      productsCount: 8,
      salesCompleted: 82
    },
    {
      id: 'seller_3',
      name: 'Patrick Ndayishimiye (TechHub)',
      email: 'patrick.tech@kigali.rw',
      phone: '+250 783 112 233',
      district: 'Kicukiro',
      status: 'active',
      rating: 4.95,
      joinedDate: '2026-03-04',
      productsCount: 15,
      salesCompleted: 210
    }
  ],

  // Gasabo Real Estate Portfolio
  realEstate: {
    hero: {
      title: 'Building Rwanda’s Next Generation Architectural Landmarks',
      subtitle: 'Gasabo Real Estate leads luxury residential developments, grade-A commercial plazas, land surveying, and property management in Kigali, Musanze, and Rubavu.',
      bgImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80'
    },
    projects: [
      {
        id: 'proj_1',
        title: 'Gasabo Green Heights Villa Estate',
        category: 'Residential',
        district: 'Gasabo (Gacuriro)',
        units: '24 Luxury Solar Eco-Villas',
        status: 'Completed',
        image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
        description: 'Solar-powered 4-bedroom smart eco-villas featuring panoramic Kigali valley views, private pools, and 24/7 guarded security.'
      },
      {
        id: 'proj_2',
        title: 'Kigali Central Commercial Plaza',
        category: 'Commercial',
        district: 'Nyarugenge (CBD)',
        units: '14 Floors Grade-A Offices',
        status: 'Under Construction (85%)',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
        description: 'State-of-the-art office tower with double-glazed glass facade, high-speed fiber optics, 250-car parking garage, and rooftop garden.'
      }
    ],
    contactInfo: {
      address: 'Gasabo Tower, 4th Floor, KG 7 Ave, Kacyiru, Gasabo District, Kigali, Rwanda',
      phone: '+250 788 100 200',
      email: 'info@gasaborealestate.rw'
    }
  },

  // Messages Inbox Simulation
  messages: [
    {
      id: 'msg_1',
      senderName: 'Marie Claire Uwase',
      productTitle: 'Toyota RAV4 Hybrid AWD',
      lastMsg: 'Hello! Yes, the car is available for inspection in Gacuriro.',
      time: '10:45 AM',
      unread: true
    }
  ],

  // Critical Multi-Admin Approvals Queue
  approvalRequests: [
    {
      id: 'appr_req_101',
      actionType: 'DELETE_SELLER_ACCOUNT',
      targetName: 'Seller: Patrick Ndayishimiye (ID: seller_3)',
      targetId: 'seller_3',
      requestedBy: 'Divine Mutoni (Admin)',
      requestedByEmail: 'divine.m@kigalimarket.com',
      date: '2026-08-05 14:30',
      reason: 'Seller requested account closure after business acquisition.',
      status: 'pending',
      riskLevel: 'HIGH',
      requiredRole: 'super_admin'
    }
  ],

  // System RBAC Users
  systemUsers: [
    {
      id: 'user_admin_super',
      name: 'Jean-Luc Habimana',
      email: 'admin@kigalimarket.com',
      role: 'super_admin',
      district: 'Gasabo',
      status: 'active',
      lastLogin: '2026-08-06 03:10',
      permissions: {
        product_mgmt: true,
        seller_mgmt: true,
        category_mgmt: true,
        banner_mgmt: true,
        realestate_content: true,
        reports: true,
        user_mgmt: true,
        system_settings: true
      }
    }
  ],

  // Audit Log Registry
  auditLogs: [
    {
      id: 'audit_1001',
      timestamp: '2026-08-06 03:00:12',
      user: 'Jean-Luc Habimana (Super Admin)',
      action: 'LOGIN_SUCCESS',
      module: 'Security & Auth',
      ip: '197.243.32.14 (Kigali, RW)',
      details: 'Super Admin authenticated into Kigali Market Platform.'
    }
  ]
};

class StateEngine {
  constructor() {
    this.listeners = [];
    this.data = this.loadState();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (!data.districts || data.districts.length < 30) {
          data.districts = initialData.districts;
        }
        return data;
      }
    } catch (e) {
      console.warn('Failed loading local state:', e);
    }
    return JSON.parse(JSON.stringify(initialData));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed saving local state:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.data));
  }

  getState() {
    return this.data;
  }

  setPortal(portalName) {
    this.data.activePortal = portalName;
    this.saveState();
  }

  setCurrentUserRole(roleName) {
    const userMap = {
      super_admin: this.data.systemUsers[0],
      admin: { id: 'user_admin_2', name: 'Divine Mutoni', email: 'divine@kigalimarket.com', role: 'admin', district: 'Nyarugenge' },
      sub_admin: { id: 'user_subadmin_1', name: 'Jean Paul', email: 'jp@kigalimarket.com', role: 'sub_admin', district: 'Musanze' },
      seller: { id: 'seller_1', name: 'Eric Mugisha (Seller)', email: 'eric.m@rwandaagri.rw', role: 'seller', phone: '+250 788 345 678', district: 'Musanze' },
      guest: { id: 'guest_user', name: 'Marketplace Visitor', email: '', role: 'guest', phone: '', district: 'Gasabo' }
    };
    this.data.currentUser = userMap[roleName] || userMap.super_admin;
    this.logAudit(this.data.currentUser.name, 'ROLE_SWITCHED', 'Session Auth', `Switched active perspective to ${roleName.toUpperCase()}`);
    this.saveState();
  }

  // --- Wishlist Actions ---

  toggleWishlist(productId) {
    const idx = this.data.wishlistIds.indexOf(productId);
    if (idx >= 0) {
      this.data.wishlistIds.splice(idx, 1);
    } else {
      this.data.wishlistIds.push(productId);
    }
    this.saveState();
  }

  isInWishlist(productId) {
    return this.data.wishlistIds.includes(productId);
  }

  // --- Cart Actions ---

  addToCart(productId) {
    const existing = this.data.cartItems.find(item => item.productId === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.data.cartItems.push({ productId, quantity: 1 });
    }
    this.saveState();
  }

  // --- Marketplace Product Actions ---

  addProduct(productData) {
    const newId = 'prod_' + Date.now();
    const today = new Date();
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 6);

    const newProd = {
      id: newId,
      title: productData.title,
      category: productData.category,
      price: Number(productData.price),
      currency: 'RWF',
      district: productData.district || 'Gasabo',
      condition: productData.condition || 'New',
      rating: 5.0,
      reviewCount: 1,
      isVerifiedSeller: true,
      description: productData.description || '',
      images: productData.images.length ? productData.images : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=80'],
      sellerId: this.data.currentUser.id || 'seller_1',
      sellerName: this.data.currentUser.name || 'Verified Rwandan Seller',
      sellerPhone: this.data.currentUser.phone || '+250 788 000 000',
      postedDate: today.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      status: 'active',
      isFeatured: false,
      isTrending: false
    };

    this.data.products.unshift(newProd);
    this.logAudit(this.data.currentUser.name, 'PRODUCT_PUBLISHED', 'Marketplace', `Published product "${newProd.title}" (Active 6 Months).`);
    this.saveState();
    return newProd;
  }

  renewProduct(productId) {
    const prod = this.data.products.find(p => p.id === productId);
    if (prod) {
      const today = new Date();
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 6);

      prod.status = 'active';
      prod.postedDate = today.toISOString().split('T')[0];
      prod.expiryDate = expiry.toISOString().split('T')[0];

      this.logAudit(this.data.currentUser.name, 'PRODUCT_RENEWED', 'Marketplace', `Renewed product "${prod.title}" for 6 months (Expires: ${prod.expiryDate}).`);
      this.saveState();
    }
  }

  deleteProduct(productId) {
    const prod = this.data.products.find(p => p.id === productId);
    if (prod) {
      this.data.products = this.data.products.filter(p => p.id !== productId);
      this.logAudit(this.data.currentUser.name, 'PRODUCT_DELETED', 'Marketplace', `Deleted product "${prod.title}".`);
      this.saveState();
    }
  }

  // --- Seller Onboarding ---

  registerSeller(sellerForm) {
    const newId = 'seller_' + Date.now();
    const newSeller = {
      id: newId,
      name: sellerForm.fullName,
      email: sellerForm.email,
      phone: sellerForm.phone,
      district: sellerForm.district,
      status: 'active',
      rating: 5.0,
      joinedDate: new Date().toISOString().split('T')[0],
      productsCount: 0,
      salesCompleted: 0
    };
    this.data.sellers.push(newSeller);
    this.data.currentUser = {
      id: newId,
      name: newSeller.name,
      email: newSeller.email,
      role: 'seller',
      phone: newSeller.phone,
      district: newSeller.district
    };

    this.logAudit(newSeller.name, 'SELLER_REGISTRATION', 'Seller Portal', `Registered seller account in ${newSeller.district}.`);
    this.saveState();
  }

  // --- Multi-Admin Approval Workflow ---

  createApprovalRequest(actionType, targetName, targetId, reason, riskLevel = 'HIGH') {
    const reqId = 'appr_req_' + Math.floor(1000 + Math.random() * 9000);
    const newReq = {
      id: reqId,
      actionType,
      targetName,
      targetId,
      requestedBy: `${this.data.currentUser.name} (${this.data.currentUser.role.toUpperCase()})`,
      requestedByEmail: this.data.currentUser.email,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reason: reason || 'Sensitive administrative action requested.',
      status: 'pending',
      riskLevel
    };

    this.data.approvalRequests.unshift(newReq);
    this.logAudit(this.data.currentUser.name, 'CRITICAL_APPROVAL_REQUESTED', 'Multi-Admin Approvals', `Created approval request ${reqId} for ${actionType}.`);
    this.saveState();
    return newReq;
  }

  processApprovalRequest(requestId, approveOrReject, note = '') {
    const req = this.data.approvalRequests.find(r => r.id === requestId);
    if (!req) return;

    if (approveOrReject === 'approve') {
      req.status = 'approved';
      req.approvedBy = this.data.currentUser.name;
      req.approvalDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
      req.note = note;

      this.executeCriticalAction(req);
      this.logAudit(this.data.currentUser.name, 'CRITICAL_ACTION_APPROVED', 'Multi-Admin Approvals', `Approved & executed request ${requestId} (${req.actionType}).`);
    } else {
      req.status = 'rejected';
      req.rejectedBy = this.data.currentUser.name;
      req.rejectionDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
      req.note = note;

      this.logAudit(this.data.currentUser.name, 'CRITICAL_ACTION_REJECTED', 'Multi-Admin Approvals', `Rejected request ${requestId}.`);
    }

    this.saveState();
  }

  executeCriticalAction(req) {
    if (req.actionType === 'DELETE_SELLER_ACCOUNT') {
      this.data.sellers = this.data.sellers.filter(s => s.id !== req.targetId);
      this.data.products = this.data.products.filter(p => p.sellerId !== req.targetId);
    } else if (req.actionType === 'DELETE_CATEGORY') {
      this.data.categories = this.data.categories.filter(c => c.id !== req.targetId);
    }
  }

  logAudit(userName, action, module, details) {
    this.data.auditLogs.unshift({
      id: 'audit_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: userName,
      action,
      module,
      ip: '197.243.' + Math.floor(10 + Math.random() * 80) + '.' + Math.floor(10 + Math.random() * 80) + ' (Kigali, RW)',
      details
    });
  }

  setLanguage(lang) {
    this.data.currentLang = lang;
    this.saveState();
  }

  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(initialData));
    this.saveState();
  }
}

export const stateEngine = new StateEngine();
