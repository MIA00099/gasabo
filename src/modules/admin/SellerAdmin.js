/**
 * UNIFIED ADMIN PANEL - Seller Management Module
 */
import { stateEngine } from '../../store/stateEngine.js';

export function renderSellerAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.sellers !== undefined;

    if (!attempted) stateEngine.loadSellers().catch(() => {});

    const sellers = state.sellers;
    const loading = !!state.loading.sellers || !attempted;

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #0F172A; font-size: 1.3rem;">👥 Registered Sellers Management</h2>
            <p style="color: #64748B; font-size: 0.9rem;">
              Manage verified Rwandan sellers, suspend accounts, reset credentials, and review activity logs. Deleting sellers requires multi-admin approval.
            </p>
          </div>
        </div>

        ${state.error ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
            ⚠️ ${escapeHtml(state.error)}
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
                    <div style="font-size: 0.85rem; color: #0F172A;">📞 ${escapeHtml(s.phone || '-')}</div>
                    <div style="font-size: 0.78rem; color: #64748B;">✉️ ${escapeHtml(s.email)}</div>
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
                      <button class="btn btn-sm btn-secondary reset-pass-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}">
                        🔑 Reset Pass
                      </button>
                      <button class="btn btn-sm btn-secondary change-email-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" data-email="${escapeHtml(s.email)}">
                        ✉️ Change Email
                      </button>
                      <button class="btn btn-sm toggle-status-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" style="background:${s.status==='active'?'#FEF3C7':'#DCFCE7'}; color:${s.status==='active'?'#92400E':'#166534'}; border:1px solid ${s.status==='active'?'#FDE68A':'#BBF7D0'};">
                        ${s.status==='active' ? '⏸ Suspend' : '▶ Reactivate'}
                      </button>
                      <button class="btn btn-sm btn-danger del-seller-req-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" title="Requires approval from another Administrator before it takes effect">
                        🔒 Request Deletion
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
    container.querySelectorAll('.reset-pass-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const result = await stateEngine.resetSellerPassword(btn.dataset.id);
          alert(`Temporary password for ${btn.dataset.name}: ${result.tempPassword}\n\n(In production this would be emailed/SMS'd to the seller instead of shown here.)`);
        } catch (err) {
          render();
        }
      });
    });

    container.querySelectorAll('.change-email-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newEmail = prompt(`Enter new email address for ${btn.dataset.name}:`, btn.dataset.email);
        if (!newEmail || newEmail === btn.dataset.email) return;
        try {
          await stateEngine.changeSellerEmail(btn.dataset.id, newEmail);
          alert(`Email updated for ${btn.dataset.name}.`);
        } catch (err) {
          render();
        }
      });
    });

    container.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const suspending = btn.textContent.includes('Suspend');
        if (!confirm(`${suspending ? 'Suspend' : 'Reactivate'} ${btn.dataset.name}? ${suspending ? 'They will not be able to log in until reactivated.' : 'They will be able to log in again immediately.'}`)) return;
        try {
          await stateEngine.toggleSellerStatus(btn.dataset.id);
        } catch (err) {
          render();
        }
      });
    });

    container.querySelectorAll('.del-seller-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reason = prompt(`Enter reason for deleting seller account (${btn.dataset.name}):`) || 'Account deletion initiated by administrator.';
        try {
          await stateEngine.requestDeleteSeller(btn.dataset.id, reason);
          alert(`Critical Approval Request created to delete seller ${btn.dataset.name}. Another Administrator must review and approve this action before deletion occurs.`);
        } catch (err) {
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
