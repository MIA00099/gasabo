/**
 * GASABO REAL ESTATE - Corporate Website & Project Showcase Module
 */
import { stateEngine } from '../../store/stateEngine.js';
import { getLargeFooterHtml, bindLargeFooterEvents, initSlimStickyFooter } from '../../components/Footer.js';

export function renderRealEstateView(container) {
  function render() {
    const state = stateEngine.getState();
    const reData = state.realEstate;
    const hasAttempted = state.loading.realEstate !== undefined;
    const loading = !!state.loading.realEstate;

    // Kick off the fetch on first render only. Note this must NOT be gated behind
    // a separate stateEngine.setUI() call: setUI() notifies synchronously, which
    // would re-enter this render function (main.js remounts on every notify)
    // *before* the fetch below even starts, while reData is still empty - reading
    // straight off state.loading here instead avoids that reentrancy trap.
    if (!hasAttempted && !loading) {
      stateEngine.loadRealEstate().catch(() => {});
    }

    if (!hasAttempted || (loading && !reData.hero)) {
      container.innerHTML = `
        <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 1.1rem;">
          Loading Gasabo Real Estate...
        </div>
      `;
      return;
    }

    if (state.error && !reData.hero) {
      container.innerHTML = `
        <div style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: #991B1B;">
          <div>⚠️ ${escapeHtml(state.error)}</div>
          <button id="re-retry-btn" class="btn btn-primary">Retry</button>
        </div>
      `;
      container.querySelector('#re-retry-btn')?.addEventListener('click', () => stateEngine.loadRealEstate().catch(() => {}));
      return;
    }

    const activeFilter = state.ui.realEstateFilter || 'All'; // 'All' | 'Residential' | 'Commercial' | 'Industrial & Land'
    const activeTab = state.ui.realEstateTab || 'home'; // 'home' | 'about' | 'services' | 'projects' | 'gallery' | 'contact'

    const filteredProjects = activeFilter === 'All'
      ? reData.projects
      : reData.projects.filter(p => p.category === activeFilter);

    container.innerHTML = `
      <div style="max-width: 1440px; margin: 0 auto; padding: 2rem 1.5rem;">
        <!-- Real Estate Sub Navigation Bar -->
        <div class="glass-panel" style="padding: 0.75rem 1.5rem; border-radius: 30px; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <img src="/real-estate-logo.png" alt="Gasabo Real Estate Logo" style="height: 38px; width: 38px; border-radius: 8px; object-fit: contain; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <span style="font-weight: 800; font-size: 1.25rem; color: var(--text-primary);">GASABO REAL ESTATE</span>
          </div>

          <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
            ${['home', 'about', 'services', 'projects', 'gallery', 'contact'].map(tab => `
              <button class="btn btn-sm re-nav-tab" data-tab="${tab}" style="text-transform: capitalize; border-radius: 20px; font-weight: 700; color:${activeTab===tab?'#ffffff':'var(--text-secondary)'}; background:${activeTab===tab?'#2563eb':'transparent'};">
                ${tab === 'contact' ? '📞 Contact & Office' : tab}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- HERO SECTION -->
        <div class="glass-panel" style="position: relative; min-height: 420px; border-radius: var(--radius-lg); overflow: hidden; display: flex; align-items: center; padding: 3.5rem; margin-bottom: 3rem; background: linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.65) 100%), url('${reData.hero.bgImage}') center/cover;">
          <div style="max-width: 700px;">
            <span class="badge" style="background: rgba(37, 99, 235, 0.2); color: #93c5fd; border: 1px solid rgba(147, 197, 253, 0.4); margin-bottom: 1rem; font-weight: 800;">
              🏛️ Premier Rwandan Real Estate Developer
            </span>
            <h1 style="font-size: 2.8rem; line-height: 1.15; color: #ffffff; margin-bottom: 1rem; font-weight: 800;">
              ${escapeHtml(reData.hero.title)}
            </h1>
            <p style="font-size: 1.1rem; color: #cbd5e1; line-height: 1.6; margin-bottom: 2rem;">
              ${escapeHtml(reData.hero.subtitle)}
            </p>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <button id="re-explore-proj-btn" class="btn" style="background: #2563eb; color: #ffffff; font-weight: 700; font-size: 1rem; padding: 0.85rem 1.75rem;">
                🏢 Explore Portfolio Projects
              </button>
              <button id="re-contact-top-btn" class="btn btn-secondary" style="font-size: 1rem; font-weight: 700; padding: 0.85rem 1.75rem;">
                📍 Visit Kigali Headquarters
              </button>
            </div>
          </div>
        </div>

        <!-- SECTION 1: ABOUT COMPANY & STATS -->
        <div id="section-about" style="margin-bottom: 3.5rem;">
          <div class="grid-2" style="gap: 2.5rem; align-items: center;">
            <div>
              <span style="color: #2563eb; font-weight: 800; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em;">About Gasabo Real Estate</span>
              <h2 style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-top: 0.3rem; margin-bottom: 1rem;">
                ${escapeHtml(reData.about.heading)}
              </h2>
              <p style="color: var(--text-secondary); font-size: 1rem; line-height: 1.7; margin-bottom: 1.5rem;">
                ${escapeHtml(reData.about.text)}
              </p>

              <div class="grid-2" style="gap: 1rem;">
                ${reData.about.stats.map(s => `
                  <div class="glass-card" style="padding: 1.25rem; border-left: 5px solid #2563eb; background: #ffffff;">
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-primary);">${s.value}</div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">${s.label}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="position: relative; border-radius: var(--radius-lg); overflow: hidden; height: 380px; box-shadow: var(--shadow-soft-md);">
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80" alt="Gasabo Development" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          </div>
        </div>

        <!-- SECTION 2: SERVICES SHOWCASE -->
        <div id="section-services" style="margin-bottom: 3.5rem;">
          <div style="text-align: center; max-width: 650px; margin: 0 auto 2.5rem auto;">
            <span style="color: #2563eb; font-weight: 800; text-transform: uppercase; font-size: 0.85rem;">Solutions & Services</span>
            <h2 style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-top: 0.3rem;">Comprehensive Property Solutions</h2>
          </div>

          <div class="grid-4">
            ${reData.services.map(s => `
              <div class="glass-card" style="padding: 1.75rem; text-align: left; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff;">
                <div>
                  <div style="font-size: 2.5rem; margin-bottom: 1rem;">${s.icon}</div>
                  <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">${escapeHtml(s.title)}</h3>
                  <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">${escapeHtml(s.description)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SECTION 3: PORTFOLIO PROJECTS -->
        <div id="section-projects" style="margin-bottom: 3.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <span style="color: #2563eb; font-weight: 800; text-transform: uppercase; font-size: 0.85rem;">Development Portfolio</span>
              <h2 style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">Flagship Rwandan Real Estate</h2>
            </div>

            <!-- Filter Pills -->
            <div style="display: flex; gap: 0.5rem; background: #f1f5f9; padding: 4px; border-radius: 12px; border: 1px solid var(--border-color);">
              ${['All', 'Residential', 'Commercial', 'Industrial & Land'].map(filter => `
                <button class="btn btn-sm re-filter-btn" data-filter="${filter}" style="color:${activeFilter===filter?'#ffffff':'var(--text-secondary)'}; background:${activeFilter===filter?'#2563eb':'transparent'}; font-weight: 700;">
                  ${filter}
                </button>
              `).join('')}
            </div>
          </div>

          ${filteredProjects.length === 0 ? `
            <div style="text-align: center; padding: 3rem; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border-color); color: var(--text-secondary);">
              No projects in this category yet.
            </div>
          ` : `
            <div class="grid-3">
              ${filteredProjects.map(proj => `
                <div class="glass-card" style="overflow: hidden; display: flex; flex-direction: column; background: #ffffff;">
                  <div style="height: 220px; overflow: hidden; position: relative;">
                    <img src="${proj.image}" alt="${escapeHtml(proj.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                    <span class="badge" style="position: absolute; top: 12px; left: 12px; background: rgba(15,23,42,0.85); color: #ffffff; backdrop-filter: blur(4px); font-weight: 800;">
                      ${proj.category}
                    </span>
                  </div>

                  <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="font-size: 0.8rem; font-weight: 700; color: #2563eb; margin-bottom: 0.25rem;">📍 ${escapeHtml(proj.district)} District</div>
                      <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem;">${escapeHtml(proj.title)}</h3>
                      <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
                        ${escapeHtml(proj.description)}
                      </p>
                    </div>

                    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">🏢 ${escapeHtml(proj.units)}</span>
                      <span class="badge badge-active">${proj.status}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- SECTION 4: GALLERY ASSETS -->
        <div id="section-gallery" style="margin-bottom: 3.5rem;">
          <div style="text-align: center; max-width: 650px; margin: 0 auto 2rem auto;">
            <span style="color: #2563eb; font-weight: 800; text-transform: uppercase; font-size: 0.85rem;">Project Gallery</span>
            <h2 style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-top: 0.3rem;">Architectural Visuals</h2>
          </div>

          <div class="grid-4">
            ${reData.gallery.map(imgUrl => `
              <div style="height: 180px; border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-soft-sm);">
                <img src="${imgUrl}" alt="Gallery Asset" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SECTION 5: CONTACT & OFFICE INFO -->
        <div id="section-contact" class="glass-panel" style="padding: 3rem; border-radius: var(--radius-lg); background: #ffffff;">
          <div class="grid-2" style="gap: 3rem; align-items: center;">
            <div>
              <span style="color: #2563eb; font-weight: 800; text-transform: uppercase; font-size: 0.85rem;">Get in Touch</span>
              <h2 style="font-size: 2.2rem; font-weight: 800; color: var(--text-primary); margin-top: 0.3rem; margin-bottom: 1rem;">
                Visit Our Kigali Headquarters
              </h2>
              <p style="color: var(--text-secondary); font-size: 1rem; line-height: 1.7; margin-bottom: 2rem;">
                Interested in investment opportunities or residential property inquiries? Reach out to our real estate advisory team.
              </p>

              <div style="display: flex; flex-direction: column; gap: 1.2rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 800;">📍</div>
                  <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Office Location</div>
                    <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(reData.contact.address)}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 1rem;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 800;">📞</div>
                  <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Inquiry Hotlines</div>
                    <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(reData.contact.phone)}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 1rem;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 800;">✉️</div>
                  <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Corporate Email</div>
                    <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(reData.contact.email)}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Interactive Inquiry Form -->
            <form id="re-inquiry-form" style="background: #f8fafc; padding: 2rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1.25rem;">Schedule Property Consultation</h3>
              <div class="form-group">
                <label style="color: var(--text-primary); font-weight: 700;">Full Name</label>
                <input type="text" class="form-control" placeholder="e.g. Jean-Luc Ndayisaba" required>
              </div>
              <div class="form-group">
                <label style="color: var(--text-primary); font-weight: 700;">Phone Number / WhatsApp</label>
                <input type="text" class="form-control" placeholder="+250 788 000 000" required>
              </div>
              <div class="form-group">
                <label style="color: var(--text-primary); font-weight: 700;">Investment Interest</label>
                <select class="form-control">
                  <option>Residential Condos & Villas</option>
                  <option>Commercial Office Space</option>
                  <option>Land Acquisition & Development</option>
                </select>
              </div>
              <button type="submit" class="btn" style="width: 100%; background: #2563eb; color: #ffffff; font-weight: 700; padding: 0.85rem; font-size: 1rem; margin-top: 0.5rem;">
                📩 Submit Inquiry Request
              </button>
            </form>
          </div>
        </div>
      </div>
      ${getLargeFooterHtml(state.currentLang || 'en')}
    `;

    bindLargeFooterEvents(container);
    initSlimStickyFooter();

    // Event Handlers
    container.querySelectorAll('.re-nav-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        stateEngine.setUI({ realEstateTab: btn.dataset.tab });
        const sec = container.querySelector(`#section-${btn.dataset.tab}`);
        if (sec) sec.scrollIntoView({ behavior: 'smooth' });
      });
    });

    container.querySelectorAll('.re-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        stateEngine.setUI({ realEstateFilter: btn.dataset.filter });
      });
    });

    container.querySelector('#re-explore-proj-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ realEstateTab: 'projects' });
      container.querySelector('#section-projects')?.scrollIntoView({ behavior: 'smooth' });
    });

    container.querySelector('#re-contact-top-btn')?.addEventListener('click', () => {
      stateEngine.setUI({ realEstateTab: 'contact' });
      container.querySelector('#section-contact')?.scrollIntoView({ behavior: 'smooth' });
    });

    container.querySelector('#re-inquiry-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Thank you for contacting Gasabo Real Estate! Our investment team will call you back shortly.');
      e.target.reset();
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
