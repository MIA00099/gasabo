/**
 * UNIFIED ADMIN PANEL - User & Role-Based Access Control (RBAC) Module
 */
import { stateEngine } from '../../store/stateEngine.js';

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
            <h2 style="color: #fff; font-size: 1.5rem;">🔐 Administrator Roles & Permissions (RBAC)</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
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
                      <h3 style="color: #fff; font-size: 1.2rem;">${escapeHtml(u.name)}</h3>
                      <span class="badge" style="background: rgba(255,255,255,0.08); color: ${u.role==='administrator'?'var(--accent-gold)':'#fff'}; font-weight: 800;">
                        ${u.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
                      ✉️ ${escapeHtml(u.email)} • 🕒 Last Login: ${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </div>
                  </div>

                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-secondary req-perm-change-btn" data-id="${u.id}" data-name="${escapeHtml(u.name)}">
                      🔒 Request Permission Change (Multi-Admin)
                    </button>
                  </div>
                </div>

                <!-- Permission Toggles Matrix -->
                <div style="background: rgba(0,0,0,0.25); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--navy-border);">
                  <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">Assigned Module Access Permissions</div>

                  <div class="grid-4" style="gap: 0.75rem;">
                    ${Object.entries(u.permissions).map(([permKey, isAllowed]) => `
                      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: ${isAllowed?'#00e676':'var(--text-muted)'};">
                        <span>${isAllowed ? '✅' : '❌'}</span>
                        <span style="text-transform: capitalize;">${permKey.replace('_', ' ')}</span>
                      </div>
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
        try {
          await stateEngine.requestPermissionChange(btn.dataset.id, btn.dataset.name);
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
