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
    // Backend status values are uppercase ('PENDING'/'APPROVED'/'REJECTED' -
    // see approvals.routes.ts and ApprovalWorkflowAdmin.js, which already
    // compared correctly). This file compared against lowercase 'pending',
    // which never matches anything - pendingReqs was always empty, so the
    // sidebar badge and all three approval-related dashboard cards below
    // silently showed 0/nothing no matter how many requests were actually
    // waiting. That's the real explanation behind "I gave the sub-admin a
    // role and nothing happened" - the request WAS created (confirmed via
    // direct API testing), there was just no visible sign of it anywhere
    // outside the Multi-Admin Approvals tab itself.
    const pendingReqs = state.approvalRequests.filter(r => r.status === 'PENDING');
    const highRiskCount = pendingReqs.filter(r => r.riskLevel === 'HIGH').length;
    const completedTodayCount = state.approvalRequests.filter(r => r.status !== 'PENDING').length;

    // Pending product listings were only ever loaded once someone actually
    // opened Marketplace Management's own Pending Approval sub-tab - which
    // meant the sidebar had no way to show a count, and a real admin
    // reported not seeing anything to approve even though the queue had
    // items the whole time. Loading it here too (same eventual-consistency
    // pattern as notifications in main.js) means the badge below is
    // accurate before anyone has ever clicked into that tab.
    //
    // Excludes the full Administrator role - moderation is reserved for a
    // Sub-Administrator holding product_approval only (see MarketplaceAdmin.js
    // and requireExclusivePermission in server/src/middleware/auth.ts), so
    // loading/badging a queue the Administrator can no longer act on would
    // just be a red counter with nothing they can do about it.
    const isFullAdmin = currentUser.role === 'admin';
    if (!isFullAdmin && currentUser.permissions?.product_approval && state.loading.pendingProducts === undefined) {
      stateEngine.loadPendingProducts().catch(() => {});
    }
    const pendingProductsCount = isFullAdmin ? 0 : (state.pendingProducts?.length || 0);

    // Mirrors the server-side requirePermission() checks (server/src/middleware/auth.ts) -
    // that's the real security boundary; this just keeps a Sub-Administrator from
    // clicking into a panel that will 403 on every action inside it. "Multi-Admin
    // Approvals" is the oversight mechanism itself, not a module, so it's never hidden.
    const perms = currentUser.permissions || {};
    const tabAccess = {
      approvals: true,
      marketplace: !!(perms.product_mgmt || perms.category_mgmt || perms.banner_mgmt || perms.product_approval),
      sellers: !!perms.seller_mgmt,
      realestate: !!perms.realestate_content,
      rbac: !!perms.user_mgmt,
      audit: !!perms.system_settings,
    };
    let activeTab = state.ui.adminTab || 'approvals';
    if (!tabAccess[activeTab]) activeTab = 'approvals';

    container.innerHTML = `
      <div class="adm-layout-wrap">

        <!-- SIDEBAR: near-black panel, flush against the true left edge of the
             screen (sticky + full viewport height), active item shown as a
             solid blue pill. Lives outside the padded/centered main column
             below so nothing puts a gray gap between it and the edge. -->
        <div class="adm-sidebar-dark">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1rem; padding: 0 0.5rem;">
              Administration Control
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              <button class="adm-side-btn ${activeTab==='approvals'?'active':''}" data-tab="approvals">
                <span>🛡️ Multi-Admin Approvals</span>
                ${pendingReqs.length > 0 ? `
                  <span style="background: #dc2626; color: #ffffff; position: absolute; right: 12px; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 9999px;">${pendingReqs.length}</span>
                ` : ''}
              </button>

              ${tabAccess.marketplace ? `
                <button class="adm-side-btn ${activeTab==='marketplace'?'active':''}" data-tab="marketplace">
                  <span>🛒 Marketplace Management</span>
                  ${pendingProductsCount > 0 ? `
                    <span style="background: #dc2626; color: #ffffff; position: absolute; right: 12px; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 9999px;">${pendingProductsCount}</span>
                  ` : ''}
                </button>
              ` : ''}

              ${tabAccess.sellers ? `
                <button class="adm-side-btn ${activeTab==='sellers'?'active':''}" data-tab="sellers">
                  <span>👥 Sellers Directory</span>
                </button>
              ` : ''}

              ${tabAccess.realestate ? `
                <button class="adm-side-btn ${activeTab==='realestate'?'active':''}" data-tab="realestate">
                  <span>🏢 Real Estate CMS</span>
                </button>
              ` : ''}

              ${tabAccess.rbac ? `
                <button class="adm-side-btn ${activeTab==='rbac'?'active':''}" data-tab="rbac">
                  <span>🔐 User RBAC & Roles</span>
                </button>
              ` : ''}

              ${tabAccess.audit ? `
                <button class="adm-side-btn ${activeTab==='audit'?'active':''}" data-tab="audit">
                  <span>📜 Audit Logs & Backups</span>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="adm-sidebar-footer" style="padding: 1rem 0.5rem 0 0.5rem; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #64748B;">
            <div style="font-weight: 700; color: #ffffff; margin-bottom: 2px;">${escapeHtml(currentUser.name)}</div>
            <div style="text-transform: uppercase; font-size: 10px; font-weight: 800; color: #4ADE80;">● ${currentUser.role.replace('_', ' ')}</div>
            <button id="adm-logout-btn" style="margin-top: 0.75rem; width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #ffffff; padding: 6px 0; border-radius: 9999px; font-size: 11px; font-weight: 700; cursor: pointer;">
              ↪ Log Out
            </button>
          </div>
        </div>

        <!-- MAIN COLUMN: keeps its own padding/max-width centering, independent
             of the sidebar so the sidebar can stay flush left. -->
        <div class="adm-main-col">
        <div class="adm-main-inner">

          <!-- OVERVIEW CARDS (4 Grid Layout matching Enterprise Spec) - compact
               padding (1.1rem, vs .adm-card-white's default 1.5rem used by the
               big content card below) so this row reads as a short strip like
               the reference, not a second full-height block. -->
          <div class="grid-4" style="margin-bottom: 1.5rem; gap: 1.1rem;">

            <!-- Card 1: Pending Approvals (featured - translucent blue glass,
                 not a flat fill, so it reads as tinted glass rather than a
                 solid block sitting oddly among the other glass cards). -->
            <div class="adm-card-white" style="background: linear-gradient(135deg, rgba(0,61,165,0.82), rgba(0,49,132,0.88)); border-color: rgba(255,255,255,0.25); padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
                <span class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: rgba(255,255,255,0.75);">Pending Approvals</span>
                <span style="width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.18); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">↗</span>
              </div>
              <div class="adm-metric-number" style="color: #ffffff; font-size: 34px;">${pendingReqs.length}</div>
              <div class="adm-caption" style="margin-top: 0.4rem; color: rgba(255,255,255,0.75);">Multi-Admin Approval Requests</div>
            </div>

            <!-- Card 2: High Risk Requests -->
            <div class="adm-card-white" style="padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
                <span class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">High Risk Requests</span>
                <span style="width: 24px; height: 24px; border-radius: 50%; background: #FEF3C7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">↗</span>
              </div>
              <div class="adm-metric-number" style="color: #d97706; font-size: 34px;">${highRiskCount}</div>
              <div class="adm-caption" style="margin-top: 0.4rem; color: #64748b;">Requires Dual Authorization</div>
            </div>

            <!-- Card 3: Awaiting Review -->
            <div class="adm-card-white" style="padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
                <span class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Awaiting Review</span>
                <span style="width: 24px; height: 24px; border-radius: 50%; background: #DBEAFE; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">↗</span>
              </div>
              <div class="adm-metric-number" style="color: var(--primary); font-size: 34px;">${pendingReqs.length}</div>
              <div class="adm-caption" style="margin-top: 0.4rem; color: #64748b;">Pending Secondary Admin Verification</div>
            </div>

            <!-- Card 4: Completed Today -->
            <div class="adm-card-white" style="padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
                <span class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Completed Today</span>
                <span style="width: 24px; height: 24px; border-radius: 50%; background: #DCFCE7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">↗</span>
              </div>
              <div class="adm-metric-number" style="color: #16a34a; font-size: 34px;">${completedTodayCount}</div>
              <div class="adm-caption" style="margin-top: 0.4rem; color: #64748b;">Authorized Administrative Actions</div>
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
