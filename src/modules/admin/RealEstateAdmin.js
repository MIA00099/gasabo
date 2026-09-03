/**
 * UNIFIED ADMIN PANEL - Gasabo Real Estate Content Management System (CMS)
 */
import { stateEngine } from '../../store/stateEngine.js';

const PROPERTY_TYPE_LABELS = { house: '🏠 House', plot: '🟩 Plot / Land', commercial: '🏢 Commercial' };

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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #0F172A; font-size: 1.3rem;">🏢 Gasabo Real Estate Content Management</h2>
            <p style="color: #64748B; font-size: 0.9rem;">
              Manage homepage content, contact details, service cards, and individual property listings.
            </p>
          </div>

          <button id="admin-add-property-btn" class="btn btn-primary">
            ➕ Add Property Listing
          </button>
        </div>

        ${state.error ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
            ⚠️ ${escapeHtml(state.error)}
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
            💾 Save Hero Content
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
            <label>Services JSON</label>
            <textarea id="re-services-json" class="form-control" rows="8" spellcheck="false">${escapeHtml(JSON.stringify(reData.services || [], null, 2))}</textarea>
          </div>
          <div id="re-sections-error" style="color:#991B1B;font-size:0.85rem;margin-bottom:0.75rem;"></div>
          <button id="save-re-sections" class="btn btn-secondary btn-sm">
            💾 Save Company Sections
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
        alert('Gasabo Real Estate Hero Content updated successfully!');
      } catch (err) {
        render();
      }
    });

    container.querySelector('#save-re-sections')?.addEventListener('click', async () => {
      const error = container.querySelector('#re-sections-error');
      error.textContent = '';
      let services;
      try {
        services = JSON.parse(container.querySelector('#re-services-json').value || '[]');
        if (!Array.isArray(services)) throw new Error('Services JSON must be an array.');
      } catch (err) {
        error.textContent = err.message || 'Services JSON is invalid.';
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
        alert('Gasabo Real Estate company sections updated successfully!');
      } catch (err) {
        error.textContent = err.message || 'Could not save company sections.';
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
        if (confirm('Are you sure you want to delete this property listing?')) {
          try {
            await stateEngine.deleteRealEstateProperty(btn.dataset.id);
          } catch (err) {
            render();
          }
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
        if (!confirm('Delete this inquiry permanently?')) return;
        try {
          await stateEngine.deleteRealEstateInquiry(btn.dataset.id);
        } catch (err) { /* state.error already set */ }
      });
    });
  }

  render();
}

function renderInquiriesSection(state) {
  const all = state.realEstateInquiries || [];
  const loading = !!state.loading.realEstateInquiries || state.loading.realEstateInquiries === undefined;
  const filter = state.ui.realEstateInquiryFilter || 'all';
  const list = filter === 'all' ? all : all.filter((i) => i.status === filter);
  const newCount = all.filter((i) => i.status === 'NEW').length;

  return `
    <h3 style="color: #0F172A; font-size: 1.15rem; margin: 2rem 0 1rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
      📨 Inquiries
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
      <div style="text-align: center; padding: 2rem; background: #F8FAFC; border-radius: var(--radius-md); border: 1px dashed #E2E8F0; color: #64748B;">
        ${filter === 'all' ? 'No inquiries yet. Submissions from the Gasabo "Talk To Gasabo Real Estate" form appear here.' : `No ${filter.toLowerCase()} inquiries.`}
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
                  📞 <a href="tel:${escapeHtml(String(i.phone).replace(/\s+/g, ''))}" style="color: var(--primary); font-weight: 600;">${escapeHtml(i.phone)}</a>
                  ${i.propertyTitle ? ` &nbsp;•&nbsp; 🏠 ${escapeHtml(i.propertyTitle)}` : ''}
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
  const districts = stateEngine.getState().districts;
  let imageMode = 'upload'; // 'upload' | 'url'
  let imageUrls = Array.isArray(propertyToEdit?.images)
    ? [...propertyToEdit.images]
    : propertyToEdit?.image
      ? [propertyToEdit.image]
      : []; // a property is a gallery now, not a single photo
  let imageUploading = false;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(2,6,23,0.65); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1.5rem; overflow-y: auto;';

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
        ${imageUrls.length} photo${imageUrls.length > 1 ? 's' : ''} added${imageUrls.length > 1 ? ' — the first one is the cover.' : '.'}
      </div>
    `;
  }

  function renderImageSection() {
    return `
      <div style="display: flex; gap: 0.5rem; margin-bottom: 0.6rem;">
        <button type="button" id="img-mode-upload-btn" class="btn btn-sm" style="background:${imageMode==='upload'?'var(--primary)':'#F1F5F9'}; color:${imageMode==='upload'?'#fff':'#64748B'};">
          📁 Upload from Device
        </button>
        <button type="button" id="img-mode-url-btn" class="btn btn-sm" style="background:${imageMode==='url'?'var(--primary)':'#F1F5F9'}; color:${imageMode==='url'?'#fff':'#64748B'};">
          🔗 Paste Image URL
        </button>
      </div>
      ${imageMode === 'upload' ? `
        <input type="file" id="p-image-file" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="form-control" ${imageUploading ? 'disabled' : ''}>
        <div style="font-size: 0.78rem; color: #64748B; margin-top: 0.4rem;">Select one or more photos — JPEG, PNG, WEBP, or GIF, max 5MB each.</div>
        ${imageUploading ? `
          <div style="margin-top: 0.75rem; color: #64748B; font-size: 0.85rem;">⏳ Uploading...</div>
        ` : ''}
      ` : `
        <div style="display: flex; gap: 0.5rem;">
          <input type="url" id="p-image-url" class="form-control" placeholder="https://..." style="flex: 1;">
          <button type="button" id="p-image-url-add" class="btn btn-sm btn-secondary">➕ Add</button>
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
          overlay.querySelector('#add-property-error').textContent = `⚠️ ${failed.length} photo${failed.length > 1 ? 's' : ''} failed to upload; the rest were added.`;
        }
      } catch (err) {
        overlay.querySelector('#add-property-error').textContent = `⚠️ ${err.message || 'Image upload failed. Please try again.'}`;
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
    <div style="background: #fff; border-radius: 20px; padding: 1.75rem 2rem; max-width: 560px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <h3 style="color: #0F172A; font-size: 1.2rem; margin-bottom: 1.25rem;">${isEditing ? '✏️ Edit Property Listing' : '➕ Add Property Listing'}</h3>

      <form id="add-property-form">
        <div class="form-group">
          <label>Title</label>
          <input name="title" type="text" class="form-control" placeholder="e.g. Modern 4-Bedroom Villa" value="${escapeHtml(propertyToEdit?.title || '')}" required>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label>Type</label>
            <select name="type" class="form-control">
              <option value="house" ${propertyToEdit?.type === 'house' ? 'selected' : ''}>🏠 House</option>
              <option value="plot" ${propertyToEdit?.type === 'plot' ? 'selected' : ''}>🟩 Plot / Land</option>
              <option value="commercial" ${propertyToEdit?.type === 'commercial' ? 'selected' : ''}>🏢 Commercial</option>
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
          <div style="font-size:0.78rem;color:#64748B;margin-top:0.3rem;">Paste a YouTube link and a ▶ play badge appears on the listing.</div>
        </div>

        <div id="add-property-error" style="color:#991B1B;font-size:0.85rem;margin-bottom:0.75rem;"></div>

        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
          <button type="button" id="add-property-cancel" class="btn btn-sm btn-secondary">Cancel</button>
          <button type="submit" id="add-property-submit" class="btn btn-sm btn-primary">${isEditing ? 'Save Changes' : 'Add Listing'}</button>
        </div>
      </form>
    </div>
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
      form.querySelector('#add-property-error').textContent = `⚠️ ${message}`;
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
