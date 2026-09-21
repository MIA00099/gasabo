/**
 * UNIFIED ADMIN PANEL - Seller Management Module
 */
import { stateEngine } from '../../store/stateEngine.js';
import { showAdminConfirm, showAdminForm, showAdminToast } from './adminDialog.js';

let resettingSellerId = null;
let passwordResetResult = null;

export function renderSellerAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.sellers !== undefined;

    if (!attempted) stateEngine.loadSellers().catch(() => {});

    const sellers = state.sellers;
    const loading = !!state.loading.sellers || !attempted;

    container.innerHTML = `
      <div>
        <div class="adm-module-header">
          <div>
            <h2 class="adm-module-title">Registered sellers</h2>
            <p class="adm-module-copy">
              Manage verified Rwandan sellers, suspend accounts, reset credentials, and review activity logs. Deleting sellers requires multi-admin approval.
            </p>
          </div>
        </div>

        ${state.error ? `
          <div class="adm-inline-alert">
            <strong>Seller management error</strong>
            ${escapeHtml(state.error)}
          </div>
        ` : ''}

        ${passwordResetResult ? `
          <div id="seller-reset-result" style="background:#F0FDF4;border:1px solid #BBF7D0;color:#14532D;padding:1rem 1.25rem;border-radius:12px;margin-bottom:1.5rem;">
            <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
              <div>
                <div style="font-size:0.92rem;font-weight:800;">Temporary password for ${escapeHtml(passwordResetResult.name)}</div>
                <div style="font-size:0.8rem;color:#166534;margin-top:0.25rem;">Give this password to the seller. They can sign in with it, then change it from Account settings.</div>
              </div>
              <button id="seller-reset-dismiss" type="button" style="border:none;background:transparent;color:#166534;font-weight:800;cursor:pointer;font-size:0.8rem;">Dismiss</button>
            </div>
            <div style="display:flex;gap:0.75rem;align-items:center;margin-top:0.75rem;flex-wrap:wrap;">
              <code id="seller-reset-password-value" style="background:#fff;border:1px solid #86EFAC;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.95rem;font-weight:800;color:#0F172A;letter-spacing:0.02em;">${escapeHtml(passwordResetResult.tempPassword)}</code>
              <button id="seller-reset-copy" type="button" style="background:#04562D;color:#fff;border:none;border-radius:8px;padding:0.5rem 0.8rem;font-weight:800;font-size:0.8rem;cursor:pointer;">Copy password</button>
            </div>
          </div>
        ` : ''}

        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Seller Profile</th>
                <th>Contact Info</th>
                <th>District</th>
                <th>Active Listings</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th class="tbl-actions-col">Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              ${loading ? `
                <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading sellers...</td></tr>
              ` : sellers.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No sellers registered yet.</td></tr>
              ` : sellers.map(s => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary); color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                        ${s.name.charAt(0)}
                      </div>
                      <div>
                        <div style="font-weight: 600; color: #0F172A;">${escapeHtml(s.name)}</div>
                        <div style="font-size: 0.78rem; color: #64748B;">ID: ${s.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 0.85rem; color: #0F172A;">${escapeHtml(s.phone || '-')}</div>
                    <div style="font-size: 0.78rem; color: #64748B;">${escapeHtml(s.email)}</div>
                  </td>
                  <td>${escapeHtml(s.district || '-')}</td>
                  <td><strong style="color: var(--primary);">${s.productsCount} Products</strong></td>
                  <td>
                    <span class="badge ${s.status==='active'?'badge-active':'badge-expired'}">
                      ${s.status.toUpperCase()}
                    </span>
                  </td>
                  <td>${new Date(s.joinedDate).toLocaleDateString()}</td>
                  <td class="tbl-actions-col">
                    <div class="adm-action-group">
                      <button class="btn btn-sm btn-secondary reset-pass-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" ${resettingSellerId === s.id ? 'disabled' : ''}>
                        ${resettingSellerId === s.id ? 'Resetting...' : 'Reset password'}
                      </button>
                      <button class="btn btn-sm btn-secondary change-email-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" data-email="${escapeHtml(s.email)}">
                        Change email
                      </button>
                      <button class="btn btn-sm toggle-status-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" style="background:${s.status==='active'?'#FEF3C7':'#DCFCE7'}; color:${s.status==='active'?'#92400E':'#166534'}; border:1px solid ${s.status==='active'?'#FDE68A':'#BBF7D0'};">
                        ${s.status==='active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button class="btn btn-sm btn-danger del-seller-req-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" title="Requires approval from another Administrator before it takes effect">
                        Request deletion
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event Handlers
    container.querySelector('#seller-reset-dismiss')?.addEventListener('click', () => {
      passwordResetResult = null;
      render();
    });

    container.querySelector('#seller-reset-copy')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const value = container.querySelector('#seller-reset-password-value')?.textContent || '';
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        btn.textContent = 'Copied';
      } catch {
        btn.textContent = 'Select password';
      }
    });

    container.querySelectorAll('.reset-pass-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (resettingSellerId) return;
        resettingSellerId = btn.dataset.id;
        passwordResetResult = null;
        render();
        try {
          const result = await stateEngine.resetSellerPassword(btn.dataset.id);
          passwordResetResult = {
            name: btn.dataset.name,
            tempPassword: result.tempPassword,
          };
        } catch (err) {
          // stateEngine exposes the server message in state.error; the final
          // render below paints it in the existing error banner.
        } finally {
          resettingSellerId = null;
          render();
        }
      });
    });

    container.querySelectorAll('.change-email-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = await showAdminForm({
          title: `Change seller email for ${btn.dataset.name}`,
          message: 'This updates the seller login email and is recorded in the audit log.',
          submitLabel: 'Update email',
          fields: [
            { name: 'email', label: 'New email address', type: 'email', value: btn.dataset.email, required: true, autocomplete: 'email' },
          ],
        });
        if (!data || data.email === btn.dataset.email) return;
        try {
          await stateEngine.changeSellerEmail(btn.dataset.id, data.email);
          showAdminToast({ title: 'Seller email updated', message: `${btn.dataset.name} now signs in with ${data.email}.` });
        } catch (err) {
          showAdminToast({ title: 'Email update failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });

    container.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const suspending = btn.textContent.includes('Suspend');
        const confirmed = await showAdminConfirm({
          title: `${suspending ? 'Suspend' : 'Reactivate'} ${btn.dataset.name}`,
          message: suspending ? 'The seller will not be able to log in until reactivated.' : 'The seller will be able to log in again immediately.',
          detail: suspending ? 'Use this when an account needs to be paused quickly without deleting marketplace records.' : 'Confirm the seller is cleared to return before reactivating.',
          confirmLabel: suspending ? 'Suspend seller' : 'Reactivate seller',
          tone: suspending ? 'warning' : 'default',
        });
        if (!confirmed) return;
        try {
          await stateEngine.toggleSellerStatus(btn.dataset.id);
          showAdminToast({
            title: suspending ? 'Seller suspended' : 'Seller reactivated',
            message: `${btn.dataset.name} ${suspending ? 'cannot sign in now.' : 'can sign in again.'}`,
            tone: suspending ? 'warning' : 'success',
          });
        } catch (err) {
          showAdminToast({ title: 'Status change failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });

    container.querySelectorAll('.del-seller-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = await showAdminForm({
          title: `Request deletion of ${btn.dataset.name}`,
          message: 'Seller deletion requires secondary approval before anything is removed.',
          submitLabel: 'Submit deletion request',
          tone: 'danger',
          fields: [
            {
              name: 'reason',
              label: 'Reason for deletion',
              type: 'textarea',
              value: 'Account deletion initiated by administrator.',
              required: true,
              rows: 4,
            },
          ],
        });
        if (!data) return;
        try {
          await stateEngine.requestDeleteSeller(btn.dataset.id, data.reason);
          showAdminToast({
            title: 'Deletion request submitted',
            message: `${btn.dataset.name} remains active until secondary approval is complete.`,
            tone: 'warning',
          });
        } catch (err) {
          showAdminToast({ title: 'Deletion request failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });
  }

  render();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
