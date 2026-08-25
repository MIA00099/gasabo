/**
 * UNIFIED ADMIN PANEL - Gasabo Real Estate Content Management System (CMS)
 */
import { stateEngine } from '../../store/stateEngine.js';

const PROPERTY_TYPE_LABELS = { house: '🏠 House', plot: '🟩 Plot / Land', commercial: '🏢 Commercial' };

export function renderRealEstateAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const reData = state.realEstate;
    const attempted = state.loading.realEstate !== undefined;

    if (!attempted) stateEngine.loadRealEstate().catch(() => {});

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
              Manage the homepage hero content and individual property listings (houses, plots, commercial units).
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
                      <img src="${p.image}" alt="${escapeHtml(p.title)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
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
                    <button class="btn btn-sm btn-danger del-property-btn" data-id="${p.id}">
                      Delete
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
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

    container.querySelector('#admin-add-property-btn')?.addEventListener('click', () => {
      openAddPropertyModal();
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
  }

  render();
}

// One form for all property fields instead of a chain of 8 prompt() dialogs -
// appended to document.body so it survives the next stateEngine re-render,
// same pattern as the sub-admin creation modal in UserRBACAdmin.js. Image
// upload/preview state is kept in local closure vars (not stateEngine.setUI())
// since this overlay lives outside the normal render() cycle - only the
// image section repaints itself on upload, the rest of the form is untouched
// so typed values elsewhere in the form are never lost.
function openAddPropertyModal() {
  const districts = stateEngine.getState().districts;
  let imageMode = 'upload'; // 'upload' | 'url'
  let imageUrls = []; // a property is a gallery now, not a single photo
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
      <h3 style="color: #0F172A; font-size: 1.2rem; margin-bottom: 1.25rem;">➕ Add Property Listing</h3>

      <form id="add-property-form">
        <div class="form-group">
          <label>Title</label>
          <input name="title" type="text" class="form-control" placeholder="e.g. Modern 4-Bedroom Villa" required>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label>Type</label>
            <select name="type" class="form-control">
              <option value="house">🏠 House</option>
              <option value="plot">🟩 Plot / Land</option>
              <option value="commercial">🏢 Commercial</option>
            </select>
          </div>
          <div class="form-group">
            <label>Location / District</label>
            <select name="location" class="form-control">
              ${districts.map(d => `<option value="${d}">${d} District</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- One price field, not two.

             This used to ask for the price as text and again as a number
             "for search filtering", with nothing keeping them in step. In the
             live data they had drifted badly: a property priced 70,000,000
             carried a filter number of 500,000, another priced 502,000
             carried 780,000. Five of seven listings disagreed with
             themselves, so the price search was sorting them by a figure the
             page never showed. The number is derived from this text now. -->
        <div class="form-group">
          <label>Price</label>
          <input name="price" type="text" class="form-control" placeholder="e.g. 150,000,000 Rwf or Rent: 800,000/mo" required>
        </div>

        <div class="form-group">
          <label>Area</label>
          <input name="area" type="text" class="form-control" placeholder="e.g. 600 sqm or 1 Hectare" required>
        </div>

        <div class="form-group">
          <label>Property Photo</label>
          <div id="add-property-image-section">${renderImageSection()}</div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea name="description" class="form-control" rows="3" placeholder="Short description shown on the listing" required></textarea>
        </div>

        <div id="add-property-error" style="color:#991B1B;font-size:0.85rem;margin-bottom:0.75rem;"></div>

        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
          <button type="button" id="add-property-cancel" class="btn btn-sm btn-secondary">Cancel</button>
          <button type="submit" id="add-property-submit" class="btn btn-sm btn-primary">Add Listing</button>
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
      description: form.description.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
    try {
      await stateEngine.addRealEstateProperty(propertyData);
      close();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Listing';
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
