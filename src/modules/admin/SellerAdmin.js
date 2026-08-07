/**
 * UNIFIED ADMIN PANEL - Seller Management Module
 */
import { stateEngine } from '../../store/stateEngine.js';

export function renderSellerAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const sellers = state.sellers;

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #fff; font-size: 1.5rem;">👥 Registered Sellers Management</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Manage verified Rwandan sellers, suspend accounts, reset credentials, and review activity logs. Deleting sellers requires multi-admin approval.
            </p>
          </div>
        </div>

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
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              ${sellers.map(s => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary); color: #000; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                        ${s.name.charAt(0)}
                      </div>
                      <div>
                        <div style="font-weight: 600; color: #fff;">${escapeHtml(s.name)}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">ID: ${s.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 0.85rem; color: #fff;">📞 ${escapeHtml(s.phone)}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">✉️ ${escapeHtml(s.email)}</div>
                  </td>
                  <td>${escapeHtml(s.district)}</td>
                  <td><strong style="color: var(--primary);">${state.products.filter(p => p.sellerId === s.id || p.sellerName.includes(s.name)).length} Products</strong></td>
                  <td>
                    <span class="badge ${s.status==='active'?'badge-active':'badge-expired'}">
                      ${s.status.toUpperCase()}
                    </span>
                  </td>
                  <td>${s.joinedDate}</td>
                  <td>
                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                      <button class="btn btn-sm btn-secondary reset-pass-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}">
                        🔑 Reset Pass
                      </button>
                      <button class="btn btn-sm btn-danger del-seller-req-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}">
                        🔒 Request Deletion (Multi-Admin)
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
      btn.addEventListener('click', () => {
        alert(`Temporary password reset link generated for ${btn.dataset.name}. Sent to registered phone/email.`);
        stateEngine.logAudit(state.currentUser.name, 'SELLER_PASSWORD_RESET', 'Seller Admin', `Reset password for seller ${btn.dataset.name}.`);
      });
    });

    container.querySelectorAll('.del-seller-req-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const reason = prompt(`Enter reason for deleting seller account (${btn.dataset.name}):`) || 'Account deletion initiated by administrator.';
        stateEngine.createApprovalRequest(
          'DELETE_SELLER_ACCOUNT',
          `Seller: ${btn.dataset.name} (ID: ${btn.dataset.id})`,
          btn.dataset.id,
          reason,
          'HIGH',
          'super_admin'
        );
        alert(`Critical Approval Request created to delete seller ${btn.dataset.name}. Another Administrator must review and approve this action before deletion occurs.`);
        render();
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
