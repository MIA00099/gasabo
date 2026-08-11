/**
 * UNIFIED ADMIN PANEL - Multi-Admin Approval Authorization Queue (Enterprise SaaS Grade)
 */
import { stateEngine } from '../../store/stateEngine.js';

// Module scope, not a render() local - this panel gets fully rebuilt on every
// stateEngine notify (any state change anywhere re-renders whichever admin
// tab is open), which would collapse an expanded card back to closed the
// instant anything else in the app changed while it was open.
const expandedRequestIds = new Set();

export function renderApprovalWorkflowAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.approvalRequests !== undefined;

    if (!attempted) stateEngine.loadApprovals().catch(() => {});

    const requests = state.approvalRequests;
    const loading = !!state.loading.approvalRequests || !attempted;
    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const recentActivity = requests.filter(r => r.status !== 'PENDING');
    const subTab = state.ui.approvalSubTab || 'pending';

    container.innerHTML = `
      <div>

        <!-- BREADCRUMB -->
        <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 6px;">
          <span>Admin</span>
          <span style="color: #cbd5e1;">/</span>
          <span>Security & Authorization</span>
          <span style="color: #cbd5e1;">/</span>
          <span style="color: #0f172a; font-weight: 700;">Multi-Admin Approvals</span>
        </div>

        <!-- PAGE HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.3rem;">
              <h1 class="adm-page-title" style="font-size: 22px;">Multi-Admin Approval Authorization Queue</h1>
              <span class="adm-badge-risk">
                ${pendingRequests.length} Action Pending
              </span>
            </div>
            <p class="adm-caption" style="font-size: 13px; color: #64748b; max-width: 820px; line-height: 1.45;">
              Sensitive platform operations (e.g., deleting seller accounts, deleting categories, changing RBAC permissions) require explicit dual-authorization from a second administrator before execution.
            </p>
          </div>
        </div>

        ${state.error ? `
          <div style="background: #fff5f5; border: 1px solid #fecaca; color: #991b1b; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
            ⚠️ ${escapeHtml(state.error)}
          </div>
        ` : ''}

        <!-- CRITICAL SECURITY ALERT BANNER -->
        <div style="background: #fff5f5; border: 1px solid #fed7d7; border-left: 4px solid #ef4444; padding: 0.9rem 1.1rem; border-radius: 14px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.85rem;">
          <div style="font-size: 1.35rem;">🚨</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: #991b1b; margin-bottom: 1px;">
              Dual-Administrator Security Policy Active
            </div>
            <div style="font-size: 12px; color: #7f1d1d;">
              High-risk actions are locked in a pending state until confirmed by a secondary administrator with Full Administrator clearance.
            </div>
          </div>
        </div>

        <!-- SUB-TAB SWITCHER: Pending Requests vs Approval History - two
             separate views instead of stacking both on one long page. -->
        <div style="display: flex; gap: 0.5rem; background: #F1F5F9; padding: 4px; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 1.25rem; width: fit-content;">
          <button id="approval-tab-pending" class="btn btn-sm" style="color:${subTab==='pending'?'#fff':'#64748B'}; background:${subTab==='pending'?'var(--primary)':'transparent'};">
            🕒 Pending (${pendingRequests.length})
          </button>
          <button id="approval-tab-history" class="btn btn-sm" style="color:${subTab==='history'?'#fff':'#64748B'}; background:${subTab==='history'?'var(--primary)':'transparent'};">
            📜 History (${recentActivity.length})
          </button>
        </div>

        ${subTab === 'pending' ? `
        <!-- SECTION: PENDING AUTHORIZATION REQUESTS -->
        <div>
          ${loading ? `
            <div style="text-align: center; padding: 2rem; color: #64748b;">Loading approval requests...</div>
          ` : pendingRequests.length === 0 ? `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 2.25rem 1.5rem; text-align: center;">
              <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">✅</div>
              <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 0.3rem;">Authorization Queue Clear</h3>
              <p class="adm-caption">There are currently no high-risk administrative operations awaiting secondary approval.</p>
            </div>
          ` : pendingRequests.map(req => {
            const isExpanded = expandedRequestIds.has(req.id);
            return `
            <!-- COLLAPSED-BY-DEFAULT APPROVAL CARD - one compact summary row with
                 Target/Requester/Reason hidden behind "Details" instead of always
                 showing every field at full size for every pending item at once. -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04); margin-bottom: 0.6rem; overflow: hidden;">

              <!-- SUMMARY ROW: always visible, everything needed to act in one glance -->
              <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; flex-wrap: wrap;">
                <span class="adm-badge-risk" style="flex-shrink: 0;">⚠️ ${escapeHtml(req.riskLevel)}</span>

                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 14px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${formatActionTitle(req.actionType)}
                  </div>
                  <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(req.targetName.split('(')[0].trim())} · requested by ${escapeHtml(req.requestedByName)}
                  </div>
                </div>

                <button class="toggle-details-btn" data-id="${req.id}" style="flex-shrink: 0; background: #F1F5F9; border: 1px solid #E2E8F0; color: #475569; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; cursor: pointer;">
                  ${isExpanded ? 'Hide Details ▴' : 'Details ▾'}
                </button>

                <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                  <button class="reject-req-btn" data-id="${req.id}" style="height: 32px; padding: 0 14px; border-radius: 9999px; font-weight: 800; font-size: 12px; background: #dc2626; border: none; color: #ffffff; cursor: pointer;">
                    ❌ Reject
                  </button>
                  <button class="approve-req-btn" data-id="${req.id}" style="height: 32px; padding: 0 16px; border-radius: 9999px; font-weight: 800; font-size: 12px; background: #059669; border: none; color: #ffffff; cursor: pointer;">
                    ✓ Approve
                  </button>
                </div>
              </div>

              ${isExpanded ? `
                <!-- EXPANDED DETAILS - only rendered when toggled open -->
                <div style="padding: 0 1rem 1rem 1rem; border-top: 1px solid #f1f5f9;">
                  <div style="display: flex; justify-content: flex-end; padding-top: 0.6rem; margin-bottom: 0.6rem;">
                    <span style="font-family: monospace; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 2px 9px; border-radius: 8px; border: 1px solid #e2e8f0;">
                      Ticket #${req.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div class="grid-2" style="gap: 0.75rem; margin-bottom: 0.75rem;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem 0.9rem; border-radius: 12px;">
                      <div class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 0.3rem; font-size: 10px;">Target Resource</div>
                      <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 0.15rem;">${escapeHtml(req.targetName.split('(')[0].trim())}</div>
                      ${req.targetId ? `<div style="font-size: 11px; color: #64748b;">ID: <code style="background: #e2e8f0; color: #0f172a; padding: 1px 5px; border-radius: 4px; font-size: 10px;">${escapeHtml(req.targetId)}</code></div>` : ''}
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem 0.9rem; border-radius: 12px;">
                      <div class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 0.3rem; font-size: 10px;">Requested By</div>
                      <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 0.15rem;">${escapeHtml(req.requestedByName)}</div>
                      <div style="font-size: 11px; color: #64748b;">${new Date(req.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div>
                    <div class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 0.3rem; font-size: 10px;">Reason / Justification</div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.6rem 0.9rem; border-radius: 12px; font-size: 12px; color: #334155; line-height: 1.5;">
                      💬 "${escapeHtml(req.reason)}"
                    </div>
                  </div>
                </div>
              ` : ''}

            </div>
          `;}).join('')}
        </div>
        ` : `
        <!-- RECENT APPROVAL ACTIVITY TABLE -->
        <div>
          <div class="custom-table-container" style="box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Action</th>
                  <th>Target Resource</th>
                  <th>Requested By</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${recentActivity.length === 0 ? `
                  <tr>
                    <td colspan="6" style="padding: 2rem; text-align: center; color: #64748b;">
                      No historical approval activity recorded yet.
                    </td>
                  </tr>
                ` : recentActivity.map(req => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #475569;">#${req.id.slice(0, 8).toUpperCase()}</td>
                    <td style="font-weight: 700; color: #0f172a;">${formatActionTitle(req.actionType)}</td>
                    <td style="color: #334155;">${escapeHtml(req.targetName)}</td>
                    <td style="color: #334155;">${escapeHtml(req.requestedByName)}</td>
                    <td style="color: #64748b; font-size: 12px;">${new Date(req.createdAt).toLocaleString()}</td>
                    <td>
                      ${req.status === 'APPROVED' ? `<span class="adm-badge-success">✓ AUTHORIZED</span>` : `<span class="adm-badge-risk">❌ REJECTED</span>`}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        `}

      </div>
    `;

    // EVENT LISTENERS
    container.querySelector('#approval-tab-pending')?.addEventListener('click', () => stateEngine.setUI({ approvalSubTab: 'pending' }));
    container.querySelector('#approval-tab-history')?.addEventListener('click', () => stateEngine.setUI({ approvalSubTab: 'history' }));

    container.querySelectorAll('.toggle-details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (expandedRequestIds.has(id)) expandedRequestIds.delete(id);
        else expandedRequestIds.add(id);
        render();
      });
    });

    container.querySelectorAll('.approve-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.id;
        const req = requests.find(r => r.id === reqId);
        if (confirm(`Authorize execution of action "${formatActionTitle(req?.actionType)}"? This action will be executed immediately.`)) {
          try {
            await stateEngine.approveRequest(reqId);
            alert('Action authorized and executed successfully! Audit log entry recorded.');
          } catch (err) {
            render();
          }
        }
      });
    });

    container.querySelectorAll('.reject-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.id;
        const req = requests.find(r => r.id === reqId);
        if (confirm(`Reject authorization request "${formatActionTitle(req?.actionType)}"?`)) {
          try {
            await stateEngine.rejectRequest(reqId);
            alert('Authorization request rejected.');
          } catch (err) {
            render();
          }
        }
      });
    });
  }

  render();
}

function formatActionTitle(actionType) {
  if (!actionType) return 'Administrative Action';
  return actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
