/**
 * UNIFIED ADMIN PANEL - Seller Management Module
 */
import { stateEngine } from '../../store/stateEngine.js';
import { showAdminConfirm, showAdminForm, showAdminToast } from './adminDialog.js';


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
              Manage verified Rwandan sellers, suspend accounts, review activity logs, and request account deletion. Seller login credentials remain controlled by the seller.
            </p>
          </div>
        </div>

        ${state.error ? `
          <div class="adm-inline-alert">
            <strong>Seller management error</strong>
            ${escapeHtml(state.error)}
          </div>
        ` : ''}

        <div class="seller-directory-search" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:18px 0 14px;">
          <label for="seller-directory-query" style="flex:1 1 280px;max-width:520px;">
            <span style="display:block;font-size:0.85rem;font-weight:700;margin-bottom:7px;">Find a seller</span>
            <input id="seller-directory-query" type="search" autocomplete="off"
              placeholder="Search name, email, phone, district or seller ID"
              aria-label="Search registered sellers"
              style="width:100%;max-width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:12px 14px;font:inherit;font-size:16px;background:white;color:#0F172A;" />
          </label>
          <span id="seller-directory-count" role="status" aria-live="polite" style="color:#64748B;font-size:0.85rem;align-self:flex-end;padding-bottom:12px;">
            ${loading ? 'Loading sellers...' : `${sellers.length} seller(s)`}
          </span>
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
                <th class="tbl-actions-col">Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              ${loading ? `
                <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading sellers...</td></tr>
              ` : sellers.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No sellers registered yet.</td></tr>
              ` : sellers.map(s => `
                <tr class="seller-directory-row">
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
                      <button class="btn btn-sm toggle-status-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" style="background:${s.status==='active'?'#FEF3C7':'#DCFCE7'}; color:${s.status==='active'?'#92400E':'#166534'}; border:1px solid ${s.status==='active'?'#FDE68A':'#BBF7D0'};">
                        ${s.status==='active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button class="btn btn-sm btn-danger del-seller-req-btn" data-id="${s.id}" data-name="${escapeHtml(s.name)}" title="Requires approval from another Administrator before it takes effect">
                        Request deletion
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}\n              ${!loading && sellers.length ? `<tr id="seller-directory-empty" hidden><td colspan="7" style="text-align:center;padding:2rem;color:#64748B;">No sellers match your search.</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const searchInput = container.querySelector('#seller-directory-query');
    const searchCount = container.querySelector('#seller-directory-count');
    const searchEmpty = container.querySelector('#seller-directory-empty');
    const sellerRows = Array.from(container.querySelectorAll('.seller-directory-row'));
    searchInput?.addEventListener('input', () => {
      const term = searchInput.value.trim().toLocaleLowerCase();
      let visible = 0;
      sellerRows.forEach((row) => {
        const matches = !term || row.textContent.toLocaleLowerCase().includes(term);
        row.hidden = !matches;
        row.style.display = matches ? '' : 'none';
        if (matches) visible++;
      });
      if (searchEmpty) {
        searchEmpty.hidden = visible !== 0;
        searchEmpty.style.display = visible ? 'none' : '';
      }
      if (searchCount) searchCount.textContent = term
        ? `${visible} of ${sellerRows.length} sellers found`
        : `${sellerRows.length} seller(s)`;
    });

    // Event Handlers
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

function formatResetRequestTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Requested recently';
  return `Requested ${date.toLocaleString()}`;
}
