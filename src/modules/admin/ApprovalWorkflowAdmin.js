/**
 * UNIFIED ADMIN PANEL - Multi-Admin Approval Authorization Queue (Enterprise SaaS Grade)
 */
import { stateEngine } from '../../store/stateEngine.js';

export function renderApprovalWorkflowAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.approvalRequests !== undefined;

    if (!attempted) stateEngine.loadApprovals().catch(() => {});

    const requests = state.approvalRequests;
    const loading = !!state.loading.approvalRequests || !attempted;
    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const recentActivity = requests.filter(r => r.status !== 'PENDING');

    container.innerHTML = `
      <div>

        <!-- BREADCRUMB -->
        <div style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 6px;">
          <span>Admin</span>
          <span style="color: #cbd5e1;">/</span>
          <span>Security & Authorization</span>
          <span style="color: #cbd5e1;">/</span>
          <span style="color: #0f172a; font-weight: 700;">Multi-Admin Approvals</span>
        </div>

        <!-- PAGE HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.35rem;">
              <h1 class="adm-page-title">Multi-Admin Approval Authorization Queue</h1>
              <span class="adm-badge-risk">
                ${pendingRequests.length} Action Pending
              </span>
            </div>
            <p class="adm-caption" style="font-size: 15px; color: #64748b; max-width: 820px; line-height: 1.5;">
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
        <div style="background: #fff5f5; border: 1px solid #fed7d7; border-left: 5px solid #ef4444; padding: 1.25rem 1.5rem; border-radius: 12px; margin-bottom: 2.25rem; display: flex; align-items: center; gap: 1rem;">
          <div style="font-size: 1.75rem;">🚨</div>
          <div>
            <div style="font-weight: 800; font-size: 15px; color: #991b1b; margin-bottom: 2px;">
              Dual-Administrator Security Policy Active
            </div>
            <div style="font-size: 13px; color: #7f1d1d;">
              High-risk actions are locked in a pending state until confirmed by a secondary administrator with Full Administrator clearance.
            </div>
          </div>
        </div>

        <!-- SECTION: PENDING AUTHORIZATION REQUESTS -->
        <div style="margin-bottom: 3rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h2 class="adm-section-title">Pending Authorization Requests (${pendingRequests.length})</h2>
          </div>

          ${loading ? `
            <div style="text-align: center; padding: 3rem; color: #64748b;">Loading approval requests...</div>
          ` : pendingRequests.length === 0 ? `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 3.5rem 2rem; text-align: center;">
              <div style="font-size: 2.75rem; margin-bottom: 0.75rem;">✅</div>
              <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 0.35rem;">Authorization Queue Clear</h3>
              <p class="adm-caption">There are currently no high-risk administrative operations awaiting secondary approval.</p>
            </div>
          ` : pendingRequests.map(req => `
            <!-- REDESIGNED STRUCTURED APPROVAL REQUEST CARD (ENTERPRISE FOCAL POINT) -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 25px rgba(15, 23, 42, 0.06); padding: 2rem; margin-bottom: 1.5rem; transition: all 0.2s ease;">

              <!-- CARD TOP BAR: RISK BADGE + ACTION NAME + TICKET ID -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span class="adm-badge-risk">
                    ⚠️ ${escapeHtml(req.riskLevel)} RISK
                  </span>
                  <h3 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0;">
                    ${formatActionTitle(req.actionType)}
                  </h3>
                </div>

                <span style="font-family: monospace; font-size: 13px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                  Ticket #${req.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <!-- CARD BODY GRID: TARGET RESOURCE + INITIATOR DETAILS -->
              <div class="grid-2" style="gap: 1.5rem; margin-bottom: 1.5rem;">

                <!-- Target Resource Info Box -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 12px;">
                  <div class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 0.5rem;">
                    Target Resource
                  </div>
                  <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem;">
                    ${escapeHtml(req.targetName.split('(')[0].trim())}
                  </div>
                  ${req.targetId ? `
                    <div style="font-size: 13px; color: #64748b;">
                      ID: <code style="background: #e2e8f0; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${escapeHtml(req.targetId)}</code>
                    </div>
                  ` : ''}
                </div>

                <!-- Initiator Info Box -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 12px;">
                  <div class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 0.5rem;">
                    Requested By
                  </div>
                  <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem;">
                    ${escapeHtml(req.requestedByName)}
                  </div>
                  <div style="font-size: 13px; color: #64748b;">
                    Requested: <strong style="color: #334155;">${new Date(req.createdAt).toLocaleString()}</strong>
                  </div>
                </div>

              </div>

              <!-- REASON / JUSTIFICATION -->
              <div style="margin-bottom: 1.75rem;">
                <div class="adm-caption" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 0.5rem;">
                  Reason / Justification
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem 1.25rem; border-radius: 12px; font-size: 15px; color: #334155; line-height: 1.5;">
                  💬 "${escapeHtml(req.reason)}"
                </div>
              </div>

              <!-- ACTION BUTTONS BAR: APPROVE / REJECT -->
              <div style="display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 1rem; padding-top: 1rem; border-top: 1px solid #f1f5f9;">
                <div style="display: flex; gap: 0.75rem;">
                  <button class="reject-req-btn" data-id="${req.id}" style="height: 44px; padding: 0 24px; border-radius: 10px; font-weight: 800; font-size: 14px; background: #dc2626; border: none; color: #ffffff; cursor: pointer; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25); transition: all 0.2s ease;">
                    ❌ Reject Request
                  </button>

                  <button class="approve-req-btn" data-id="${req.id}" style="height: 44px; padding: 0 28px; border-radius: 10px; font-weight: 800; font-size: 14px; background: #059669; border: none; color: #ffffff; cursor: pointer; box-shadow: 0 4px 16px rgba(5, 150, 105, 0.3); transition: all 0.2s ease;">
                    ✓ Approve & Execute Action
                  </button>
                </div>
              </div>

            </div>
          `).join('')}
        </div>

        <!-- RECENT APPROVAL ACTIVITY TABLE -->
        <div>
          <h2 class="adm-section-title" style="margin-bottom: 1.25rem;">Recent Approval Activity</h2>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                  <th style="padding: 1rem 1.25rem; font-weight: 700; color: #475569;">Ticket</th>
                  <th style="padding: 1rem 1.25rem; font-weight: 700; color: #475569;">Action</th>
                  <th style="padding: 1rem 1.25rem; font-weight: 700; color: #475569;">Target Resource</th>
                  <th style="padding: 1rem 1.25rem; font-weight: 700; color: #475569;">Requested By</th>
                  <th style="padding: 1rem 1.25rem; font-weight: 700; color: #475569;">Timestamp</th>
                  <th style="padding: 1rem 1.25rem; font-weight: 700; color: #475569;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${recentActivity.length === 0 ? `
                  <tr>
                    <td colspan="6" style="padding: 2.5rem; text-align: center; color: #64748b;">
                      No historical approval activity recorded yet.
                    </td>
                  </tr>
                ` : recentActivity.map(req => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 1rem 1.25rem; font-family: monospace; font-weight: 700; color: #475569;">#${req.id.slice(0, 8).toUpperCase()}</td>
                    <td style="padding: 1rem 1.25rem; font-weight: 700; color: #0f172a;">${formatActionTitle(req.actionType)}</td>
                    <td style="padding: 1rem 1.25rem; color: #334155;">${escapeHtml(req.targetName)}</td>
                    <td style="padding: 1rem 1.25rem; color: #334155;">${escapeHtml(req.requestedByName)}</td>
                    <td style="padding: 1rem 1.25rem; color: #64748b; font-size: 13px;">${new Date(req.createdAt).toLocaleString()}</td>
                    <td style="padding: 1rem 1.25rem;">
                      ${req.status === 'APPROVED' ? `<span class="adm-badge-success">✓ AUTHORIZED</span>` : `<span class="adm-badge-risk">❌ REJECTED</span>`}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // EVENT LISTENERS
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
