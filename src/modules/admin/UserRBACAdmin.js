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
  // These two were missing entirely - checking their box in the matrix and
  // submitting a permission request would have silently dropped them (the
  // checkbox's data-module ended up literally "undefined", which
  // VALID_MODULES then filters out server-side). Never caught before now
  // because both were only ever granted via direct API calls, not through
  // this checkbox flow.
  approvals: 'APPROVALS',
  product_approval: 'PRODUCT_APPROVAL',
};

export function renderUserRBACAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.systemUsers !== undefined;

    if (!attempted) stateEngine.loadRbacUsers().catch(() => {});

    const systemUsers = state.systemUsers;
    const loading = !!state.loading.systemUsers || !attempted;
    // SubAdministrator.createdById is a required FK to Administrator (see
    // schema.prisma) - a Sub-Administrator creating another one isn't
    // representable in the data model, so only a full Administrator can.
    // The backend already enforces this; hiding the button for a logged-in
    // Sub-Administrator avoids a confusing 403 from a button that can never work for them.
    const isFullAdmin = state.currentUser?.role === 'admin';

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #0F172A; font-size: 1.3rem;">🔐 Administrator Roles & Permissions (RBAC)</h2>
            <p style="color: #64748B; font-size: 0.9rem;">
              Manage platform administrators, assign roles (Administrator, Sub-Administrator), and scope granular access permissions.
            </p>
          </div>
          ${isFullAdmin ? `
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="add-subadmin-btn" class="btn btn-primary btn-sm">
                ➕ Add New Sub-Administrator
              </button>
              <button id="add-admin-btn" class="btn btn-secondary btn-sm" title="A second Administrator is required to approve critical requests - with only one, dual-authorization approvals can never be resolved.">
                🛡️ Add New Administrator
              </button>
            </div>
          ` : ''}
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
              <div class="glass-panel" style="padding: 1.25rem 1.4rem; border-radius: 20px; border-top: 4px solid ${u.role==='administrator'?'var(--accent-gold)':'#8b5cf6'};">
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

                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${u.role !== 'administrator' ? `
                      <button class="btn btn-sm btn-secondary reset-subadmin-pass-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                        🔑 Reset Pass
                      </button>
                      <button class="btn btn-sm btn-secondary change-subadmin-email-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}" data-email="${escapeHtml(u.email)}">
                        ✉️ Change Email
                      </button>
                      <button class="btn btn-sm btn-secondary req-perm-change-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                        🔒 Request Permission Change (Multi-Admin)
                      </button>
                      <button class="btn btn-sm btn-danger del-subadmin-req-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                        🔒 Request Removal (Multi-Admin)
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
    container.querySelector('#add-subadmin-btn')?.addEventListener('click', async () => {
      const name = prompt('Enter Sub-Administrator Full Name:');
      if (!name) return;
      const email = prompt('Enter Email Address:');
      if (!email) return;
      const password = prompt('Set an Initial Password (min. 6 characters):');
      if (!password) return;
      try {
        await stateEngine.createSubAdmin(name, email, password, []);
        alert(`Sub-Administrator account created for ${name}. They start with no module permissions - grant access via the checkboxes below, then request a permission change to apply it.`);
      } catch (err) {
        render();
      }
    });

    container.querySelector('#add-admin-btn')?.addEventListener('click', async () => {
      if (!confirm('A new Administrator has full, unrestricted access to every module - not scoped permissions like a Sub-Administrator. Create one anyway?')) return;
      const name = prompt('Enter Administrator Full Name:');
      if (!name) return;
      const email = prompt('Enter Email Address:');
      if (!email) return;
      const password = prompt('Set an Initial Password (min. 6 characters):');
      if (!password) return;
      try {
        await stateEngine.createAdministrator(name, email, password);
        alert(`Administrator account created for ${name}. They can now act as the second approver for Multi-Admin approval requests.`);
      } catch (err) {
        render();
      }
    });

    container.querySelectorAll('.reset-subadmin-pass-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const result = await stateEngine.resetSubAdminPassword(btn.dataset.id);
          alert(`Temporary password for ${btn.dataset.name}: ${result.tempPassword}\n\n(In production this would be emailed/SMS'd to them instead of shown here.)`);
        } catch (err) {
          render();
        }
      });
    });

    container.querySelectorAll('.change-subadmin-email-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newEmail = prompt(`Enter new email address for ${btn.dataset.name}:`, btn.dataset.email);
        if (!newEmail || newEmail === btn.dataset.email) return;
        try {
          await stateEngine.changeSubAdminEmail(btn.dataset.id, newEmail);
          alert(`Email updated for ${btn.dataset.name}.`);
        } catch (err) {
          render();
        }
      });
    });

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

    container.querySelectorAll('.del-subadmin-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reason = prompt(`Enter reason for removing Sub-Administrator account (${btn.dataset.name}):`) || 'Sub-Administrator account removal requested.';
        try {
          await stateEngine.requestDeleteSubAdmin(btn.dataset.id, reason);
          alert(`Critical Approval Request created to remove Sub-Administrator ${btn.dataset.name}. Another Administrator must review and approve this action before removal occurs.`);
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
