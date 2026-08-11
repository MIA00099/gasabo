/**
 * UNIFIED ADMIN PANEL - Gasabo Real Estate Content Management System (CMS)
 */
import { stateEngine } from '../../store/stateEngine.js';

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
              Manage the company homepage hero content and flagship real estate development portfolio.
            </p>
          </div>

          <button id="admin-add-proj-btn" class="btn btn-primary">
            ➕ Add Portfolio Project
          </button>
        </div>

        ${state.error ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.9rem;">
            ⚠️ ${escapeHtml(state.error)}
          </div>
        ` : ''}

        <!-- HERO & ABOUT EDITORS -->
        <div class="glass-panel" style="padding: 1.25rem 1.4rem; border-radius: 20px; margin-bottom: 1.25rem;">
          <h3 style="color: #0F172A; font-size: 1.1rem; margin-bottom: 1rem;">Hero Showcase & Corporate Info</h3>
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

        <!-- PORTFOLIO PROJECTS TABLE -->
        <h3 style="color: #0F172A; font-size: 1.15rem; margin-bottom: 1rem;">Active Real Estate Development Projects (${reData.projects.length})</h3>

        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Project Title</th>
                <th>Category</th>
                <th>District Location</th>
                <th>Units / Specs</th>
                <th>Development Status</th>
                <th class="tbl-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${reData.projects.map(p => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <img src="${p.image}" alt="${escapeHtml(p.title)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                      <div>
                        <div style="font-weight: 600; color: #0F172A;">${escapeHtml(p.title)}</div>
                        <div style="font-size: 0.78rem; color: #64748B;">${escapeHtml(p.description.substring(0, 45))}...</div>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(p.category)}</td>
                  <td>${escapeHtml(p.district)}</td>
                  <td>${escapeHtml(p.units)}</td>
                  <td><span class="badge badge-active">${escapeHtml(p.status)}</span></td>
                  <td class="tbl-actions-col">
                    <button class="btn btn-sm btn-danger del-proj-btn" data-id="${p.id}">
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

    container.querySelector('#admin-add-proj-btn')?.addEventListener('click', async () => {
      const title = prompt('Enter Project Title (e.g. Kigali Eco Residences):');
      if (title) {
        const district = prompt('District (e.g. Gasabo, Musanze, Rubavu):') || 'Gasabo';
        const category = prompt('Category (Residential / Commercial / Industrial & Land):') || 'Residential';
        const units = prompt('Units/Capacity (e.g. 30 Luxury Condos):') || '20 Units';
        try {
          await stateEngine.addRealEstateProject({ title, district, category, units });
        } catch (err) {
          render();
        }
      }
    });

    container.querySelectorAll('.del-proj-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this portfolio project?')) {
          try {
            await stateEngine.deleteRealEstateProject(btn.dataset.id);
          } catch (err) {
            render();
          }
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
