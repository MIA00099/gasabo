/**
 * UNIFIED ADMIN PANEL - Master Dashboard Container (Stripe/Linear/Vercel Enterprise Grade)
 */
import { stateEngine } from '../../store/stateEngine.js';
import { getLargeFooterHtml, bindLargeFooterEvents, initSlimStickyFooter } from '../../components/Footer.js';
import { renderMarketplaceAdmin } from './MarketplaceAdmin.js';
import { renderSellerAdmin } from './SellerAdmin.js';
import { renderRealEstateAdmin } from './RealEstateAdmin.js';
import { renderApprovalWorkflowAdmin } from './ApprovalWorkflowAdmin.js';
import { renderUserRBACAdmin } from './UserRBACAdmin.js';
import { renderSecurityAuditAdmin } from './SecurityAuditAdmin.js';

export function renderAdminDashboardView(container) {
  const state = stateEngine.getState();

  // The admin panel used to be reachable with zero authentication - anyone who
  // navigated here got full access. It now requires a real Administrator or
  // Sub-Administrator session before rendering anything sensitive.
  if (!stateEngine.isAdmin()) {
    renderAdminLoginGate(container);
    return;
  }

  function render() {
    const state = stateEngine.getState();
    const currentUser = state.currentUser;
    const activeTab = state.ui.adminTab || 'approvals';
    const pendingReqs = state.approvalRequests.filter(r => r.status === 'pending');
    const highRiskCount = pendingReqs.filter(r => r.riskLevel === 'HIGH').length;
    const completedTodayCount = state.approvalRequests.filter(r => r.status !== 'pending').length;

    container.innerHTML = `
      <div class="adm-layout-wrap">
        <div style="max-width: 1440px; margin: 0 auto; padding: 2.5rem 1.5rem;">

          <!-- OVERVIEW CARDS (4 Grid Layout matching Enterprise Spec) -->
          <div class="grid-4" style="margin-bottom: 2rem; gap: 1.25rem;">

            <!-- Card 1: Pending Approvals -->
            <div class="adm-card-white">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Pending Approvals</span>
                <span class="adm-badge-risk">Action Required</span>
              </div>
              <div class="adm-metric-number" style="color: #dc2626;">${pendingReqs.length}</div>
              <div class="adm-caption" style="margin-top: 0.5rem; color: #64748b;">Multi-Admin Approval Requests</div>
            </div>

            <!-- Card 2: High Risk Requests -->
            <div class="adm-card-white">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">High Risk Requests</span>
                <span class="adm-badge-warning">Security Risk</span>
              </div>
              <div class="adm-metric-number" style="color: #d97706;">${highRiskCount}</div>
              <div class="adm-caption" style="margin-top: 0.5rem; color: #64748b;">Requires Dual Authorization</div>
            </div>

            <!-- Card 3: Awaiting Review -->
            <div class="adm-card-white">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Awaiting Review</span>
                <span class="adm-badge-info">Secondary Check</span>
              </div>
              <div class="adm-metric-number" style="color: #2563eb;">${pendingReqs.length}</div>
              <div class="adm-caption" style="margin-top: 0.5rem; color: #64748b;">Pending Secondary Admin Verification</div>
            </div>

            <!-- Card 4: Completed Today -->
            <div class="adm-card-white">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Completed Today</span>
                <span class="adm-badge-success">Audit Logged</span>
              </div>
              <div class="adm-metric-number" style="color: #16a34a;">${completedTodayCount}</div>
              <div class="adm-caption" style="margin-top: 0.5rem; color: #64748b;">Authorized Administrative Actions</div>
            </div>

          </div>

          <!-- MAIN LAYOUT: DARK CHARCOAL SIDEBAR + PURE WHITE CONTENT CARD -->
          <div class="grid-4" style="grid-template-columns: 280px 1fr; gap: 1.75rem; align-items: start;">

            <!-- SIDEBAR: DARK CHARCOAL (#0f172a) WITH MINIMAL THIN ACTIVE INDICATOR -->
            <div class="adm-sidebar-dark">
              <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1rem; padding: 0 0.5rem;">
                Administration Control
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                <button class="adm-side-btn ${activeTab==='approvals'?'active':''}" data-tab="approvals">
                  <span>🛡️ Multi-Admin Approvals</span>
                  ${pendingReqs.length > 0 ? `
                    <span style="background: #dc2626; color: #ffffff; position: absolute; right: 12px; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 9999px;">${pendingReqs.length}</span>
                  ` : ''}
                </button>

                <button class="adm-side-btn ${activeTab==='marketplace'?'active':''}" data-tab="marketplace">
                  <span>🛒 Marketplace Management</span>
                </button>

                <button class="adm-side-btn ${activeTab==='sellers'?'active':''}" data-tab="sellers">
                  <span>👥 Sellers Directory</span>
                </button>

                <button class="adm-side-btn ${activeTab==='realestate'?'active':''}" data-tab="realestate">
                  <span>🏢 Real Estate CMS</span>
                </button>

                <button class="adm-side-btn ${activeTab==='rbac'?'active':''}" data-tab="rbac">
                  <span>🔐 User RBAC & Roles</span>
                </button>

                <button class="adm-side-btn ${activeTab==='audit'?'active':''}" data-tab="audit">
                  <span>📜 Audit Logs & Backups</span>
                </button>
              </div>

              <div style="margin-top: 2rem; padding: 1rem 0.5rem 0 0.5rem; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #64748b;">
                <div style="font-weight: 700; color: #94a3b8; margin-bottom: 2px;">${escapeHtml(currentUser.name)}</div>
                <div style="text-transform: uppercase; font-size: 10px; font-weight: 800; color: #10b981;">● ${currentUser.role.replace('_', ' ')}</div>
                <button id="adm-logout-btn" style="margin-top: 0.75rem; width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; padding: 6px 0; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                  ↪ Log Out
                </button>
              </div>
            </div>

            <!-- DYNAMIC ADMIN CONTENT MOUNT (PURE WHITE CARD) -->
            <div class="adm-card-white" style="padding: 2.25rem;">
              <div id="admin-module-mount"></div>
            </div>

          </div>
        </div>
      </div>
      ${getLargeFooterHtml(state.currentLang || 'en')}
    `;

    bindLargeFooterEvents(container);
    initSlimStickyFooter();

    // Tab switcher handlers
    container.querySelectorAll('.adm-side-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        stateEngine.setUI({ adminTab: btn.dataset.tab });
      });
    });

    container.querySelector('#adm-logout-btn')?.addEventListener('click', () => {
      stateEngine.logout();
      stateEngine.setPortal('marketplace');
    });

    // Mount sub-module
    const mount = container.querySelector('#admin-module-mount');
    if (activeTab === 'approvals') renderApprovalWorkflowAdmin(mount);
    else if (activeTab === 'marketplace') renderMarketplaceAdmin(mount);
    else if (activeTab === 'sellers') renderSellerAdmin(mount);
    else if (activeTab === 'realestate') renderRealEstateAdmin(mount);
    else if (activeTab === 'rbac') renderUserRBACAdmin(mount);
    else if (activeTab === 'audit') renderSecurityAuditAdmin(mount);
  }

  render();
}

function renderAdminLoginGate(container) {
  // Reuses the same glass-login-* visual language as the public Login/Sign Up
  // page (LoginView.js) rather than a separately-styled dark panel, so admins
  // land on a UI that's visually consistent with the rest of the site.
  let showPassword = false;
  let formData = { email: '', password: '' };

  function captureInputs() {
    const emailInput = container.querySelector('#adm-email');
    if (emailInput) formData.email = emailInput.value;
    const passInput = container.querySelector('#adm-password');
    if (passInput) formData.password = passInput.value;
  }

  function update() {
    const state = stateEngine.getState();
    const submitting = !!state.loading.auth;
    const errorMessage = state.error;

    container.innerHTML = `
      <div class="glass-login-viewport">
        <div class="glass-login-card">
          <div class="glass-login-header">
            <h1 class="glass-login-title">Admin Access</h1>
            <p class="glass-login-subtitle">Sign in with your Administrator or Sub-Administrator credentials.</p>
          </div>

          ${errorMessage ? `
            <div style="background: rgba(220,38,38,0.25); border: 1px solid rgba(248,113,113,0.6); color: #ffffff; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.25rem;">
              ⚠️ ${escapeHtml(errorMessage)}
            </div>
          ` : ''}

          <form id="admin-login-form" autocomplete="off">
            <div class="glass-input-group">
              <input
                type="email"
                id="adm-email"
                class="glass-input-field"
                placeholder="Email Address"
                value="${escapeHtml(formData.email)}"
                required
              />
              <div class="glass-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
            </div>

            <div class="glass-input-group">
              <input
                type="${showPassword ? 'text' : 'password'}"
                id="adm-password"
                class="glass-input-field"
                placeholder="Password"
                value="${escapeHtml(formData.password)}"
                required
              />
              <button
                type="button"
                id="toggle-admin-password-btn"
                class="glass-input-icon clickable"
                title="${showPassword ? 'Hide password' : 'Show password'}"
                aria-label="${showPassword ? 'Hide password' : 'Show password'}"
              >
                ${showPassword ? `
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ` : `
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                `}
              </button>
            </div>

            <button type="submit" class="glass-btn-primary" ${submitting ? 'disabled' : ''}>
              ${submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    `;

    container.querySelector('#toggle-admin-password-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      captureInputs();
      showPassword = !showPassword;
      update();
    });

    container.querySelector('#admin-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      captureInputs();
      try {
        await stateEngine.login(formData.email, formData.password);
        // A successful login updates currentUser; if it's not an admin role,
        // stateEngine.isAdmin() will be false and re-entering this view next
        // render will show the gate again rather than granting access.
        if (!stateEngine.isAdmin()) {
          stateEngine.logout();
          stateEngine.data.error = 'That account does not have administrator access.';
          stateEngine.notify();
        }
      } catch (err) {
        update();
      }
    });
  }

  update();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
