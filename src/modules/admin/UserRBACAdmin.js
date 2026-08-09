/**
 * UNIFIED ADMIN PANEL - User & Role-Based Access Control (RBAC) Module
 */
import { stateEngine } from '../../store/stateEngine.js';

// Mirrors server/src/utils/permissions.ts - the frontend display key (e.g.
// "product_mgmt", used to render the matrix) back to the module key the
// backend's ApprovalRequest.newPermissions array actually expects.
const KEY_TO_MODULE = {
  product_mgmt: 'PRODUCTS',
  seller_mgmt: 'SELLERS',
  category_mgmt: 'CATEGORIES',
  banner_mgmt: 'ADVERTISEMENTS',
  realestate_content: 'REAL_ESTATE_CONTENT',
  reports: 'REPORTS',
  user_mgmt: 'USERS',
  system_settings: 'SYSTEM_SETTINGS',
};

export function renderUserRBACAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.systemUsers !== undefined;

    if (!attempted) stateEngine.loadRbacUsers().catch(() => {});

    const systemUsers = state.systemUsers;
    const loading = !!state.loading.systemUsers || !attempted;

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #0F172A; font-size: 1.5rem;">🔐 Administrator Roles & Permissions (RBAC)</h2>
            <p style="color: #64748B; font-size: 0.9rem;">
              Manage platform administrators, assign roles (Administrator, Sub-Administrator), and scope granular access permissions.
            </p>
          </div>
        </div>

        ${state.error ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
            ⚠️ ${escapeHtml(state.error)}
          </div>
        ` : ''}

        ${loading ? `
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">Loading administrators...</div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${systemUsers.map(u => `
              <div class="glass-panel" style="padding: 1.75rem; border-radius: var(--radius-md); border-top: 4px solid ${u.role==='administrator'?'var(--accent-gold)':'#8b5cf6'};">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <h3 style="color: #0F172A; font-size: 1.2rem;">${escapeHtml(u.name)}</h3>
                      <span class="badge" style="background: #F1F5F9; color: ${u.role==='administrator'?'var(--accent-gold)':'#334155'}; font-weight: 800;">
                        ${u.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div style="font-size: 0.85rem; color: #64748B; margin-top: 0.2rem;">
                      ✉️ ${escapeHtml(u.email)} • 🕒 Last Login: ${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </div>
                  </div>

                  <div style="display: flex; gap: 0.5rem;">
                    ${u.role !== 'administrator' ? `
                      <button class="btn btn-sm btn-secondary req-perm-change-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                        🔒 Request Permission Change (Multi-Admin)
                      </button>
                    ` : ''}
                  </div>
                </div>

                <!-- Permission Toggles Matrix - editable checkboxes for Sub-Administrators
                     (the requester picks the target permission set, submitted with the
                     approval request); read-only for the Administrator row below, since a
                     full Administrator's access is hardcoded to "everything" and can't be
                     reduced (see fullPermissions() in utils/permissions.ts) - there's
                     nothing here for a request to meaningfully change for them. -->
                <div style="background: #F8FAFC; padding: 1rem; border-radius: var(--radius-sm); border: 1px solid #E2E8F0;">
                  <div style="font-size: 0.78rem; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
                    ${u.role !== 'administrator' ? 'Assigned Module Access Permissions - toggle to set the requested permission set' : 'Assigned Module Access Permissions (Administrators always have full access)'}
                  </div>

                  <div class="grid-4" style="gap: 0.75rem;">
                    ${Object.entries(u.permissions).map(([permKey, isAllowed]) => `
                      <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: ${isAllowed?'#059669':'#94A3B8'}; cursor: ${u.role!=='administrator'?'pointer':'default'};">
                        ${u.role !== 'administrator' ? `
                          <input type="checkbox" class="perm-checkbox" data-user-id="${u.id}" data-module="${KEY_TO_MODULE[permKey]}" ${isAllowed ? 'checked' : ''} style="cursor: pointer;">
                        ` : `<span>${isAllowed ? '✅' : '❌'}</span>`}
                        <span style="text-transform: capitalize;">${permKey.replace('_', ' ')}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    // Handlers
    container.querySelectorAll('.req-perm-change-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        // Read the checkbox states set above - this is what actually gets
        // requested and, once approved, applied to the target's permissions.
        const checkboxes = container.querySelectorAll(`.perm-checkbox[data-user-id="${btn.dataset.id}"]`);
        const permissions = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.module);
        if (!confirm(`Request this permission set for ${btn.dataset.name}?\n\n${permissions.length ? permissions.join(', ') : '(no access - all permissions revoked)'}\n\nAnother Administrator must approve this before it takes effect.`)) return;
        try {
          await stateEngine.requestPermissionChange(btn.dataset.id, btn.dataset.name, permissions);
          alert(`Approval Request created for modifying permissions of ${btn.dataset.name}. Another Administrator must review and approve this action.`);
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
