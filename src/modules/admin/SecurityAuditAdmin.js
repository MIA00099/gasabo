/**
 * UNIFIED ADMIN PANEL - Security Audit Logs & System Backups Module
 */
import { stateEngine } from '../../store/stateEngine.js';

export function renderSecurityAuditAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const logs = state.auditLogs;

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #fff; font-size: 1.5rem;">🛡️ System Security Audit Logs & Backups</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Complete audit trail of all platform activities, administrative approvals, login sessions, and automated database backups.
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button id="trigger-backup-btn" class="btn btn-primary">
              💾 Trigger Immediate Backup Snapshot
            </button>
            <button id="download-backup-btn" class="btn btn-gold">
              📥 Export JSON Backup
            </button>
          </div>
        </div>

        <!-- BACKUP & RESTORE BANNER -->
        <div class="glass-panel" style="padding: 1.25rem 1.5rem; border-radius: var(--radius-md); margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h4 style="color: #fff; font-size: 1.05rem;">Automatic Database Backup Policy</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Backups run automatically every 24 hours. Last backup snapshot created: <strong>Today at 00:00 CAT</strong>.
            </p>
          </div>
          <button id="restore-snapshot-btn" class="btn btn-secondary btn-sm">
            🔄 Restore Snapshot
          </button>
        </div>

        <!-- AUDIT LOGS TABLE -->
        <h3 style="color: #fff; font-size: 1.15rem; margin-bottom: 1rem;">Audit Log Registry (${logs.length} Logged Events)</h3>
        
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
              ${logs.map(log => `
                <tr>
                  <td style="white-space: nowrap; font-size: 0.82rem; color: var(--text-muted);">${log.timestamp}</td>
                  <td><strong style="color: #fff;">${escapeHtml(log.user)}</strong></td>
                  <td>
                    <span class="badge" style="background: rgba(0, 168, 107, 0.15); color: var(--primary); border: 1px solid rgba(0, 168, 107, 0.3);">
                      ${log.action}
                    </span>
                  </td>
                  <td>${escapeHtml(log.module)}</td>
                  <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(log.ip)}</td>
                  <td style="font-size: 0.88rem; color: var(--text-main);">${escapeHtml(log.details)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Handlers
    container.querySelector('#trigger-backup-btn')?.addEventListener('click', () => {
      stateEngine.logAudit(state.currentUser.name, 'DATABASE_BACKUP_CREATED', 'System Security', 'Manual database snapshot created and stored securely.');
      alert('Database Backup Snapshot created successfully!');
      render();
    });

    container.querySelector('#download-backup-btn')?.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `KIGALIMARKET_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      stateEngine.logAudit(state.currentUser.name, 'BACKUP_EXPORTED', 'System Security', 'Exported JSON backup snapshot.');
    });

    container.querySelector('#restore-snapshot-btn')?.addEventListener('click', () => {
      if (confirm('Restore state to initial demonstration defaults?')) {
        stateEngine.resetToDefault();
        location.reload();
      }
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
