/**
 * KIGALI MARKET PLATFORM - Enterprise Navigation Header & Layout
 * Supporting Bilingual Kinyarwanda & English Language Switching.
 */
import './styles/main.css';
import { stateEngine } from './store/stateEngine.js';
import { getTranslation } from './store/i18n.js';
import { renderMarketplaceView, cleanupHeroAnimation, cleanupBannerRotation } from './modules/marketplace/MarketplaceView.js';
import { renderRealEstateView } from './modules/realestate/RealEstateView.js';
import { renderAdminDashboardView } from './modules/admin/AdminDashboardView.js';
import { renderLoginView } from './components/LoginView.js';

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

document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');

  function checkAdminRoute() {
    if (window.location.hash === ADMIN_URL_HASH) {
      stateEngine.setPortal('admin');
    }
  }
  window.addEventListener('hashchange', checkAdminRoute);
  checkAdminRoute();

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

    // Header Mount
    const headerMount = document.getElementById('header-mount');
    if (headerMount) {
      const roleLabel = {
        admin: 'Administrator',
        sub_admin: 'Sub-Administrator',
        seller: 'Seller',
        user: 'Member',
      }[currentUser.role] || '';

      headerMount.innerHTML = `
        <header class="main-navbar">
          <div class="nav-top-bar">
            <!-- Dynamic Brand Logo (Marketplace vs Real Estate) -->
            <div class="nav-brand-logo" id="nav-brand-home">
              <img src="${activePortal==='realestate' ? '/real-estate-logo.png' : '/logo.svg'}" alt="Logo" style="height: 44px; width: 44px; object-fit: contain; border-radius: ${activePortal==='realestate'?'8px':'0'}; transition: all 0.3s ease;">
              <div>
                <div style="line-height: 1; font-weight: 800; color: #032202; font-size: 1.25rem; letter-spacing: -0.02em;">
                  ${activePortal==='realestate' ? 'GASABO REAL ESTATE' : 'KIGALI MARKET'}
                </div>
                <div style="font-size: 0.72rem; font-weight: 700; color: #EDA203; letter-spacing: 0.02em;">
                  ${activePortal==='realestate' ? 'gasabo.kigalimarket.com' : 'kigalimarket.com'}
                </div>
              </div>
            </div>

            <!-- Center Navigation Links -->
            <div style="display: flex; align-items: center; gap: 1rem;">
              <button class="nav-tab-btn ${activePortal==='marketplace'?'active':''}" id="nav-link-mkt" style="display: inline-flex; align-items: center; gap: 7px;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                  <path d="M4 9l1.8-5.4A1 1 0 0 1 6.74 3h10.52a1 1 0 0 1 .94.6L20 9"></path>
                  <path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"></path>
                  <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"></path>
                  <rect x="9" y="14" width="2.5" height="2.5"></rect>
                  <path d="M15 20v-6h2v6"></path>
                </svg>
                ${t('nav_marketplace')}
              </button>
              <button class="nav-tab-btn ${activePortal==='realestate'?'active':''}" id="nav-link-re" title="Gasabo Real Estate" style="display: inline-flex; align-items: center; gap: 7px;">
                <img src="/real-estate-logo.png" alt="Gasabo Real Estate" style="height: 22px; width: 22px; object-fit: contain; border-radius: 4px; flex-shrink: 0;">
                ${t('nav_realestate')}
              </button>
            </div>

            <!-- Right Actions: Language Switcher, Notifications, Account -->
            <div class="nav-actions-group">
              <!-- BILINGUAL LANGUAGE SWITCHER TOGGLE PILL -->
              <div style="display: flex; align-items: center; background: #F1F5F9; border: 1.5px solid #CBD5E1; border-radius: 9999px; padding: 3px;">
                <button id="lang-toggle-en" style="padding: 5px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s ease; background: ${currentLang==='en'?'#034B04':'transparent'}; color: ${currentLang==='en'?'#FFFFFF':'#475569'}; box-shadow: ${currentLang==='en'?'0 2px 6px rgba(3,75,4,0.25)':'none'};">
                  🇬🇧 EN
                </button>
                <button id="lang-toggle-rw" style="padding: 5px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s ease; background: ${currentLang==='rw'?'#034B04':'transparent'}; color: ${currentLang==='rw'?'#FFFFFF':'#475569'}; box-shadow: ${currentLang==='rw'?'0 2px 6px rgba(3,75,4,0.25)':'none'};">
                  🇷🇼 KINY
                </button>
              </div>

              ${showNotifBell ? `
                <div style="position: relative;">
                  <button class="nav-circle-btn" id="header-notif-btn" title="Notifications" style="position: relative;">
                    🔔
                    ${unreadNotifCount > 0 ? `<span class="action-count-badge">${unreadNotifCount}</span>` : ''}
                  </button>
                  ${notifDropdownOpen ? `
                    <div id="notif-dropdown" style="position: absolute; top: 44px; right: 0; width: 340px; max-height: 420px; overflow-y: auto; background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 12px 32px rgba(0,0,0,0.15); z-index: 100;">
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.1rem; border-bottom: 1px solid #E2E8F0;">
                        <span style="font-weight: 800; color: #0F172A; font-size: 0.9rem;">Notifications</span>
                        ${unreadNotifCount > 0 ? `<button id="notif-mark-all-read" style="background: none; border: none; color: #2563EB; font-size: 0.78rem; font-weight: 700; cursor: pointer;">Mark all read</button>` : ''}
                      </div>
                      ${state.notifications.length === 0 ? `
                        <div style="padding: 2rem 1rem; text-align: center; color: #94A3B8; font-size: 0.85rem;">No notifications yet.</div>
                      ` : state.notifications.map(n => `
                        <button class="notif-item" data-id="${n.id}" style="display: block; width: 100%; text-align: left; padding: 0.8rem 1.1rem; border: none; border-bottom: 1px solid #F1F5F9; background: ${n.isRead ? '#fff' : '#F0FDF4'}; cursor: pointer;">
                          <div style="font-size: 0.82rem; color: #1E293B; line-height: 1.4;">${escapeHtml(n.message)}</div>
                          <div style="font-size: 0.7rem; color: #94A3B8; margin-top: 0.3rem;">${new Date(n.createdAt).toLocaleString()}</div>
                        </button>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              ${showAccountChip ? `
                <!-- Signed-in Account Chip -->
                <div style="display: flex; align-items: center; gap: 8px; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 6px 8px 6px 14px; border-radius: 9999px;">
                  <div style="line-height: 1.1;">
                    <div style="font-size: 0.82rem; font-weight: 800; color: #1E293B;">${escapeHtml(currentUser.name.split(' ')[0])}</div>
                    <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.03em;">${roleLabel}</div>
                  </div>
                  <button id="header-logout-btn" title="Log out" style="background: #2563EB; color: #fff; font-weight: 700; font-size: 0.78rem; border: none; border-radius: 9999px; padding: 0 14px; height: 34px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; transition: background 0.2s ease;">
                    ↪ Logout
                  </button>
                </div>
              ` : `
                <button class="nav-tab-btn" id="header-signup-btn" style="background: #2563EB; color: #fff; display: inline-flex; align-items: center; gap: 6px;">
                  <span style="font-size: 1.15em; font-weight: 800; line-height: 1;">+</span> Post
                </button>
              `}
            </div>
          </div>
        </header>
      `;

      // Header Event Listeners
      // Brand logo and the Marketplace tab both need to land on the actual
      // browse homepage from any page - not just flip activePortal to
      // 'marketplace' and leave state.ui.marketplaceTab wherever it was last
      // (e.g. still 'seller_portal' if the user had been on their seller
      // dashboard), which would silently do nothing since activePortal may
      // already be 'marketplace' in that case.
      const goHome = () => {
        stateEngine.setUI({ marketplaceTab: 'products' });
        stateEngine.setPortal('marketplace');
      };
      headerMount.querySelector('#nav-brand-home')?.addEventListener('click', goHome);
      headerMount.querySelector('#nav-link-mkt')?.addEventListener('click', goHome);
      headerMount.querySelector('#nav-link-re')?.addEventListener('click', () => stateEngine.setPortal('realestate'));
      headerMount.querySelector('#header-signup-btn')?.addEventListener('click', () => stateEngine.setPortal('signup'));
      headerMount.querySelector('#header-logout-btn')?.addEventListener('click', () => {
        stateEngine.logout();
        stateEngine.setPortal('marketplace');
      });

      headerMount.querySelector('#lang-toggle-en')?.addEventListener('click', () => stateEngine.setLanguage('en'));
      headerMount.querySelector('#lang-toggle-rw')?.addEventListener('click', () => stateEngine.setLanguage('rw'));

      headerMount.querySelector('#header-notif-btn')?.addEventListener('click', () => {
        notifDropdownOpen = !notifDropdownOpen;
        renderApp();
      });
      headerMount.querySelector('#notif-mark-all-read')?.addEventListener('click', (e) => {
        e.stopPropagation();
        stateEngine.markAllNotificationsRead().catch(() => {});
      });
      headerMount.querySelectorAll('.notif-item').forEach(btn => {
        btn.addEventListener('click', () => {
          stateEngine.markNotificationRead(btn.dataset.id).catch(() => {});
        });
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
