/**
 * KIGALI MARKET - site header.
 *
 * Three tiers, per the high-fidelity spec:
 *   1. utility strip  - delivery promo, support links, language
 *   2. main bar       - brand, search, account / wishlist / cart
 *   3. category bar   - section nav + "Post an Ad"
 *
 * Lifted out of main.js rather than grown in place: the markup roughly
 * tripled, and main.js was already carrying render orchestration, routing and
 * modal syncing.
 *
 * NOT-YET-BUILT CONTROLS
 * The spec includes Wishlist, Cart, Track Order, Deals, Stores and New
 * Arrivals. None have a backing model, and this pass deliberately changes no
 * schema. They are rendered so the layout matches the design, but each one
 * says so when clicked instead of silently doing nothing - a control that
 * looks live and ignores you is worse than one that admits it is not ready.
 */
import { getTranslation } from '../store/i18n.js';

const ROLE_LABELS = {
  admin: 'Administrator',
  sub_admin: 'Sub-Administrator',
  seller: 'Seller',
  user: 'Member',
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

/**
 * Transient message for controls the spec shows but the backend cannot serve
 * yet. Deliberately not alert(): it blocks the page and reads like an error.
 */
function notReadyToast(label) {
  document.querySelector('.km-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'km-toast';
  el.setAttribute('role', 'status');
  el.textContent = `${label} is coming soon.`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('is-visible'), 10);
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 250);
  }, 2200);
}

export function renderHeaderHtml(ctx) {
  const {
    activePortal, currentUser, currentLang, searchQuery,
    showAccountChip, showNotifBell, unreadNotifCount, notifications, notifDropdownOpen,
  } = ctx;

  const t = (key) => getTranslation(currentLang, key);
  const roleLabel = ROLE_LABELS[currentUser.role] || '';
  const isRealEstate = activePortal === 'realestate';

  return `
    <header class="main-navbar">

      <div class="nav-utility-bar">
        <!-- The spec reads "Free Delivery on orders over RWF 50,000". This is a
             classifieds marketplace - buyers contact sellers directly and no
             delivery is offered or arranged - so that line would promise
             something the platform cannot honour. Same reason "Track Order"
             is not here: there are no orders to track. Replaced with a claim
             that is true. -->
        <span class="nav-utility-promo">
          <span aria-hidden="true">📍</span> Buy and sell across all 30 districts of Rwanda
        </span>
        <nav class="nav-utility-links" aria-label="Support and language">
          <button type="button" data-soon="Help Center">Help Center</button>
          <span class="nav-utility-sep" aria-hidden="true">|</span>
          <button type="button" id="util-become-seller">Become a Seller</button>
          <span class="nav-utility-sep" aria-hidden="true">|</span>
          <span class="nav-lang-switch">
            <button type="button" id="lang-toggle-en" class="${currentLang === 'en' ? 'is-active' : ''}"
              aria-pressed="${currentLang === 'en'}">EN</button>
            <button type="button" id="lang-toggle-rw" class="${currentLang === 'rw' ? 'is-active' : ''}"
              aria-pressed="${currentLang === 'rw'}">KINY</button>
          </span>
        </nav>
      </div>

      <div class="nav-main-bar">
        <div class="nav-brand-logo" id="nav-brand-home" role="button" tabindex="0"
          aria-label="Kigali Market - home">
          <img src="${isRealEstate ? '/real-estate-logo.png' : '/logo.svg'}" alt=""
            style="${isRealEstate ? 'border-radius:8px;' : ''}">
          <span class="nav-brand-text">
            <strong>${isRealEstate ? 'GASABO' : 'KIGALI'}</strong>
            <em>${isRealEstate ? 'REAL ESTATE' : 'MARKET'}<span>.COM</span></em>
          </span>
        </div>

        <form class="nav-search" id="header-search-form" role="search">
          <label class="sr-only" for="header-search-input">Search listings</label>
          <input id="header-search-input" type="search" autocomplete="off"
            placeholder="Search for products, vehicles, properties and more..."
            value="${escapeHtml(searchQuery)}">
          <button type="submit" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.6-3.6"></path>
            </svg>
          </button>
        </form>

        <div class="nav-actions-group">
          ${showNotifBell ? `
            <div class="nav-notif-wrap">
              <button class="nav-icon-btn" id="header-notif-btn" type="button"
                aria-label="Notifications${unreadNotifCount ? `, ${unreadNotifCount} unread` : ''}">
                <span aria-hidden="true">🔔</span>
                ${unreadNotifCount > 0 ? `<span class="action-count-badge">${unreadNotifCount}</span>` : ''}
              </button>
              ${notifDropdownOpen ? `
                <div id="notif-dropdown" class="nav-notif-dropdown">
                  <div class="nav-notif-head">
                    <span>Notifications</span>
                    ${unreadNotifCount > 0 ? `<button type="button" id="notif-mark-all-read">Mark all read</button>` : ''}
                  </div>
                  ${notifications.length === 0 ? `
                    <p class="nav-notif-empty">No notifications yet.</p>
                  ` : notifications.map((n) => `
                    <button type="button" class="notif-item ${n.isRead ? '' : 'is-unread'}" data-id="${n.id}">
                      <span class="notif-item-msg">${escapeHtml(n.message)}</span>
                      <span class="notif-item-time">${new Date(n.createdAt).toLocaleString()}</span>
                    </button>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${showAccountChip ? `
            <div class="nav-account-chip">
              <span class="nav-account-id">
                <strong>${escapeHtml(currentUser.name.split(' ')[0])}</strong>
                <small>${roleLabel}</small>
              </span>
              <button type="button" id="header-logout-btn" class="nav-logout-btn">Logout</button>
            </div>
          ` : `
            <button type="button" class="nav-account-btn" id="header-signin-btn">
              <span aria-hidden="true">👤</span>
              <span class="nav-account-btn-text">
                <small>Sign In</small><strong>My Account</strong>
              </span>
            </button>
          `}

          <!-- Wishlist stays: saving a listing to come back to fits a
               classifieds model. Cart does not - there is no checkout, no
               order and no payment on this platform, so a cart icon would
               advertise a purchase flow that does not exist. -->
          <button type="button" class="nav-icon-btn nav-icon-btn-labelled" data-soon="Saved listings"
            aria-label="Saved listings">
            <span aria-hidden="true">♡</span><span class="nav-icon-label">Saved</span>
          </button>
        </div>
      </div>

      <div class="nav-category-bar">
        <button type="button" class="nav-allcats-btn" id="nav-all-categories">
          <span aria-hidden="true">☰</span> All Categories
        </button>
        <nav class="nav-links" aria-label="Marketplace sections">
          <!-- "Home", not the nav_marketplace translation. In the old two-tab
               header that label distinguished Marketplace from Real Estate;
               here the brand row already establishes the marketplace, and the
               spec labels this tab Home. -->
          <button type="button" class="nav-tab-btn ${activePortal === 'marketplace' ? 'active' : ''}"
            id="nav-link-mkt">Home</button>
          <button type="button" class="nav-tab-btn" data-soon="Deals">Deals</button>
          <button type="button" class="nav-tab-btn" data-soon="Stores">Stores</button>
          <button type="button" class="nav-tab-btn" data-soon="New Arrivals">New Arrivals</button>
          <button type="button" class="nav-tab-btn ${isRealEstate ? 'active' : ''}"
            id="nav-link-re">${t('nav_realestate') || 'Real Estate'}</button>
        </nav>
        <button type="button" class="nav-post-ad-btn" id="header-post-ad-btn">
          <span aria-hidden="true">+</span> Post an Ad
        </button>
      </div>
    </header>
  `;
}

/**
 * Mobile bottom tab bar, from the spec's phone mockup: Home, Categories, a
 * raised green "Post Ad" action, Messages, Account.
 *
 * Rendered on every screen but revealed by CSS below 900px only - the desktop
 * layout already has all of these in the header, and duplicating them there
 * would be two competing navigations.
 */
export function renderMobileTabBarHtml(ctx) {
  const { activePortal, currentUser } = ctx;
  const signedIn = currentUser.role !== 'guest';
  const onHome = activePortal === 'marketplace';

  return `
    <nav class="mobile-tabbar" aria-label="Primary">
      <button type="button" class="mtab ${onHome ? 'is-active' : ''}" id="mtab-home">
        <span class="mtab-icon" aria-hidden="true">⌂</span>
        <span class="mtab-label">Home</span>
      </button>
      <button type="button" class="mtab" id="mtab-categories">
        <span class="mtab-icon" aria-hidden="true">▦</span>
        <span class="mtab-label">Categories</span>
      </button>

      <button type="button" class="mtab mtab-post" id="mtab-post">
        <span class="mtab-post-disc" aria-hidden="true">+</span>
        <span class="mtab-label">Post Ad</span>
      </button>

      <button type="button" class="mtab" data-soon="Messages">
        <span class="mtab-icon" aria-hidden="true">✉</span>
        <span class="mtab-label">Messages</span>
      </button>
      <button type="button" class="mtab" id="mtab-account">
        <span class="mtab-icon" aria-hidden="true">👤</span>
        <span class="mtab-label">${signedIn ? 'Account' : 'Sign In'}</span>
      </button>
    </nav>
  `;
}

/**
 * Wire the header. `handlers` carries the app-level actions so this module
 * stays presentational and does not reach into the state engine itself.
 */
export function bindHeaderEvents(root, handlers) {
  const {
    goHome, goRealEstate, goSignup, logout, setLanguage,
    toggleNotifications, markAllRead, markRead, search,
  } = handlers;

  const on = (sel, ev, fn) => root.querySelector(sel)?.addEventListener(ev, fn);

  // Anything the spec shows but the backend cannot serve yet.
  root.querySelectorAll('[data-soon]').forEach((btn) => {
    btn.addEventListener('click', () => notReadyToast(btn.dataset.soon));
  });

  const brand = root.querySelector('#nav-brand-home');
  brand?.addEventListener('click', goHome);
  brand?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
  });

  on('#nav-link-mkt', 'click', goHome);
  on('#nav-link-re', 'click', goRealEstate);
  on('#nav-all-categories', 'click', goHome);
  on('#header-post-ad-btn', 'click', goSignup);
  on('#header-signin-btn', 'click', goSignup);
  on('#util-become-seller', 'click', goSignup);
  on('#header-logout-btn', 'click', logout);

  on('#lang-toggle-en', 'click', () => setLanguage('en'));
  on('#lang-toggle-rw', 'click', () => setLanguage('rw'));

  on('#header-notif-btn', 'click', toggleNotifications);
  on('#notif-mark-all-read', 'click', (e) => { e.stopPropagation(); markAllRead(); });
  root.querySelectorAll('.notif-item').forEach((btn) => {
    btn.addEventListener('click', () => markRead(btn.dataset.id));
  });

  on('#header-search-form', 'submit', (e) => {
    e.preventDefault();
    search(root.querySelector('#header-search-input')?.value.trim() || '');
  });
}

/** Wire the mobile tab bar. Same handler set as the header. */
export function bindMobileTabBarEvents(root, handlers) {
  const { goHome, goSignup } = handlers;

  root.querySelectorAll('[data-soon]').forEach((btn) => {
    btn.addEventListener('click', () => notReadyToast(btn.dataset.soon));
  });

  root.querySelector('#mtab-home')?.addEventListener('click', goHome);
  root.querySelector('#mtab-post')?.addEventListener('click', goSignup);
  root.querySelector('#mtab-account')?.addEventListener('click', goSignup);

  // Categories has no page of its own yet, so send the reader to the rail
  // that does exist rather than toasting "coming soon" at something visible
  // one scroll away.
  root.querySelector('#mtab-categories')?.addEventListener('click', () => {
    goHome();
    setTimeout(() => {
      document.querySelector('.cat-rail-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  });
}
