/**
 * UNIFIED ADMIN PANEL - Security Audit Logs & System Backups Module
 */
import { stateEngine } from '../../store/stateEngine.js';
import { showAdminToast } from './adminDialog.js';

export function renderSecurityAuditAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.auditLogs !== undefined;

    if (!attempted) stateEngine.loadAuditLogs().catch(() => {});

    const logs = state.auditLogs;
    const loading = !!state.loading.auditLogs || !attempted;

    container.innerHTML = `
      <div>
        <div class="adm-module-header">
          <div>
            <h2 class="adm-module-title">Security audit logs & backups</h2>
            <p class="adm-module-copy">
              Complete audit trail of all platform activities, administrative approvals, login sessions, and database backups.
            </p>
          </div>

          <div class="adm-toolbar">
            <button id="trigger-backup-btn" class="btn btn-primary">
              Create backup snapshot
            </button>
          </div>
        </div>

        ${state.error ? `
          <div class="adm-inline-alert">
            <strong>Audit log error</strong>
            ${escapeHtml(state.error)}
          </div>
        ` : ''}

        <!-- BACKUP POLICY BANNER -->
        <div class="glass-panel" style="padding: 1rem 1.25rem; border-radius: 20px; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h4 style="color: #0F172A; font-size: 1.05rem;">Database Backup Policy</h4>
            <p style="font-size: 0.85rem; color: #64748B;">
              Each backup trigger writes a timestamped JSON snapshot to the private server backup directory and records the event below.
            </p>
          </div>
        </div>

        <!-- AUDIT LOGS TABLE -->
        <h3 style="color: #0F172A; font-size: 1.15rem; margin-bottom: 1rem;">Audit Log Registry (${logs.length} Logged Events)</h3>

        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Identity</th>
                <th>Action Type</th>
                <th>Module</th>
                <th>IP Location</th>
                <th>Event Details</th>
              </tr>
            </thead>
            <tbody>
              ${loading ? `
                <tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading audit logs...</td></tr>
              ` : logs.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No audit events recorded yet.</td></tr>
              ` : logs.map(log => `
                <tr>
                  <td style="white-space: nowrap; font-size: 0.82rem; color: var(--text-muted);">${new Date(log.timestamp).toLocaleString()}</td>
                  <td><strong style="color: #0F172A;">${escapeHtml(log.user)}</strong></td>
                  <td>
                    <span class="badge" style="background: rgba(0, 168, 107, 0.15); color: var(--primary); border: 1px solid rgba(0, 168, 107, 0.3);">
                      ${escapeHtml(log.action)}
                    </span>
                  </td>
                  <td>${escapeHtml(log.module)}</td>
                  <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(log.ip)}</td>
                  <td style="font-size: 0.88rem; color: var(--text-main);">${escapeHtml(typeof log.details === 'string' ? log.details : JSON.stringify(log.details))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Handlers
    container.querySelector('#trigger-backup-btn')?.addEventListener('click', async () => {
      try {
        const backup = await stateEngine.triggerBackup();
        showAdminToast({ title: 'Backup snapshot created', message: backup.fileName });
        stateEngine.loadAuditLogs().catch(() => {});
      } catch (err) {
        showAdminToast({ title: 'Backup failed', message: err.message || 'Please try again.', tone: 'danger' });
        render();
      }
    });
  }

  render();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
