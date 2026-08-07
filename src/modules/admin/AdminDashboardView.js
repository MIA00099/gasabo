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
  function update() {
    const state = stateEngine.getState();
    const submitting = !!state.loading.auth;
    const errorMessage = state.error;

    container.innerHTML = `
      <div style="max-width: 440px; margin: 4rem auto; padding: 0 1rem;">
        <div class="glass-panel" style="padding: 2.2rem; border-radius: var(--radius-lg); border: 1px solid rgba(255,255,255,0.12); background: #0f172a;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔐</div>
            <h2 style="font-size: 1.5rem; color: #fff; margin-bottom: 0.4rem;">Administration Access</h2>
            <p style="color: #94a3b8; font-size: 0.88rem;">Sign in with your Administrator or Sub-Administrator credentials.</p>
          </div>

          ${errorMessage ? `
            <div style="background: rgba(220,38,38,0.15); border: 1px solid rgba(248,113,113,0.5); color: #fecaca; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.25rem;">
              ⚠️ ${escapeHtml(errorMessage)}
            </div>
          ` : ''}

          <form id="admin-login-form">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label style="display:block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">Email Address</label>
              <input type="email" id="adm-email" class="form-control" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #fff;">
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label style="display:block; font-size: 0.85rem; font-weight: 600; color: #E2E8F0; margin-bottom: 0.4rem;">Password</label>
              <input type="password" id="adm-password" class="form-control" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #fff;">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem; font-weight: 700;" ${submitting ? 'disabled' : ''}>
              ${submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    `;

    container.querySelector('#admin-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = container.querySelector('#adm-email').value;
      const password = container.querySelector('#adm-password').value;
      try {
        await stateEngine.login(email, password);
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
