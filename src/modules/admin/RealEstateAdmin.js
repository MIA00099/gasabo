/**
 * UNIFIED ADMIN PANEL - Gasabo Real Estate Content Management System (CMS)
 */
import { stateEngine } from '../../store/stateEngine.js';

export function renderRealEstateAdmin(container) {
  function render() {
    const state = stateEngine.getState();
    const reData = state.realEstate;

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="color: #fff; font-size: 1.5rem;">🏢 Gasabo Real Estate Content Management</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Manage company homepage, services showcase, flagship real estate developments, gallery assets, and office contact information.
            </p>
          </div>

          <button id="admin-add-proj-btn" class="btn btn-primary">
            ➕ Add Portfolio Project
          </button>
        </div>

        <!-- HERO & ABOUT EDITORS -->
        <div class="glass-panel" style="padding: 1.5rem; border-radius: var(--radius-md); margin-bottom: 2rem;">
          <h3 style="color: #fff; font-size: 1.1rem; margin-bottom: 1rem;">Hero Showcase & Corporate Info</h3>
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
        <h3 style="color: #fff; font-size: 1.15rem; margin-bottom: 1rem;">Active Real Estate Development Projects (${reData.projects.length})</h3>
        
        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Project Title</th>
                <th>Category</th>
                <th>District Location</th>
                <th>Units / Specs</th>
                <th>Development Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${reData.projects.map(p => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <img src="${p.image}" alt="${escapeHtml(p.title)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                      <div>
                        <div style="font-weight: 600; color: #fff;">${escapeHtml(p.title)}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(p.description.substring(0, 45))}...</div>
                      </div>
                    </div>
                  </td>
                  <td>${p.category}</td>
                  <td>${escapeHtml(p.district)}</td>
                  <td>${escapeHtml(p.units)}</td>
                  <td><span class="badge badge-active">${p.status}</span></td>
                  <td>
                    <button class="btn btn-sm btn-secondary">Edit</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event Handlers
    container.querySelector('#save-re-hero')?.addEventListener('click', () => {
      reData.hero.title = container.querySelector('#re-hero-title').value;
      reData.hero.subtitle = container.querySelector('#re-hero-sub').value;
      stateEngine.saveState();
      stateEngine.logAudit(state.currentUser.name, 'REALESTATE_CMS_UPDATE', 'Real Estate Admin', 'Updated hero headline & subtitle content.');
      alert('Gasabo Real Estate Hero Content updated successfully!');
    });

    container.querySelector('#admin-add-proj-btn')?.addEventListener('click', () => {
      const title = prompt('Enter Project Title (e.g. Kigali Eco Residences):');
      if (title) {
        const district = prompt('District (e.g. Gasabo, Musanze, Rubavu):') || 'Gasabo';
        const category = prompt('Category (Residential / Commercial / Industrial & Land):') || 'Residential';
        const units = prompt('Units/Capacity (e.g. 30 Luxury Condos):') || '20 Units';
        const image = '/real-estate-hero.png';
        reData.projects.push({
          id: 're_' + Date.now(),
          title,
          category,
          district,
          units,
          status: 'Under Development',
          image,
          description: 'Newly announced flagship development by Gasabo Real Estate.'
        });
        stateEngine.saveState();
        render();
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
