/**
 * UNIFIED ADMIN PANEL - User & Role-Based Access Control (RBAC) Module
 */
import { stateEngine } from '../../store/stateEngine.js';
import { showAdminConfirm, showAdminForm, showAdminPasswordResult, showAdminToast } from './adminDialog.js';

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

const PERMISSION_LABELS = {
  product_mgmt: 'Product Management',
  seller_mgmt: 'Seller Management',
  category_mgmt: 'Category Management',
  banner_mgmt: 'Ad Banners',
  realestate_content: 'Real Estate Content',
  reports: 'Reports',
  user_mgmt: 'User RBAC & Roles',
  system_settings: 'System Settings & Audit',
  approvals: 'Multi-Admin Approvals (Approver)',
  product_approval: 'Product Approval Queue',
};

let rbacUsersRefreshInFlight = false;
let rbacUsersLastRefreshAt = 0;
const RBAC_USERS_REFRESH_MS = 10_000;

function isApprovalOnlyUser(user) {
  const permissions = user?.permissions || {};
  return user?.role !== 'administrator' &&
    permissions.approvals === true &&
    Object.entries(permissions).every(([key, allowed]) => key === 'approvals' ? allowed === true : allowed === false);
}

function userRoleLabel(user) {
  if (isApprovalOnlyUser(user)) return 'APPROVAL-ONLY ADMIN';
  return String(user.role || '').replace('_', ' ').toUpperCase();
}

export function renderUserRBACAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.systemUsers !== undefined;

    const shouldRefreshUsers =
      !state.loading.systemUsers &&
      !rbacUsersRefreshInFlight &&
      (!attempted || Date.now() - rbacUsersLastRefreshAt > RBAC_USERS_REFRESH_MS);

    if (shouldRefreshUsers) {
      rbacUsersRefreshInFlight = true;
      rbacUsersLastRefreshAt = Date.now();
      stateEngine.loadRbacUsers()
        .catch(() => {})
        .finally(() => { rbacUsersRefreshInFlight = false; });
    }
    // Needed to show the "pending review" banner below - loaded here too
    // (not just from the Multi-Admin Approvals tab) so it's accurate even if
    // this is the first tab opened this session.
    if (state.loading.approvalRequests === undefined) stateEngine.loadApprovals().catch(() => {});

    const systemUsers = state.systemUsers;
    const loading = !!state.loading.systemUsers || !attempted;
    // SubAdministrator.createdById is a required FK to Administrator (see
    // schema.prisma) - a Sub-Administrator creating another one isn't
    // representable in the data model, so only a full Administrator can.
    // The backend already enforces this; hiding the button for a logged-in
    // Sub-Administrator avoids a confusing 403 from a button that can never work for them.
    const isFullAdmin = state.currentUser?.role === 'admin';
    // A pending CREATE_SUB_ADMIN request has no SubAdministrator row yet -
    // there's nothing in systemUsers to render a card for - so without this
    // it would be invisible anywhere except the Multi-Admin Approvals tab.
    const pendingCreateRequests = state.approvalRequests.filter(
      r => r.actionType === 'CREATE_SUB_ADMIN' && r.status === 'PENDING'
    );

    container.innerHTML = `
      <div>
        <div class="adm-module-header">
          <div>
            <h2 class="adm-module-title">Administrator roles & permissions</h2>
            <p class="adm-module-copy">
              Keep one central full Administrator, one fixed approval account, and scoped sub-admin module access.
            </p>
          </div>
          ${isFullAdmin ? `
            <div class="adm-toolbar">
              <button id="add-subadmin-btn" class="btn btn-primary btn-sm">
                Add sub-admin
              </button>
            </div>
          ` : ''}
        </div>

        ${state.error ? `
          <div class="adm-inline-alert">
            <strong>Access control error</strong>
            ${escapeHtml(state.error)}
          </div>
        ` : ''}

        ${pendingCreateRequests.length > 0 ? `
          <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 16px; padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
            <div style="font-weight: 800; color: #92400E; font-size: 0.9rem; margin-bottom: 0.6rem;">
              Pending sub-administrator creation (${pendingCreateRequests.length})
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${pendingCreateRequests.map(r => `
                <div style="font-size: 0.85rem; color: #92400E;">
                  <strong>${escapeHtml(r.targetName)}</strong> - requested by ${escapeHtml(r.requestedByName)}.
                  Awaiting a <em>different</em> Administrator's approval in Multi-Admin Approvals before this account exists.
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${loading ? `
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">Loading administrators...</div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${systemUsers.map(u => {
              // Surfaces a submitted-but-not-yet-applied permission change
              // right on the card it affects - without this, checking boxes
              // and clicking "Request Permission Change" looks like it did
              // nothing at all until someone happens to notice the request
              // sitting in Multi-Admin Approvals (which needs a *different*
              // Administrator to approve it - self-approval is blocked).
              const pendingChangeReq = state.approvalRequests.find(
                r => r.targetId === u.id && r.status === 'PENDING' && r.actionType === 'CHANGE_ADMIN_PERMISSIONS'
              );
              const approvalOnly = isApprovalOnlyUser(u);
              const canEditPermissions = u.role !== 'administrator' && !approvalOnly;
              const isSuspended = u.status === 'suspended';
              const isCurrentUser = u.id === state.currentUser?.id;
              const cardAccent = approvalOnly ? '#059669' : (u.role==='administrator' ? 'var(--accent-gold)' : '#8b5cf6');
              const badgeColor = approvalOnly ? '#047857' : (u.role==='administrator' ? 'var(--accent-gold)' : '#334155');
              return `
              <div class="glass-panel" style="padding: 1.25rem 1.4rem; border-radius: 20px; border-top: 4px solid ${cardAccent};">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <h3 style="color: #0F172A; font-size: 1.2rem;">${escapeHtml(u.name)}</h3>
                      <span class="badge" style="background: #F1F5F9; color: ${badgeColor}; font-weight: 800;">
                        ${userRoleLabel(u)}
                      </span>
                      ${u.role !== 'administrator' ? `
                        <span class="badge" style="background: ${isSuspended ? '#FEF2F2' : '#ECFDF5'}; color: ${isSuspended ? '#991B1B' : '#047857'}; font-weight: 800;">
                          ${isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                        </span>
                      ` : ''}
                    </div>
                    <div style="font-size: 0.85rem; color: #64748B; margin-top: 0.2rem;">
                      ${escapeHtml(u.email)} · Last login: ${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </div>
                    ${approvalOnly ? `
                      <div style="font-size: 0.78rem; color: #047857; font-weight: 700; margin-top: 0.35rem;">
                        Approval-only: can approve/reject Multi-Admin requests, with no other module access.
                      </div>
                    ` : ''}
                    ${isSuspended ? `
                      <div style="font-size: 0.78rem; color: #991B1B; font-weight: 700; margin-top: 0.35rem;">
                        Deactivated: this account cannot sign in, and existing sessions lose module access immediately.
                      </div>
                    ` : ''}
                  </div>

                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${isCurrentUser ? `
                      <button class="btn btn-sm btn-secondary self-password-btn">
                        Change my password
                      </button>
                    ` : ''}
                    ${u.role !== 'administrator' ? `
                      ${isFullAdmin ? `
                        <button class="btn btn-sm btn-secondary reset-subadmin-pass-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                          Reset password
                        </button>
                        <button class="btn btn-sm btn-secondary change-subadmin-email-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}" data-email="${escapeHtml(u.email)}">
                          Change email
                        </button>
                        <button class="btn btn-sm toggle-subadmin-status-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}" data-action="${isSuspended ? 'activate' : 'suspend'}" style="background:${isSuspended?'#DCFCE7':'#FEF3C7'}; color:${isSuspended?'#166534':'#92400E'}; border:1px solid ${isSuspended?'#BBF7D0':'#FDE68A'};">
                          ${isSuspended ? 'Activate' : 'Deactivate'}
                        </button>
                      ` : ''}
                      ${approvalOnly ? `
                        <span class="badge" style="background: #ECFDF5; color: #047857; font-weight: 800; align-self: center;">Locked to approvals</span>
                      ` : `
                        <button class="btn btn-sm btn-secondary req-perm-change-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                          Request permission change
                        </button>
                      `}
                      ${isFullAdmin ? `
                        <button class="btn btn-sm btn-danger del-subadmin-direct-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                          Delete account
                        </button>
                      ` : `
                        <button class="btn btn-sm btn-danger del-subadmin-req-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                          Request removal
                        </button>
                      `}
                    ` : ''}
                  </div>
                </div>

                ${pendingChangeReq ? `
                  <div style="background: #FEF3C7; border: 1px solid #FDE68A; color: #92400E; padding: 0.65rem 0.9rem; border-radius: 10px; font-size: 0.82rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    A permission change for ${escapeHtml(u.name)} is awaiting review in Multi-Admin Approvals. A <em>different</em> Administrator must approve it before it takes effect. The checkboxes below still show the current permissions.
                  </div>
                ` : ''}

                <!-- Permission Toggles Matrix - editable checkboxes for ordinary Sub-Administrators
                     (the requester picks the target permission set, submitted with the
                     approval request); read-only for the central Administrator and
                     approval-only admins, because those roles are intentionally fixed. -->
                <div style="background: #F8FAFC; padding: 1rem; border-radius: var(--radius-sm); border: 1px solid #E2E8F0;">
                  <div style="font-size: 0.78rem; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
                    ${u.role === 'administrator'
                      ? 'Central Administrator Permissions (full access)'
                      : approvalOnly
                        ? 'Approval-Only Access (fixed to Multi-Admin Approvals)'
                        : 'Assigned Module Access Permissions - toggle to set the requested permission set'}
                  </div>

                  <div class="grid-4" style="gap: 0.75rem;">
                    ${Object.entries(u.permissions).map(([permKey, isAllowed]) => `
                      <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: ${isAllowed?'#059669':'#94A3B8'}; cursor: ${canEditPermissions?'pointer':'default'};">
                        ${canEditPermissions ? `
                          <input type="checkbox" class="perm-checkbox" data-user-id="${u.id}" data-module="${KEY_TO_MODULE[permKey]}" ${isAllowed ? 'checked' : ''} style="cursor: pointer;">
                        ` : `<span class="adm-perm-state ${isAllowed ? 'is-on' : ''}">${isAllowed ? 'On' : 'Off'}</span>`}
                        <span>${escapeHtml(PERMISSION_LABELS[permKey] || permKey.replace('_', ' '))}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;}).join('')}
          </div>
        `}
      </div>
    `;

    // Handlers
    // Root cause of "I added a sub-admin and gave them a role but it doesn't
    // work": creation and permission-granting used to be two entirely
    // separate actions (sequential prompt() dialogs to create, THEN a
    // completely separate checkbox-matrix-and-button step below to request
    // access) - easy to do the first and never realize/remember the second
    // exists. Confirmed against production data: a sub-admin created this way
    // had zero ApprovalRequest rows ever created for them - the second step
    // was simply never taken, not a technical failure. This modal makes both
    // one action: create the account, then immediately submit a permission
    // request for whatever was checked (still requires a different
    // Administrator's approval - that dual-authorization step is intentional
    // and unchanged).
    container.querySelector('#add-subadmin-btn')?.addEventListener('click', () => {
      openCreateSubAdminModal();
    });

    container.querySelectorAll('.self-password-btn').forEach(btn => {
      btn.addEventListener('click', () => openSelfPasswordDialog());
    });

    container.querySelectorAll('.reset-subadmin-pass-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showAdminConfirm({
          title: `Reset password for ${btn.dataset.name}`,
          message: 'This creates a new temporary password. The current password cannot be viewed or recovered.',
          detail: 'Share the temporary password through a trusted channel and ask the admin to change it after signing in.',
          confirmLabel: 'Reset password',
          tone: 'warning',
        });
        if (!confirmed) return;
        try {
          const result = await stateEngine.resetSubAdminPassword(btn.dataset.id);
          await showAdminPasswordResult({ name: btn.dataset.name, tempPassword: result.tempPassword });
        } catch (err) {
          showAdminToast({ title: 'Password reset failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });

    container.querySelectorAll('.change-subadmin-email-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = await showAdminForm({
          title: `Change email for ${btn.dataset.name}`,
          message: 'Email is the login identity for this admin account. The change is audited.',
          submitLabel: 'Update email',
          fields: [
            { name: 'email', label: 'New email address', type: 'email', value: btn.dataset.email, required: true, autocomplete: 'email' },
          ],
        });
        if (!data || data.email === btn.dataset.email) return;
        try {
          await stateEngine.changeSubAdminEmail(btn.dataset.id, data.email);
          showAdminToast({ title: 'Email updated', message: `${btn.dataset.name} now signs in with ${data.email}.` });
        } catch (err) {
          showAdminToast({ title: 'Email update failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });

    container.querySelectorAll('.toggle-subadmin-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const activating = btn.dataset.action === 'activate';
        const actionLabel = activating ? 'Activate' : 'Deactivate';
        const consequence = activating
          ? 'They will be able to sign in again immediately.'
          : 'They will not be able to sign in, and existing sessions will lose access immediately.';
        const confirmed = await showAdminConfirm({
          title: `${actionLabel} ${btn.dataset.name}`,
          message: consequence,
          detail: activating ? 'Use this only after you have confirmed the account should regain access.' : 'This is the fastest emergency stop for an admin account.',
          confirmLabel: activating ? 'Activate account' : 'Deactivate account',
          tone: activating ? 'default' : 'danger',
        });
        if (!confirmed) return;
        try {
          await stateEngine.toggleSubAdminStatus(btn.dataset.id);
          showAdminToast({
            title: activating ? 'Admin account activated' : 'Admin account deactivated',
            message: `${btn.dataset.name} ${activating ? 'can sign in again.' : 'can no longer access the admin system.'}`,
            tone: activating ? 'success' : 'warning',
          });
        } catch (err) {
          showAdminToast({ title: 'Status change failed', message: err.message || 'Please try again.', tone: 'danger' });
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
        const confirmed = await showAdminConfirm({
          title: `Request permission change for ${btn.dataset.name}`,
          message: 'This does not change access immediately. A different Administrator or approval-only admin must approve it first.',
          detail: permissions.length ? `Requested modules: ${permissions.join(', ')}` : 'Requested modules: none. This will revoke all module access if approved.',
          confirmLabel: 'Submit request',
          tone: permissions.length ? 'default' : 'warning',
        });
        if (!confirmed) return;
        try {
          await stateEngine.requestPermissionChange(btn.dataset.id, btn.dataset.name, permissions);
          showAdminToast({
            title: 'Approval request submitted',
            message: `Permission change for ${btn.dataset.name} is waiting for secondary approval.`,
          });
        } catch (err) {
          showAdminToast({ title: 'Request failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });

    container.querySelectorAll('.del-subadmin-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = await showAdminForm({
          title: `Request removal of ${btn.dataset.name}`,
          message: 'Account removal is a critical action. It will not execute until another authorized account approves the request.',
          submitLabel: 'Submit removal request',
          tone: 'danger',
          fields: [
            {
              name: 'reason',
              label: 'Reason for removal',
              type: 'textarea',
              value: 'Sub-Administrator account removal requested.',
              required: true,
              rows: 4,
            },
          ],
        });
        if (!data) return;
        try {
          await stateEngine.requestDeleteSubAdmin(btn.dataset.id, data.reason);
          showAdminToast({
            title: 'Removal request submitted',
            message: `${btn.dataset.name} will remain active until a different approver authorizes removal.`,
            tone: 'warning',
          });
        } catch (err) {
          showAdminToast({ title: 'Removal request failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });

    container.querySelectorAll('.del-subadmin-direct-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showAdminConfirm({
          title: `Delete ${btn.dataset.name}`,
          message: 'This removes the admin account immediately. The user will not be able to sign in again.',
          detail: 'Use this only from the Main Admin account after confirming the account is no longer needed.',
          confirmLabel: 'Delete account',
          tone: 'danger',
        });
        if (!confirmed) return;
        try {
          await stateEngine.deleteSubAdmin(btn.dataset.id);
          showAdminToast({
            title: 'Admin account deleted',
            message: `${btn.dataset.name} has been removed.`,
            tone: 'warning',
          });
        } catch (err) {
          showAdminToast({ title: 'Delete failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });
  }

  render();
}

async function openSelfPasswordDialog() {
  const data = await showAdminForm({
    title: 'Change my password',
    message: 'Update the password for your signed-in admin account.',
    submitLabel: 'Save password',
    fields: [
      { name: 'currentPassword', label: 'Current password', type: 'password', required: true, autocomplete: 'current-password' },
      { name: 'newPassword', label: 'New password', type: 'password', required: true, minLength: 6, autocomplete: 'new-password' },
      { name: 'confirmPassword', label: 'Confirm new password', type: 'password', required: true, minLength: 6, autocomplete: 'new-password' },
    ],
  });
  if (!data) return;
  if (data.newPassword.length < 6) {
    showAdminToast({ title: 'Password not changed', message: 'New password must be at least 6 characters.', tone: 'danger' });
    return;
  }
  if (data.newPassword !== data.confirmPassword) {
    showAdminToast({ title: 'Password not changed', message: 'New passwords do not match.', tone: 'danger' });
    return;
  }

  try {
    await stateEngine.changePassword(data.currentPassword, data.newPassword);
    showAdminToast({ title: 'Password updated', message: 'Use the new password next time you sign in.' });
  } catch (err) {
    showAdminToast({ title: 'Password not changed', message: err.message || 'Please check the current password and try again.', tone: 'danger' });
  }
}

// Combines account creation + the initial permission request into one modal
// submit, instead of two easy-to-lose-track-of separate actions (see the
// #add-subadmin-btn handler above for the full reasoning). Appended to
// document.body (not the module's own container) so it survives the next
// stateEngine re-render, same pattern as the image lightbox in
// MarketplaceAdmin.js.
function openCreateSubAdminModal() {
  const overlay = document.createElement('div');
  overlay.className = 'adm-dialog-backdrop';

  overlay.innerHTML = `
    <section class="adm-dialog" role="dialog" aria-modal="true" aria-labelledby="create-subadmin-title">
      <div class="adm-dialog-topline"></div>
      <div class="adm-dialog-header">
        <div>
          <div class="adm-dialog-kicker">Admin workflow</div>
          <h3 id="create-subadmin-title" class="adm-dialog-title">Request new sub-administrator</h3>
        </div>
      </div>
      <p class="adm-dialog-message">
        Set their account details and initial module access in one step. The account itself now requires a different Administrator's approval too, same as a permission change.
      </p>

      <form id="create-subadmin-form" class="adm-dialog-form">
        <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.25rem;">
          <input name="name" type="text" placeholder="Full Name" required
            style="padding: 0.65rem 0.9rem; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 0.9rem;">
          <input name="email" type="email" placeholder="Email Address" required
            style="padding: 0.65rem 0.9rem; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 0.9rem;">
          <input name="password" type="password" placeholder="Initial Password (min. 6 characters)" minlength="6" required
            style="padding: 0.65rem 0.9rem; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 0.9rem;">
        </div>

        <div style="font-size: 0.78rem; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">
          Initial Module Access (optional - can be changed later)
        </div>
        <div class="grid-2" style="gap: 0.6rem; margin-bottom: 1rem;">
          ${Object.entries(PERMISSION_LABELS).map(([key, label]) => `
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #334155; cursor: pointer;">
              <input type="checkbox" name="perm" value="${KEY_TO_MODULE[key]}" style="cursor: pointer;">
              ${escapeHtml(label)}
            </label>
          `).join('')}
        </div>

        <div class="adm-dialog-note" style="margin: 0 0 1.25rem;">
          This submits one request for the account and its permissions. Nothing is created until a different Administrator approves it in Multi-Admin Approvals.
        </div>

        <div id="create-subadmin-error" style="color:#991B1B;font-size:0.85rem;margin-bottom:0.75rem;"></div>

        <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button type="button" id="create-subadmin-cancel" class="btn btn-sm btn-secondary">Cancel</button>
          <button type="submit" id="create-subadmin-submit" class="btn btn-sm btn-primary">Submit Creation Request</button>
        </div>
      </form>
    </section>
  `;

  function close() {
    overlay.remove();
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#create-subadmin-cancel').addEventListener('click', close);

  overlay.querySelector('#create-subadmin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = overlay.querySelector('#create-subadmin-submit');
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const permissions = Array.from(form.querySelectorAll('input[name="perm"]:checked')).map(cb => cb.value);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    try {
      // One request now covers both the account and its initial permissions -
      // see requestCreateSubAdmin in stateEngine.js. Nothing is created until
      // a different Administrator approves it in Multi-Admin Approvals.
      await stateEngine.requestCreateSubAdmin(name, email, password, permissions);
      close();
      showAdminToast({
        title: 'Creation request submitted',
        message: `${name} will be created after secondary approval${permissions.length ? ` with ${permissions.length} module permission(s).` : ' with no initial module access.'}`,
      });
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Creation Request';
      const message = err.message || 'Something went wrong. Please try again.';
      form.querySelector('#create-subadmin-error').textContent = message;
    }
  });

  document.body.appendChild(overlay);
  overlay.querySelector('input[name="name"]').focus();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
