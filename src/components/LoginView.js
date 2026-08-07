import { stateEngine } from '../store/stateEngine.js';

/**
 * Glassmorphism Auth View (Login & Sign Up)
 * Login authenticates against the real backend (works for admins, sub-admins,
 * sellers, and platform users - the server tries each account type in turn).
 * Sign Up registers a new seller account, matching how "Start Selling" already
 * onboards sellers elsewhere in the app.
 */
export function renderLoginView(container, initialMode = 'login') {
  let mode = initialMode; // 'login' | 'signup'
  let showPassword = false;
  let showConfirmPassword = false;
  let errorMessage = '';
  let submitting = false;

  let formData = {
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    district: 'Gasabo',
    confirmPassword: '',
  };

  function captureInputs() {
    const usernameInput = container.querySelector('#glass-username');
    if (usernameInput) formData.username = usernameInput.value;

    const passInput = container.querySelector('#glass-password');
    if (passInput) formData.password = passInput.value;

    const nameInput = container.querySelector('#glass-fullname');
    if (nameInput) formData.fullName = nameInput.value;

    const emailInput = container.querySelector('#glass-email');
    if (emailInput) formData.email = emailInput.value;

    const phoneInput = container.querySelector('#glass-phone');
    if (phoneInput) formData.phone = phoneInput.value;

    const distInput = container.querySelector('#glass-district');
    if (distInput) formData.district = distInput.value;

    const confirmPassInput = container.querySelector('#glass-confirm-password');
    if (confirmPassInput) formData.confirmPassword = confirmPassInput.value;
  }

  function update() {
    const state = stateEngine.getState();
    const districts = state.districts || [];

    const isLogin = mode === 'login';

    container.innerHTML = `
      <div class="glass-login-viewport">
        <div class="glass-login-card" style="max-width: ${isLogin ? '420px' : '560px'}; transition: all 0.3s ease;">
          <div class="glass-login-header">
            <h1 class="glass-login-title">${isLogin ? 'Login' : 'Sign Up'}</h1>
            <p class="glass-login-subtitle">
              ${isLogin ? 'Welcome back - please login to your account' : 'Create a seller account to start selling on Kigali Market'}
            </p>
          </div>

          ${errorMessage ? `
            <div style="background: rgba(220,38,38,0.15); border: 1px solid rgba(248,113,113,0.5); color: #fecaca; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem;">
              ⚠️ ${escapeHtml(errorMessage)}
            </div>
          ` : ''}

          <form id="glass-auth-form" autocomplete="off">
            ${isLogin ? `
              <!-- LOGIN MODE FORM FIELDS -->
              <div class="glass-input-group">
                <input
                  type="text"
                  id="glass-username"
                  class="glass-input-field"
                  placeholder="Email Address"
                  value="${escapeHtml(formData.username)}"
                  required
                />
                <div class="glass-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>

              <div class="glass-input-group">
                <input
                  type="${showPassword ? 'text' : 'password'}"
                  id="glass-password"
                  class="glass-input-field"
                  placeholder="Password"
                  value="${escapeHtml(formData.password)}"
                  required
                />
                <button
                  type="button"
                  id="toggle-password-btn"
                  class="glass-input-icon clickable"
                  title="${showPassword ? 'Hide password' : 'Show password'}"
                  aria-label="${showPassword ? 'Hide password' : 'Show password'}"
                >
                  ${showPassword ? `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ` : `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  `}
                </button>
              </div>

              <button type="submit" class="glass-btn-primary" ${submitting ? 'disabled' : ''}>
                ${submitting ? 'Logging in...' : 'Login'}
              </button>
            ` : `
              <!-- COMPACT SIGN UP GRID (2 COLUMNS) -->
              <div class="glass-form-grid">
                <div class="glass-input-group">
                  <input
                    type="text"
                    id="glass-fullname"
                    class="glass-input-field"
                    placeholder="Full Name"
                    value="${escapeHtml(formData.fullName)}"
                    required
                  />
                  <div class="glass-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                </div>

                <div class="glass-input-group">
                  <input
                    type="email"
                    id="glass-email"
                    class="glass-input-field"
                    placeholder="Email Address"
                    value="${escapeHtml(formData.email)}"
                    required
                  />
                  <div class="glass-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                </div>

                <div class="glass-input-group">
                  <input
                    type="tel"
                    id="glass-phone"
                    class="glass-input-field"
                    placeholder="Phone Number"
                    value="${escapeHtml(formData.phone)}"
                    required
                  />
                  <div class="glass-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                </div>

                <div class="glass-input-group">
                  <select id="glass-district" class="glass-input-field" required>
                    ${districts.map(d => `<option value="${d}" ${d === formData.district ? 'selected' : ''}>District: ${d}</option>`).join('')}
                  </select>
                  <div class="glass-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                </div>

                <div class="glass-input-group">
                  <input
                    type="${showPassword ? 'text' : 'password'}"
                    id="glass-password"
                    class="glass-input-field"
                    placeholder="Password (min. 6 characters)"
                    value="${escapeHtml(formData.password)}"
                    required
                    minlength="6"
                  />
                  <button
                    type="button"
                    id="toggle-password-btn"
                    class="glass-input-icon clickable"
                    title="${showPassword ? 'Hide password' : 'Show password'}"
                    aria-label="${showPassword ? 'Hide password' : 'Show password'}"
                  >
                    ${showPassword ? `
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ` : `
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    `}
                  </button>
                </div>

                <div class="glass-input-group">
                  <input
                    type="${showConfirmPassword ? 'text' : 'password'}"
                    id="glass-confirm-password"
                    class="glass-input-field"
                    placeholder="Confirm Password"
                    value="${escapeHtml(formData.confirmPassword)}"
                    required
                  />
                  <button
                    type="button"
                    id="toggle-confirm-password-btn"
                    class="glass-input-icon clickable"
                    title="${showConfirmPassword ? 'Hide password' : 'Show password'}"
                    aria-label="${showConfirmPassword ? 'Hide password' : 'Show password'}"
                  >
                    ${showConfirmPassword ? `
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ` : `
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    `}
                  </button>
                </div>
              </div>

              <label class="glass-checkbox-row" for="glass-terms">
                <input type="checkbox" id="glass-terms" class="glass-checkbox" checked required />
                <span class="glass-checkbox-label">I agree to the Terms & Privacy Policy</span>
              </label>

              <button type="submit" class="glass-btn-primary" ${submitting ? 'disabled' : ''}>
                ${submitting ? 'Creating account...' : 'Sign Up'}
              </button>
            `}

            <!-- Footer Link -->
            <div class="glass-login-footer">
              <p class="glass-signup-text">
                ${isLogin ? `
                  Don't have an account? <a href="#" id="glass-signup-link">Signup</a>
                ` : `
                  Already have an account? <a href="#" id="glass-login-link">Login</a>
                `}
              </p>
            </div>
          </form>
        </div>
      </div>
    `;

    const toggleBtn = container.querySelector('#toggle-password-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        captureInputs();
        showPassword = !showPassword;
        update();
      });
    }

    const toggleConfirmBtn = container.querySelector('#toggle-confirm-password-btn');
    if (toggleConfirmBtn) {
      toggleConfirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        captureInputs();
        showConfirmPassword = !showConfirmPassword;
        update();
      });
    }

    const signupLink = container.querySelector('#glass-signup-link');
    if (signupLink) {
      signupLink.addEventListener('click', (e) => {
        e.preventDefault();
        captureInputs();
        errorMessage = '';
        mode = 'signup';
        stateEngine.setPortal('signup');
      });
    }

    const loginLink = container.querySelector('#glass-login-link');
    if (loginLink) {
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        captureInputs();
        errorMessage = '';
        mode = 'login';
        stateEngine.setPortal('login');
      });
    }

    const form = container.querySelector('#glass-auth-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        captureInputs();
        errorMessage = '';

        if (mode === 'signup' && formData.password !== formData.confirmPassword) {
          errorMessage = 'Passwords do not match.';
          update();
          return;
        }

        submitting = true;
        update();

        try {
          if (mode === 'login') {
            await stateEngine.login(formData.username, formData.password);
          } else {
            await stateEngine.registerSeller(formData);
          }
          stateEngine.setPortal('marketplace');
        } catch (err) {
          submitting = false;
          errorMessage = err.message || 'Something went wrong. Please try again.';
          update();
        }
      });
    }
  }

  update();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
