/**
 * KIGALI MARKET PLATFORM - Enterprise Navigation Header & Layout
 * Supporting Bilingual Kinyarwanda & English Language Switching.
 */
import './styles/main.css';
import { stateEngine } from './store/stateEngine.js';
import { getTranslation } from './store/i18n.js';
import { renderMarketplaceView, cleanupHeroAnimation } from './modules/marketplace/MarketplaceView.js';
import { renderRealEstateView } from './modules/realestate/RealEstateView.js';
import { renderAdminDashboardView } from './modules/admin/AdminDashboardView.js';
import { renderLoginView } from './components/LoginView.js';

document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');

  function renderApp() {
    const state = stateEngine.getState();
    const activePortal = state.activePortal;
    const currentUser = state.currentUser;
    const currentLang = state.currentLang || 'en';
    const pendingApprovals = state.approvalRequests.filter(r => r.status === 'pending').length;

    const t = (key) => getTranslation(currentLang, key);

    cleanupHeroAnimation();

    // Header Mount
    const headerMount = document.getElementById('header-mount');
    if (headerMount) {
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
              <button class="nav-tab-btn ${activePortal==='marketplace'?'active':''}" id="nav-link-mkt">
                ${t('nav_marketplace')}
              </button>
              <button class="nav-tab-btn ${activePortal==='realestate'?'active':''}" id="nav-link-re" title="Gasabo Real Estate" style="padding: 3px 12px; display: inline-flex; align-items: center; justify-content: center; height: 38px; border-radius: 9999px; vertical-align: middle;">
                <img src="/real-estate-logo.png" alt="Gasabo Real Estate" style="height: 32px; width: auto; max-height: 100%; object-fit: contain; display: block;">
              </button>
            </div>

            <!-- Right Actions: Language Switcher, Search Icon, Notifications, Profile Dropdown -->
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

              <button class="nav-circle-btn" id="header-search-btn" title="Search">
                🔍
              </button>

              <button class="nav-circle-btn" id="header-notif-btn" title="Notifications" style="position: relative;">
                🔔
                ${pendingApprovals > 0 ? `<span class="action-count-badge">${pendingApprovals}</span>` : ''}
              </button>

              <!-- Profile / Role Select -->
              <div style="display: flex; align-items: center; gap: 6px; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 6px 14px; border-radius: 9999px;">
                <span style="font-size: 1rem;">👤</span>
                <select id="global-role-select" style="background: transparent; border: none; font-size: 0.85rem; font-weight: 700; color: #1E293B; cursor: pointer; outline: none;">
                  <option value="super_admin" ${currentUser.role==='super_admin'?'selected':''}>Super Admin (${escapeHtml(currentUser.name.split(' ')[0])})</option>
                  <option value="admin" ${currentUser.role==='admin'?'selected':''}>Admin</option>
                  <option value="sub_admin" ${currentUser.role==='sub_admin'?'selected':''}>Sub-Admin</option>
                  <option value="seller" ${currentUser.role==='seller'?'selected':''}>Seller (Eric)</option>
                  <option value="guest" ${currentUser.role==='guest'?'selected':''}>Visitor / Guest</option>
                </select>
              </div>
            </div>
          </div>
        </header>
      `;

      // Header Event Listeners
      headerMount.querySelector('#nav-brand-home')?.addEventListener('click', () => stateEngine.setPortal('marketplace'));
      headerMount.querySelector('#nav-link-mkt')?.addEventListener('click', () => stateEngine.setPortal('marketplace'));
      headerMount.querySelector('#nav-link-re')?.addEventListener('click', () => stateEngine.setPortal('realestate'));
      headerMount.querySelector('#nav-link-admin')?.addEventListener('click', () => stateEngine.setPortal('admin'));
      headerMount.querySelector('#nav-link-login')?.addEventListener('click', () => stateEngine.setPortal('login'));

      headerMount.querySelector('#lang-toggle-en')?.addEventListener('click', () => stateEngine.setLanguage('en'));
      headerMount.querySelector('#lang-toggle-rw')?.addEventListener('click', () => stateEngine.setLanguage('rw'));

      headerMount.querySelector('#global-role-select')?.addEventListener('change', (e) => {
        stateEngine.switchRole(e.target.value);
      });
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
