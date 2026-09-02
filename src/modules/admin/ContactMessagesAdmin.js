/**
 * UNIFIED ADMIN PANEL - Contact Messages Module
 *
 * The inbox for the public "Contact Us" form (POST /api/contact). Gated on the
 * REPORTS permission (server enforces the same - see contact.routes.ts).
 */
import { stateEngine } from '../../store/stateEngine.js';

const STATUS_TABS = [
  ['all', 'All'],
  ['NEW', 'New'],
  ['READ', 'Read'],
  ['ARCHIVED', 'Archived'],
];

const STATUS_BADGE = {
  NEW: 'background: #DBEAFE; color: #1D4ED8; border: 1px solid #BFDBFE;',
  READ: 'background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0;',
  ARCHIVED: 'background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;',
};

export function renderContactMessagesAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const attempted = state.loading.contactMessages !== undefined;
    if (!attempted) stateEngine.loadContactMessages().catch(() => {});

    const loading = !!state.loading.contactMessages || !attempted;
    const all = state.contactMessages || [];
    const filter = state.ui.contactMessagesFilter || 'all';
    const messages = filter === 'all' ? all : all.filter((m) => m.status === filter);
    const newCount = all.filter((m) => m.status === 'NEW').length;

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #0F172A; font-size: 1.3rem;">📨 Contact Messages</h2>
            <p style="color: #64748B; font-size: 0.9rem;">
              Messages sent through the public Contact Us form. ${newCount} unread.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; background: #F1F5F9; padding: 4px; border-radius: 12px; border: 1px solid #E2E8F0; flex-wrap: wrap;">
            ${STATUS_TABS.map(([key, label]) => `
              <button class="btn btn-sm contact-filter-btn" data-filter="${key}"
                style="color:${filter === key ? '#fff' : '#64748B'}; background:${filter === key ? 'var(--primary)' : 'transparent'};">
                ${label}${key === 'NEW' && newCount > 0 ? ` (${newCount})` : ''}
              </button>
            `).join('')}
          </div>
        </div>

        ${state.error ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
            ⚠️ ${escapeHtml(state.error)}
          </div>
        ` : ''}

        ${loading ? `
          <div style="text-align: center; padding: 3rem; color: #64748B;">Loading messages…</div>
        ` : messages.length === 0 ? `
          <div style="text-align: center; padding: 3rem; background: #F8FAFC; border-radius: var(--radius-md); border: 1px dashed #E2E8F0; color: #64748B;">
            ${filter === 'all' ? 'No contact messages yet.' : `No ${filter.toLowerCase()} messages.`}
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${messages.map((m) => `
              <div class="glass-panel" style="padding: 1.1rem 1.3rem; border-radius: 18px; border-left: 4px solid ${m.status === 'NEW' ? '#2563EB' : m.status === 'ARCHIVED' ? '#D97706' : '#CBD5E1'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                  <div style="min-width: 220px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <strong style="color: #0F172A; font-size: 1rem;">${escapeHtml(m.subject || '(no subject)')}</strong>
                      <span class="badge" style="${STATUS_BADGE[m.status] || STATUS_BADGE.READ} font-size: 0.7rem;">${escapeHtml(m.status)}</span>
                    </div>
                    <div style="font-size: 0.83rem; color: #64748B; margin-top: 0.25rem;">
                      👤 ${escapeHtml(m.name)} &nbsp;•&nbsp;
                      <a href="mailto:${escapeHtml(m.email)}" style="color: var(--primary); font-weight: 600;">${escapeHtml(m.email)}</a>
                      ${m.phone ? ` &nbsp;•&nbsp; 📞 ${escapeHtml(m.phone)}` : ''}
                    </div>
                  </div>
                  <div style="font-size: 0.76rem; color: #94A3B8; white-space: nowrap;">
                    ${new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>

                <p style="font-size: 0.9rem; color: #334155; margin: 0.7rem 0 0; white-space: pre-wrap; line-height: 1.55;">${escapeHtml(m.message)}</p>

                <div style="display: flex; gap: 0.5rem; margin-top: 0.9rem; flex-wrap: wrap;">
                  ${m.status !== 'READ' ? `<button class="btn btn-sm contact-status-btn" data-id="${m.id}" data-status="READ" style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;">Mark read</button>` : ''}
                  ${m.status !== 'ARCHIVED' ? `<button class="btn btn-sm contact-status-btn" data-id="${m.id}" data-status="ARCHIVED" style="background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A;">Archive</button>` : ''}
                  ${m.status !== 'NEW' ? `<button class="btn btn-sm contact-status-btn" data-id="${m.id}" data-status="NEW" style="background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0;">Reopen</button>` : ''}
                  <a class="btn btn-sm" href="mailto:${escapeHtml(m.email)}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message to Kigali Market'))}" style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;">Reply by email</a>
                  <button class="btn btn-sm btn-danger contact-delete-btn" data-id="${m.id}">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('.contact-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => stateEngine.setUI({ contactMessagesFilter: btn.dataset.filter }));
    });

    container.querySelectorAll('.contact-status-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await stateEngine.setContactMessageStatus(btn.dataset.id, btn.dataset.status);
        } catch { /* state.error already set */ }
      });
    });

    container.querySelectorAll('.contact-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this contact message permanently?')) return;
        try {
          await stateEngine.deleteContactMessage(btn.dataset.id);
        } catch { /* state.error already set */ }
      });
    });
  }

  render();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}
