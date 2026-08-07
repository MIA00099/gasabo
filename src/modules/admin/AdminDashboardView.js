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
  let activeTab = 'approvals'; // 'approvals' | 'marketplace' | 'sellers' | 'realestate' | 'rbac' | 'audit'

  function render() {
    const state = stateEngine.getState();
    const currentUser = state.currentUser;
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
        activeTab = btn.dataset.tab;
        render();
      });
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
