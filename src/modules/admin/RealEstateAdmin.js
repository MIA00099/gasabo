/**
 * UNIFIED ADMIN PANEL - Gasabo Real Estate Content Management System (CMS)
 */
import { stateEngine } from '../../store/stateEngine.js';
import { showAdminConfirm, showAdminToast } from './adminDialog.js';

const PROPERTY_TYPE_LABELS = { house: 'House', plot: 'Plot / Land', commercial: 'Commercial' };

const INQUIRY_TABS = [['all', 'All'], ['NEW', 'New'], ['READ', 'Read'], ['ARCHIVED', 'Archived']];
const INQUIRY_BADGE = {
  NEW: 'background: #DBEAFE; color: #1D4ED8; border: 1px solid #BFDBFE;',
  READ: 'background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0;',
  ARCHIVED: 'background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;',
};
const waDigits = (phone) => String(phone || '').replace(/[^\d]/g, '').replace(/^0/, '250');

export function renderRealEstateAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const reData = state.realEstate;
    const attempted = state.loading.realEstate !== undefined;

    if (!attempted) stateEngine.loadRealEstate().catch(() => {});
    if (state.loading.realEstateInquiries === undefined) stateEngine.loadRealEstateInquiries().catch(() => {});

    if (!reData.hero) {
      container.innerHTML = `<div style="text-align:center; padding: 3rem; color: #64748B;">Loading real estate content...</div>`;
      return;
    }

    container.innerHTML = `
      <div>
        <div class="adm-module-header">
          <div>
            <h2 class="adm-module-title">Gasabo Real Estate CMS</h2>
            <p class="adm-module-copy">
              Manage homepage content, contact details, service cards, and individual property listings.
            </p>
          </div>

          <button id="admin-add-property-btn" class="btn btn-primary">
            Add property listing
          </button>
        </div>

        ${state.error ? `
          <div class="adm-inline-alert">
            <strong>Real estate CMS error</strong>
            ${escapeHtml(state.error)}
          </div>
        ` : ''}

        <!-- HERO EDITOR -->
        <div class="glass-panel" style="padding: 1.25rem 1.4rem; border-radius: 20px; margin-bottom: 1.25rem;">
          <h3 style="color: #0F172A; font-size: 1.1rem; margin-bottom: 1rem;">Hero Showcase</h3>
          <div class="grid-2">
            <div class="form-group">
              <label>Hero Title</label>
              <input type="text" id="re-hero-title" class="form-control" value="${escapeHtml(reData.hero.title)}">
            </div>
            <div class="form-group">
              <label>Hero Subtitle</label>
              <input type="text" id="re-hero-sub" class="form-control" value="${escapeHtml(reData.hero.subtitle)}">
            </div>
          </div>
          <button id="save-re-hero" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem;">
            Save hero content
          </button>
        </div>

        <!-- ABOUT / CONTACT / SERVICES EDITOR -->
        <div class="glass-panel" style="padding: 1.25rem 1.4rem; border-radius: 20px; margin-bottom: 1.25rem;">
          <h3 style="color: #0F172A; font-size: 1.1rem; margin-bottom: 1rem;">Company Sections</h3>
          <div class="grid-2">
            <div class="form-group">
              <label>About Heading</label>
              <input type="text" id="re-about-heading" class="form-control" value="${escapeHtml(reData.about?.heading || '')}">
            </div>
            <div class="form-group">
              <label>Contact Phone</label>
              <input type="text" id="re-contact-phone" class="form-control" value="${escapeHtml(reData.contact?.phone || '')}">
            </div>
          </div>
          <div class="form-group">
            <label>About Text</label>
            <textarea id="re-about-text" class="form-control" rows="3">${escapeHtml(reData.about?.text || '')}</textarea>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Contact Email</label>
              <input type="email" id="re-contact-email" class="form-control" value="${escapeHtml(reData.contact?.email || '')}">
            </div>
            <div class="form-group">
              <label>Contact Address</label>
              <input type="text" id="re-contact-address" class="form-control" value="${escapeHtml(reData.contact?.address || '')}">
            </div>
          </div>
          <div class="form-group">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;margin-bottom:0.75rem;flex-wrap:wrap;">
              <div>
                <label style="margin-bottom:0.2rem;">Services</label>
                <div style="font-size:0.78rem;color:#64748B;">Add, edit, feature, reorder, or remove service cards. No JSON editing required.</div>
              </div>
              <button type="button" id="re-add-service" class="btn btn-primary btn-sm">+ Add service</button>
            </div>
            <div id="re-services-editor" style="display:none;flex-direction:column;gap:0.75rem;">
              ${(reData.services || []).map((service, index) => serviceEditorHtml(service, index)).join('')}
            </div>
          </div>
          <div id="re-sections-error" style="color:#991B1B;font-size:0.85rem;margin-bottom:0.75rem;"></div>
          <button id="save-re-sections" class="btn btn-secondary btn-sm">
            Save company sections
          </button>
        </div>

        <!-- PROPERTY LISTINGS TABLE -->
        <h3 style="color: #0F172A; font-size: 1.15rem; margin-bottom: 1rem;">Property Listings (${reData.properties.length})</h3>

        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Location</th>
                <th>Price</th>
                <th>Area</th>
                <th class="tbl-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${reData.properties.map(p => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                      <div>
                        <div style="font-weight: 600; color: #0F172A;">${escapeHtml(p.title)}</div>
                        <div style="font-size: 0.78rem; color: #64748B;">${escapeHtml((p.description || '').substring(0, 45))}...</div>
                      </div>
                    </div>
                  </td>
                  <td>${PROPERTY_TYPE_LABELS[p.type] || escapeHtml(p.type)}</td>
                  <td>${escapeHtml(p.location)}</td>
                  <td style="font-weight: 700; color: #0F172A;">${escapeHtml(p.price)}</td>
                  <td>📐 ${escapeHtml(p.area)}</td>
                  <td class="tbl-actions-col">
                    <button class="btn btn-sm btn-secondary edit-property-btn" data-id="${p.id}" style="margin-right: 4px;">
                      Edit
                    </button>
                    <button class="btn btn-sm btn-danger del-property-btn" data-id="${p.id}">
                      Delete
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${renderInquiriesSection(state)}
      </div>
    `;

    // Event Handlers
    container.querySelector('#save-re-hero')?.addEventListener('click', async () => {
      const title = container.querySelector('#re-hero-title').value;
      const subtitle = container.querySelector('#re-hero-sub').value;
      try {
        await stateEngine.saveRealEstateHero({ title, subtitle });
        showAdminToast({ title: 'Hero content saved', message: 'Gasabo Real Estate hero copy was updated.' });
      } catch (err) {
        showAdminToast({ title: 'Save failed', message: err.message || 'Please try again.', tone: 'danger' });
        render();
      }
    });

    bindServiceEditor(container);

    container.querySelector('#save-re-sections')?.addEventListener('click', async () => {
      const error = container.querySelector('#re-sections-error');
      error.textContent = '';
      const services = collectServices(container);
      if (!services) {
        error.textContent = 'Every service needs a title and description.';
        return;
      }

      try {
        await stateEngine.saveRealEstateSection('ABOUT', {
          heading: container.querySelector('#re-about-heading').value.trim(),
          text: container.querySelector('#re-about-text').value.trim(),
        });
        await stateEngine.saveRealEstateSection('CONTACT', {
          phone: container.querySelector('#re-contact-phone').value.trim(),
          email: container.querySelector('#re-contact-email').value.trim(),
          address: container.querySelector('#re-contact-address').value.trim(),
        });
        await stateEngine.saveRealEstateSection('SERVICES', services);
        showAdminToast({ title: 'Company sections saved', message: 'About, contact, and service content were updated.' });
      } catch (err) {
        error.textContent = err.message || 'Could not save company sections.';
        showAdminToast({ title: 'Save failed', message: error.textContent, tone: 'danger' });
      }
    });

    container.querySelector('#admin-add-property-btn')?.addEventListener('click', () => {
      openAddPropertyModal();
    });

    container.querySelectorAll('.edit-property-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = reData.properties.find(p => p.id === btn.dataset.id);
        if (prop) openAddPropertyModal(prop);
      });
    });

    container.querySelectorAll('.del-property-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showAdminConfirm({
          title: 'Delete property listing',
          message: 'This removes the real estate listing from the CMS.',
          confirmLabel: 'Delete listing',
          tone: 'danger',
        });
        if (!confirmed) return;
        try {
          await stateEngine.deleteRealEstateProperty(btn.dataset.id);
          showAdminToast({ title: 'Property listing deleted', tone: 'warning' });
        } catch (err) {
          showAdminToast({ title: 'Delete failed', message: err.message || 'Please try again.', tone: 'danger' });
          render();
        }
      });
    });

    // Inquiries panel
    container.querySelectorAll('.re-inq-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => stateEngine.setUI({ realEstateInquiryFilter: btn.dataset.filter }));
    });
    container.querySelectorAll('.re-inq-status-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await stateEngine.setRealEstateInquiryStatus(btn.dataset.id, btn.dataset.status);
        } catch (err) { /* state.error already set */ }
      });
    });
    container.querySelectorAll('.re-inq-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const confirmed = await showAdminConfirm({
          title: 'Delete real estate inquiry',
          message: 'This permanently removes the inquiry from the admin inbox.',
          confirmLabel: 'Delete inquiry',
          tone: 'danger',
        });
        if (!confirmed) return;
        try {
          await stateEngine.deleteRealEstateInquiry(btn.dataset.id);
          showAdminToast({ title: 'Inquiry deleted', tone: 'warning' });
        } catch (err) {
          showAdminToast({ title: 'Delete failed', message: err.message || 'Please try again.', tone: 'danger' });
        }
      });
    });
  }

  render();
}


function serviceEditorHtml(service = {}, index = 0) {
  const icon = service.icon || '🏠';
  const isImage = /^https?:\/\//i.test(String(icon));
  const presets = ['🏠', '🏢', '🏗️', '🔑', '📐', '💰', '🛡️', '🤝'];
  return `
    <div class="re-service-editor-card" style="border:1px solid #E2E8F0;border-radius:14px;padding:1rem;background:#F8FAFC;" data-service-index="${index}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.8rem;">
        <strong style="color:#0F172A;">Service ${index + 1}</strong>
        <div style="display:flex;gap:0.35rem;">
          <button type="button" class="btn btn-sm re-service-up" title="Move up">↑</button>
          <button type="button" class="btn btn-sm re-service-down" title="Move down">↓</button>
          <button type="button" class="btn btn-sm btn-danger re-service-delete">Delete</button>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label>Title</label>
          <input type="text" class="form-control re-service-title" value="${escapeHtml(String(service.title || ''))}" placeholder="e.g. Property Management">
        </div>
        <div class="form-group">
          <label>Icon</label>
          <div style="display:flex;gap:0.45rem;align-items:center;">
            <div class="re-service-icon-preview" style="width:42px;height:42px;border-radius:10px;background:#fff;border:1px solid #E2E8F0;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:1.3rem;flex-shrink:0;">
              ${isImage ? `<img src="${escapeHtml(String(icon))}" alt="" style="width:100%;height:100%;object-fit:cover;">` : escapeHtml(String(icon))}
            </div>
            <select class="form-control re-service-icon-preset" style="flex:1;">
              <option value="">Choose icon…</option>
              ${presets.map((p) => `<option value="${p}" ${p === icon ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            <label class="btn btn-sm btn-secondary" style="cursor:pointer;white-space:nowrap;">
              Upload
              <input type="file" class="re-service-icon-upload" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
            </label>
          </div>
          <input type="hidden" class="re-service-icon" value="${escapeHtml(String(icon))}">
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea class="form-control re-service-description" rows="2" placeholder="Describe this service">${escapeHtml(String(service.description || ''))}</textarea>
      </div>
      <label style="display:inline-flex;align-items:center;gap:0.5rem;font-size:0.85rem;font-weight:700;color:#334155;cursor:pointer;">
        <input type="checkbox" class="re-service-featured" ${service.featured ? 'checked' : ''}>
        Featured service
      </label>
    </div>
  `;
}

function refreshServiceLabels(editor) {
  editor.querySelectorAll('.re-service-editor-card').forEach((card, index) => {
    card.dataset.serviceIndex = String(index);
    const title = card.querySelector('strong');
    if (title) title.textContent = `Service ${index + 1}`;
  });
}

function collectServices(container) {
  const cards = [...container.querySelectorAll('.re-service-editor-card')];
  const services = cards.map((card) => ({
    icon: card.querySelector('.re-service-icon')?.value || '🏠',
    title: card.querySelector('.re-service-title')?.value.trim() || '',
    description: card.querySelector('.re-service-description')?.value.trim() || '',
    featured: !!card.querySelector('.re-service-featured')?.checked,
  }));
  return services.every((s) => s.title && s.description) ? services : null;
}

function bindServiceEditor(container) {
  const editor = container.querySelector('#re-services-editor');
  if (!editor) return;

  const bindCard = (card) => {
    card.querySelector('.re-service-delete')?.addEventListener('click', () => {
      card.remove();
      refreshServiceLabels(editor);
    });
    card.querySelector('.re-service-up')?.addEventListener('click', () => {
      if (card.previousElementSibling) editor.insertBefore(card, card.previousElementSibling);
      refreshServiceLabels(editor);
    });
    card.querySelector('.re-service-down')?.addEventListener('click', () => {
      if (card.nextElementSibling) editor.insertBefore(card.nextElementSibling, card);
      refreshServiceLabels(editor);
    });
    card.querySelector('.re-service-icon-preset')?.addEventListener('change', (e) => {
      if (!e.target.value) return;
      card.querySelector('.re-service-icon').value = e.target.value;
      card.querySelector('.re-service-icon-preview').textContent = e.target.value;
    });
    card.querySelector('.re-service-icon-upload')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = card.querySelector('.re-service-icon-preview');
      preview.textContent = '…';
      try {
        const { urls, failed } = await stateEngine.uploadProductImages([file]);
        if (!urls?.[0] || failed?.length) throw new Error('Icon upload failed.');
        const url = urls[0];
        card.querySelector('.re-service-icon').value = url;
        preview.innerHTML = `<img src="${escapeHtml(url)}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
        card.querySelector('.re-service-icon-preset').value = '';
      } catch (err) {
        preview.textContent = '⚠️';
        showAdminToast({ title: 'Icon upload failed', message: err.message || 'Please try again.', tone: 'danger' });
      }
    });
  };

  editor.querySelectorAll('.re-service-editor-card').forEach(bindCard);
  container.querySelector('#re-add-service')?.addEventListener('click', () => {
    // Keep the service editor collapsed until the admin explicitly chooses
    // Add service. Existing service cards become available for editing at the
    // same time, and the new service form is appended below them.
    editor.style.display = 'flex';
    const holder = document.createElement('div');
    holder.innerHTML = serviceEditorHtml({ icon: '🏠', title: '', description: '', featured: false }, editor.children.length);
    const card = holder.firstElementChild;
    editor.appendChild(card);
    bindCard(card);
    refreshServiceLabels(editor);
    card.querySelector('.re-service-title')?.focus();
  });
}

function renderInquiriesSection(state) {
  const all = state.realEstateInquiries || [];
  const loading = !!state.loading.realEstateInquiries || state.loading.realEstateInquiries === undefined;
  const filter = state.ui.realEstateInquiryFilter || 'all';
  const list = filter === 'all' ? all : all.filter((i) => i.status === filter);
  const newCount = all.filter((i) => i.status === 'NEW').length;

  return `
    <h3 style="color: #0F172A; font-size: 1.15rem; margin: 2rem 0 1rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
      Inquiries
      ${newCount > 0 ? `<span style="background: #DBEAFE; color: #1D4ED8; font-size: 0.75rem; font-weight: 800; padding: 2px 9px; border-radius: 9999px;">${newCount} new</span>` : ''}
      <span style="display: inline-flex; gap: 0.35rem; margin-left: auto; background: #F1F5F9; padding: 3px; border-radius: 10px; border: 1px solid #E2E8F0;">
        ${INQUIRY_TABS.map(([key, label]) => `
          <button class="btn btn-sm re-inq-filter-btn" data-filter="${key}"
            style="color:${filter === key ? '#fff' : '#64748B'}; background:${filter === key ? 'var(--primary)' : 'transparent'}; font-size: 0.78rem; padding: 3px 9px;">
            ${label}
          </button>
        `).join('')}
      </span>
    </h3>

    ${loading && all.length === 0 ? `
      <div style="text-align: center; padding: 2rem; color: #64748B;">Loading inquiries…</div>
    ` : list.length === 0 ? `
      <div class="adm-empty-state">
        <strong>${filter === 'all' ? 'No inquiries yet' : `No ${filter.toLowerCase()} inquiries`}</strong>
        Submissions from the Gasabo Real Estate contact form appear here.
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
        ${list.map((i) => `
          <div class="glass-panel" style="padding: 1rem 1.25rem; border-radius: 16px; border-left: 4px solid ${i.status === 'NEW' ? '#2563EB' : i.status === 'ARCHIVED' ? '#D97706' : '#CBD5E1'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
              <div style="min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <strong style="color: #0F172A;">${escapeHtml(i.name)}</strong>
                  <span class="badge" style="${INQUIRY_BADGE[i.status] || INQUIRY_BADGE.READ} font-size: 0.68rem;">${escapeHtml(i.status)}</span>
                </div>
                <div style="font-size: 0.83rem; color: #64748B; margin-top: 0.2rem;">
                  <a href="tel:${escapeHtml(String(i.phone).replace(/\s+/g, ''))}" style="color: var(--primary); font-weight: 600;">${escapeHtml(i.phone)}</a>
                  ${i.propertyTitle ? ` &nbsp;•&nbsp; ${escapeHtml(i.propertyTitle)}` : ''}
                </div>
              </div>
              <div style="font-size: 0.75rem; color: #94A3B8; white-space: nowrap;">${new Date(i.createdAt).toLocaleString()}</div>
            </div>
            ${i.message ? `<p style="font-size: 0.88rem; color: #334155; margin: 0.6rem 0 0; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(i.message)}</p>` : ''}
            <div style="display: flex; gap: 0.4rem; margin-top: 0.75rem; flex-wrap: wrap;">
              <a class="btn btn-sm" href="https://wa.me/${escapeHtml(waDigits(i.phone))}" target="_blank" rel="noopener noreferrer" style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;">WhatsApp</a>
              ${i.status !== 'READ' ? `<button class="btn btn-sm re-inq-status-btn" data-id="${i.id}" data-status="READ" style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;">Mark read</button>` : ''}
              ${i.status !== 'ARCHIVED' ? `<button class="btn btn-sm re-inq-status-btn" data-id="${i.id}" data-status="ARCHIVED" style="background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A;">Archive</button>` : ''}
              ${i.status !== 'NEW' ? `<button class="btn btn-sm re-inq-status-btn" data-id="${i.id}" data-status="NEW" style="background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0;">Reopen</button>` : ''}
              <button class="btn btn-sm btn-danger re-inq-delete-btn" data-id="${i.id}">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// image section repaints itself on upload, the rest of the form is untouched
// so typed values elsewhere in the form are never lost.
function openAddPropertyModal(propertyToEdit = null) {
  const isEditing = !!propertyToEdit;
  const districts = stateEngine.getState().districts;
  let imageMode = 'upload'; // 'upload' | 'url'
  let imageUrls = Array.isArray(propertyToEdit?.images)
    ? [...propertyToEdit.images]
    : propertyToEdit?.image
      ? [propertyToEdit.image]
      : []; // a property is a gallery now, not a single photo
  let imageUploading = false;

  const overlay = document.createElement('div');
  overlay.className = 'adm-dialog-backdrop';

  function renderPreviews() {
    if (!imageUrls.length) return '';
    return `
      <div style="margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
        ${imageUrls.map((url, i) => `
          <div style="position: relative; width: 80px; height: 80px;">
            <img src="${escapeHtml(url)}" alt="Photo ${i + 1}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">
            <button type="button" class="img-remove-btn" data-index="${i}" aria-label="Remove photo ${i + 1}"
              style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: #EF4444; color: #fff; border: none; font-size: 0.8rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
            ${i === 0 ? `<span style="position: absolute; bottom: 2px; left: 2px; background: rgba(4,86,45,0.9); color: #fff; font-size: 0.6rem; font-weight: 700; padding: 1px 5px; border-radius: 6px;">Cover</span>` : ''}
          </div>
        `).join('')}
      </div>
      <div style="font-size: 0.75rem; color: #64748B; margin-top: 0.35rem;">
        ${imageUrls.length} photo${imageUrls.length > 1 ? 's' : ''} added${imageUrls.length > 1 ? '. The first one is the cover.' : '.'}
      </div>
    `;
  }

  function renderImageSection() {
    return `
      <div style="display: flex; gap: 0.5rem; margin-bottom: 0.6rem;">
        <button type="button" id="img-mode-upload-btn" class="btn btn-sm" style="background:${imageMode==='upload'?'var(--primary)':'#F1F5F9'}; color:${imageMode==='upload'?'#fff':'#64748B'};">
          Upload from device
        </button>
        <button type="button" id="img-mode-url-btn" class="btn btn-sm" style="background:${imageMode==='url'?'var(--primary)':'#F1F5F9'}; color:${imageMode==='url'?'#fff':'#64748B'};">
          Paste image URL
        </button>
      </div>
      ${imageMode === 'upload' ? `
        <input type="file" id="p-image-file" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="form-control" ${imageUploading ? 'disabled' : ''}>
        <div style="font-size: 0.78rem; color: #64748B; margin-top: 0.4rem;">Select one or more photos. JPEG, PNG, WEBP, or GIF, max 5MB each.</div>
        ${imageUploading ? `
          <div style="margin-top: 0.75rem; color: #64748B; font-size: 0.85rem;">Uploading...</div>
        ` : ''}
      ` : `
        <div style="display: flex; gap: 0.5rem;">
          <input type="url" id="p-image-url" class="form-control" placeholder="https://..." style="flex: 1;">
          <button type="button" id="p-image-url-add" class="btn btn-sm btn-secondary">Add</button>
        </div>
      `}
      ${renderPreviews()}
    `;
  }

  function bindImageSectionEvents() {
    const section = overlay.querySelector('#add-property-image-section');
    const repaint = () => { section.innerHTML = renderImageSection(); bindImageSectionEvents(); };

    section.querySelector('#img-mode-upload-btn')?.addEventListener('click', () => { imageMode = 'upload'; repaint(); });
    section.querySelector('#img-mode-url-btn')?.addEventListener('click', () => { imageMode = 'url'; repaint(); });

    // Multiple files at once - the uploads run concurrently and each returns
    // its own URL; whatever lands is appended to the gallery, and any that
    // failed are reported without losing the ones that succeeded.
    section.querySelector('#p-image-file')?.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files || !files.length) return;
      imageUploading = true;
      repaint();
      try {
        const { urls, failed } = await stateEngine.uploadProductImages(files);
        imageUrls.push(...urls);
        if (failed.length) {
          overlay.querySelector('#add-property-error').textContent = `${failed.length} photo${failed.length > 1 ? 's' : ''} failed to upload; the rest were added.`;
        }
      } catch (err) {
        overlay.querySelector('#add-property-error').textContent = err.message || 'Image upload failed. Please try again.';
      } finally {
        imageUploading = false;
        repaint();
      }
    });

    section.querySelector('#p-image-url-add')?.addEventListener('click', () => {
      const input = section.querySelector('#p-image-url');
      const url = (input?.value || '').trim();
      if (!url) return;
      imageUrls.push(url);
      repaint();
    });

    section.querySelectorAll('.img-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        imageUrls.splice(Number(btn.dataset.index), 1);
        repaint();
      });
    });
  }

  overlay.innerHTML = `
    <section class="adm-dialog" role="dialog" aria-modal="true" aria-labelledby="property-dialog-title">
      <div class="adm-dialog-topline"></div>
      <div class="adm-dialog-header">
        <div>
          <div class="adm-dialog-kicker">Real Estate CMS</div>
          <h3 id="property-dialog-title" class="adm-dialog-title">${isEditing ? 'Edit property listing' : 'Add property listing'}</h3>
        </div>
      </div>

      <form id="add-property-form" class="adm-dialog-form">
        <div class="form-group">
          <label>Title</label>
          <input name="title" type="text" class="form-control" placeholder="e.g. Modern 4-Bedroom Villa" value="${escapeHtml(propertyToEdit?.title || '')}" required>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label>Type</label>
            <select name="type" class="form-control">
              <option value="house" ${propertyToEdit?.type === 'house' ? 'selected' : ''}>House</option>
              <option value="plot" ${propertyToEdit?.type === 'plot' ? 'selected' : ''}>Plot / Land</option>
              <option value="commercial" ${propertyToEdit?.type === 'commercial' ? 'selected' : ''}>Commercial</option>
            </select>
          </div>
          <div class="form-group">
            <label>Location / District</label>
            <select name="location" class="form-control">
              ${districts.map(d => `<option value="${d}" ${d === propertyToEdit?.location ? 'selected' : ''}>${d} District</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Price</label>
          <input name="price" type="text" class="form-control" placeholder="e.g. 150,000,000 Rwf or Rent: 800,000/mo" value="${escapeHtml(propertyToEdit?.price || '')}" required>
        </div>

        <div class="form-group">
          <label>Area</label>
          <input name="area" type="text" class="form-control" placeholder="e.g. 600 sqm or 1 Hectare" value="${escapeHtml(propertyToEdit?.area || '')}" required>
        </div>

        <div class="form-group">
          <label>Property Photo</label>
          <div id="add-property-image-section">${renderImageSection()}</div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea name="description" class="form-control" rows="3" placeholder="Short description shown on the listing" required>${escapeHtml(propertyToEdit?.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label>YouTube video tour <span style="color:#94A3B8;font-weight:400;">(optional)</span></label>
          <input name="videoUrl" type="url" class="form-control" placeholder="https://www.youtube.com/watch?v=..." value="${escapeHtml(propertyToEdit?.videoId ? `https://www.youtube.com/watch?v=${propertyToEdit.videoId}` : '')}">
          <div style="font-size:0.78rem;color:#64748B;margin-top:0.3rem;">Paste a YouTube link and a play badge appears on the listing.</div>
        </div>

        <div id="add-property-error" style="color:#991B1B;font-size:0.85rem;margin-bottom:0.75rem;"></div>

        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
          <button type="button" id="add-property-cancel" class="btn btn-sm btn-secondary">Cancel</button>
          <button type="submit" id="add-property-submit" class="btn btn-sm btn-primary">${isEditing ? 'Save Changes' : 'Add Listing'}</button>
        </div>
      </form>
    </section>
  `;

  bindImageSectionEvents();

  function close() {
    overlay.remove();
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#add-property-cancel').addEventListener('click', close);

  overlay.querySelector('#add-property-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = overlay.querySelector('#add-property-submit');
    const propertyData = {
      title: form.title.value.trim(),
      type: form.type.value,
      location: form.location.value,
      price: form.price.value.trim(),
      area: form.area.value.trim(),
      images: imageUrls,
      image: imageUrls[0] || undefined,
      videoUrl: form.videoUrl.value.trim(),
      description: form.description.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Saving...' : 'Adding...';
    try {
      if (isEditing) {
        await stateEngine.updateRealEstateProperty(propertyToEdit.id, propertyData);
      } else {
        await stateEngine.addRealEstateProperty(propertyData);
      }
      close();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditing ? 'Save Changes' : 'Add Listing';
      const message = err.message || 'Something went wrong. Please try again.';
      form.querySelector('#add-property-error').textContent = message;
    }
  });


  document.body.appendChild(overlay);
  overlay.querySelector('input[name="title"]').focus();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
