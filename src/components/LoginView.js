import { stateEngine } from '../store/stateEngine.js';

/**
 * Clean Auth View (Login & Sign Up) - Ported from delivered mockup auth.html.
 * Login authenticates against the backend (admins, sub-admins, sellers, and platform users).
 * Sign Up registers a new seller account.
 */
export function renderLoginView(container, initialMode = 'login') {
  let mode = initialMode; // 'login' | 'signup'
  let showPassword = false;
  let showConfirmPassword = false;

  // If the server stopped accepting the session while the person was working -
  // an expired token, a suspended account, a revoked role - they land here
  // having been signed out by something they did not do. Say so. Being
  // dropped onto a sign-in screen with no explanation reads as a bug, and the
  // natural response is to distrust the site rather than to sign back in.
  //
  // Read once and cleared, so it explains this arrival and not the next one.
  let errorMessage = '';

  let submitting = false;

  // "Forgot password?" - a panel that opens under the sign-in form rather than
  // a separate screen, so the person keeps the form they were already filling
  // in. `forgotNotice` holds the reply once sent; it is deliberately the same
  // sentence whether or not the address has an account.
  let forgotOpen = false;
  let forgotSubmitting = false;
  let forgotNotice = '';
  let forgotError = '';

  let formData = {
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    district: 'Gasabo',
    confirmPassword: '',
    forgotEmail: '',
  };

  function captureInputs() {
    const usernameInput = container.querySelector('#auth-username');
    if (usernameInput) formData.username = usernameInput.value;

    const passInput = container.querySelector('#auth-password');
    if (passInput) formData.password = passInput.value;

    const nameInput = container.querySelector('#auth-fullname');
    if (nameInput) formData.fullName = nameInput.value;

    const emailInput = container.querySelector('#auth-email');
    if (emailInput) formData.email = emailInput.value;

    const phoneInput = container.querySelector('#auth-phone');
    if (phoneInput) formData.phone = phoneInput.value;

    const distInput = container.querySelector('#auth-district');
    if (distInput) formData.district = distInput.value;

    const confirmPassInput = container.querySelector('#auth-confirm-password');
    if (confirmPassInput) formData.confirmPassword = confirmPassInput.value;

    const forgotInput = container.querySelector('#auth-forgot-email');
    if (forgotInput) formData.forgotEmail = forgotInput.value;
  }

  function update() {
    const state = stateEngine.getState();
    const districts = state.districts || ['Gasabo', 'Nyarugenge', 'Kicukiro', 'Musanze', 'Rubavu', 'Huye'];
    const isLogin = mode === 'login';

    container.innerHTML = `
      <main id="app-container" class="px-4 py-8 flex items-center justify-center bg-[#F4F7F6] min-h-[calc(100vh-140px)]">
        <div class="auth-card w-full max-w-xl p-6 md:p-8 my-auto bg-white rounded-3xl border border-gray-200 shadow-xl">

          <!-- Auth Navigation Tabs -->
          <div class="flex border-b border-gray-200 mb-6">
            <button type="button" id="tab-login" class="auth-tab ${isLogin ? 'active text-brand-green border-b-2 border-brand-green font-bold' : 'text-gray-500 hover:text-brand-green'} flex-1 py-2 text-center text-sm transition">
              Login
            </button>
            <button type="button" id="tab-signup" class="auth-tab ${!isLogin ? 'active text-brand-green border-b-2 border-brand-green font-bold' : 'text-gray-500 hover:text-brand-green'} flex-1 py-2 text-center text-sm transition">
              Sign Up
            </button>
          </div>

          ${(errorMessage || stateEngine.getState().ui?.authNotice) ? `
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2">
              <i class="fa-solid fa-triangle-exclamation text-sm"></i>
              <span>${escapeHtml(errorMessage || stateEngine.getState().ui?.authNotice)}</span>
            </div>
          ` : ''}

          <!-- FORM -->
          <form id="auth-main-form" autocomplete="off" class="space-y-4">
            ${isLogin ? `
              <!-- LOGIN FORM -->
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Welcome Back</h2>
                <p class="text-xs text-gray-500 mt-1">Sign in to your Kigali Market account to continue</p>
              </div>

              <div class="space-y-3 pt-2">
                <div>
                  <label class="block text-xs font-bold text-gray-800 mb-1">Email or Phone Number</label>
                  <div class="relative">
                    <input type="text" id="auth-username" required placeholder="Enter email or phone number"
                      value="${escapeHtml(formData.username)}"
                      class="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-3 pl-9 rounded-xl outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                    <i class="fa-regular fa-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-800 mb-1">Password</label>
                  <div class="relative">
                    <input type="${showPassword ? 'text' : 'password'}" id="auth-password" required placeholder="Enter password"
                      value="${escapeHtml(formData.password)}"
                      class="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-3 pl-9 pr-9 rounded-xl outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                    <i class="fa-solid fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                    <i id="toggle-pass-icon" class="fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs cursor-pointer hover:text-gray-600"></i>
                  </div>
                </div>

                <div class="flex items-center justify-between text-xs pt-1">
                  <label class="flex items-center gap-2 cursor-pointer text-gray-600 transition-colors hover:text-gray-900">
                    <input type="checkbox" class="accent-brand-green rounded" checked>
                    <span>Remember me</span>
                  </label>
                  <!-- Was an <a href="#"> with nothing bound to it: clicking it
                       pushed a bare hash and did nothing. A button, because it
                       is an action; type="button" because this sits inside the
                       sign-in form and must not submit it. -->
                  <button type="button" id="forgot-pass-link" class="text-brand-green font-semibold hover:underline">Forgot password?</button>
                </div>

                ${forgotOpen ? `
                  <div class="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <p class="text-xs font-bold text-gray-800">Reset your password</p>
                        <p class="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                          Enter the email on your seller account. Our team will set a temporary
                          password and send it to you.
                        </p>
                      </div>
                      <button type="button" id="forgot-close-btn" class="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Close password reset">
                        <i class="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </div>

                    ${forgotNotice ? `
                      <p class="text-[11px] text-brand-green bg-green-50 border border-green-100 rounded-lg p-2 leading-relaxed">
                        ${escapeHtml(forgotNotice)}
                      </p>
                    ` : `
                      ${forgotError ? `<p class="text-[11px] text-red-600">${escapeHtml(forgotError)}</p>` : ''}
                      <div class="flex gap-2">
                        <input type="email" id="auth-forgot-email" placeholder="you@example.com"
                          value="${escapeHtml(formData.forgotEmail)}"
                          class="flex-1 min-w-0 bg-white border border-gray-300 text-gray-900 py-2 px-3 rounded-lg outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                        <button type="button" id="forgot-submit-btn" ${forgotSubmitting ? 'disabled' : ''}
                          class="bg-brand-dark text-white font-bold text-xs px-4 rounded-lg hover:bg-gray-800 transition shrink-0 disabled:opacity-60">
                          ${forgotSubmitting ? 'Sending...' : 'Send request'}
                        </button>
                      </div>
                    `}
                  </div>
                ` : ''}

                <button type="submit" class="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-green-800 transition shadow-md text-xs mt-2" ${submitting ? 'disabled' : ''}>
                  ${submitting ? 'Signing In...' : 'Sign In'}
                </button>

                <p class="text-center text-xs text-gray-600 pt-2">
                  Don't have an account? <button type="button" id="switch-to-signup" class="text-brand-green font-bold hover:underline">Sign Up</button>
                </p>
              </div>
            ` : `
              <!-- SIGN UP FORM -->
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Sign Up</h2>
                <p class="text-xs text-gray-500 mt-0.5">Create a seller account to start selling on Kigali Market</p>
              </div>

              <div class="space-y-3 pt-1">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <!-- Full Name -->
                  <div>
                    <label class="block text-xs font-bold text-gray-800 mb-1">Full Name</label>
                    <div class="relative">
                      <input type="text" id="auth-fullname" required placeholder="Full Name"
                        value="${escapeHtml(formData.fullName)}"
                        class="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-3 pl-9 rounded-xl outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                      <i class="fa-regular fa-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                    </div>
                  </div>

                  <!-- Email Address -->
                  <div>
                    <label class="block text-xs font-bold text-gray-800 mb-1">Email Address</label>
                    <div class="relative">
                      <input type="email" id="auth-email" required placeholder="Email Address"
                        value="${escapeHtml(formData.email)}"
                        class="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-3 pl-9 rounded-xl outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                      <i class="fa-regular fa-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                    </div>
                  </div>

                  <!-- Phone Number -->
                  <div>
                    <label class="block text-xs font-bold text-gray-800 mb-1">Phone Number</label>
                    <div class="relative">
                      <input type="tel" id="auth-phone" required placeholder="Phone Number"
                        value="${escapeHtml(formData.phone)}"
                        class="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-3 pl-9 rounded-xl outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                      <i class="fa-solid fa-phone absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                    </div>
                  </div>

                  <!-- District -->
                  <div>
                    <label class="block text-xs font-bold text-gray-800 mb-1">District</label>
                    <div class="relative">
                      <select id="auth-district" required class="w-full appearance-none bg-white border border-gray-300 text-gray-900 py-2.5 px-3 pl-9 pr-8 rounded-xl outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                        ${districts.map(d => `<option value="${d}" ${d === formData.district ? 'selected' : ''}>District: ${d}</option>`).join('')}
                      </select>
                      <i class="fa-solid fa-location-dot absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                      <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                    </div>
                  </div>

                  <!-- Password -->
                  <div>
                    <label class="block text-xs font-bold text-gray-800 mb-1">Password</label>
                    <div class="relative">
                      <input type="${showPassword ? 'text' : 'password'}" id="auth-password" minlength="6" required placeholder="Password (min. 6 chars)"
                        value="${escapeHtml(formData.password)}"
                        class="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-3 pl-9 pr-9 rounded-xl outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                      <i class="fa-solid fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                      <i id="toggle-pass-icon" class="fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </div>

                  <!-- Confirm Password -->
                  <div>
                    <label class="block text-xs font-bold text-gray-800 mb-1">Confirm Password</label>
                    <div class="relative">
                      <input type="${showConfirmPassword ? 'text' : 'password'}" id="auth-confirm-password" minlength="6" required placeholder="Confirm Password"
                        value="${escapeHtml(formData.confirmPassword)}"
                        class="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-3 pl-9 pr-9 rounded-xl outline-none text-xs focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                      <i class="fa-solid fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                      <i id="toggle-confirm-pass-icon" class="fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-1 text-xs">
                  <input type="checkbox" required id="terms" class="accent-brand-green rounded" checked>
                  <label for="terms" class="text-gray-600 cursor-pointer transition-colors hover:text-gray-900">I agree to the <a href="#" class="text-brand-green font-bold hover:underline">Terms & Privacy Policy</a></label>
                </div>

                <button type="submit" class="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-green-800 transition shadow-md text-xs mt-2" ${submitting ? 'disabled' : ''}>
                  ${submitting ? 'Creating account...' : 'Sign Up'}
                </button>

                <p class="text-center text-xs text-gray-600 pt-1">
                  Already have an account? <button type="button" id="switch-to-login" class="text-brand-green font-bold hover:underline">Login</button>
                </p>
              </div>
            `}
          </form>
        </div>
      </main>
    `;

    // Event bindings
    const tabLogin = container.querySelector('#tab-login');
    if (tabLogin) {
      tabLogin.addEventListener('click', () => {
        captureInputs();
        errorMessage = '';
        stateEngine.clearAuthNotice();
        mode = 'login';
        update();
      });
    }

    const tabSignup = container.querySelector('#tab-signup');
    if (tabSignup) {
      tabSignup.addEventListener('click', () => {
        captureInputs();
        errorMessage = '';
        stateEngine.clearAuthNotice();
        mode = 'signup';
        update();
      });
    }

    const switchToSignup = container.querySelector('#switch-to-signup');
    if (switchToSignup) {
      switchToSignup.addEventListener('click', () => {
        captureInputs();
        errorMessage = '';
        stateEngine.clearAuthNotice();
        mode = 'signup';
        update();
      });
    }

    const switchToLogin = container.querySelector('#switch-to-login');
    if (switchToLogin) {
      switchToLogin.addEventListener('click', () => {
        captureInputs();
        errorMessage = '';
        stateEngine.clearAuthNotice();
        mode = 'login';
        update();
      });
    }

    const forgotLink = container.querySelector('#forgot-pass-link');
    if (forgotLink) {
      forgotLink.addEventListener('click', () => {
        captureInputs();
        forgotOpen = !forgotOpen;
        forgotNotice = '';
        forgotError = '';
        // Whatever they already typed into the username field is almost always
        // the address they want reset - carry it over rather than asking twice.
        if (forgotOpen && !formData.forgotEmail && formData.username.includes('@')) {
          formData.forgotEmail = formData.username;
        }
        update();
        container.querySelector('#auth-forgot-email')?.focus();
      });
    }

    const forgotClose = container.querySelector('#forgot-close-btn');
    if (forgotClose) {
      forgotClose.addEventListener('click', () => {
        captureInputs();
        forgotOpen = false;
        forgotNotice = '';
        forgotError = '';
        update();
      });
    }

    const forgotSubmit = container.querySelector('#forgot-submit-btn');
    if (forgotSubmit) {
      forgotSubmit.addEventListener('click', async () => {
        captureInputs();
        const email = formData.forgotEmail.trim();
        if (!email || !email.includes('@')) {
          forgotError = 'Enter the email address on your account.';
          update();
          return;
        }
        forgotError = '';
        forgotSubmitting = true;
        update();
        try {
          forgotNotice = await stateEngine.requestPasswordReset(email);
        } catch (err) {
          forgotError = err?.message || 'Could not send the request. Please try again.';
        } finally {
          forgotSubmitting = false;
          update();
        }
      });
    }

    // Enter inside this field would otherwise submit the sign-in form around
    // it - with the password they have not filled in, since they are here
    // because they do not have it.
    const forgotInput = container.querySelector('#auth-forgot-email');
    if (forgotInput) {
      forgotInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        container.querySelector('#forgot-submit-btn')?.click();
      });
    }

    const togglePassIcon = container.querySelector('#toggle-pass-icon');
    if (togglePassIcon) {
      togglePassIcon.addEventListener('click', () => {
        captureInputs();
        showPassword = !showPassword;
        update();
      });
    }

    const toggleConfirmPassIcon = container.querySelector('#toggle-confirm-pass-icon');
    if (toggleConfirmPassIcon) {
      toggleConfirmPassIcon.addEventListener('click', () => {
        captureInputs();
        showConfirmPassword = !showConfirmPassword;
        update();
      });
    }

    const form = container.querySelector('#auth-main-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        captureInputs();
        errorMessage = '';
        stateEngine.clearAuthNotice();

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
          stateEngine.routeToDashboard();
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
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
