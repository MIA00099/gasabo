import { stateEngine } from '../store/stateEngine.js';
import { pathForRoute, pushPath, ROUTE_AUTH } from '../store/router.js';

function recoveryAccessToken() {
  const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  const query = new URLSearchParams(String(window.location.search || '').replace(/^\?/, ''));
  return hash.get('access_token') || query.get('access_token') || '';
}

export function renderResetPasswordView(container) {
  let newPassword = '';
  let confirmPassword = '';
  let showPassword = false;
  let submitting = false;
  let errorMessage = '';
  let successMessage = '';
  const accessToken = recoveryAccessToken();

  function captureInputs() {
    const passInput = container.querySelector('#reset-new-password');
    if (passInput) newPassword = passInput.value;

    const confirmInput = container.querySelector('#reset-confirm-password');
    if (confirmInput) confirmPassword = confirmInput.value;
  }

  function goSignIn() {
    pushPath(pathForRoute(ROUTE_AUTH));
    stateEngine.setRoute({ kind: ROUTE_AUTH, id: null });
    stateEngine.setPortal('login');
  }

  function update() {
    const missingToken = !accessToken;

    container.innerHTML = `
      <main id="app-container" class="px-4 py-10 flex items-center justify-center bg-[#F4F7F6] min-h-[calc(100vh-140px)]">
        <div class="auth-card w-full max-w-xl p-6 md:p-8 my-auto bg-white rounded-3xl border border-gray-200 shadow-xl">
          <div class="mb-6">
            <p class="text-xs font-bold text-brand-green uppercase tracking-[0.16em]">Seller account</p>
            <h1 class="text-2xl md:text-3xl font-black text-gray-950 mt-2">Create a new password</h1>
            <p class="text-sm text-gray-500 mt-2 leading-relaxed">
              Enter a new password for your Kigali Market seller account.
            </p>
          </div>

          ${missingToken ? `
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold mb-4">
              This reset link is missing or expired. Request a new password reset email.
            </div>
            <button type="button" id="reset-signin-btn" class="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-green-800 transition shadow-md text-sm">
              Back to sign in
            </button>
          ` : successMessage ? `
            <div class="bg-green-50 border border-green-200 text-brand-green px-4 py-3 rounded-xl text-sm font-semibold mb-4">
              ${escapeHtml(successMessage)}
            </div>
            <button type="button" id="reset-signin-btn" class="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-green-800 transition shadow-md text-sm">
              Sign in with new password
            </button>
          ` : `
            ${errorMessage ? `
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold mb-4">
                ${escapeHtml(errorMessage)}
              </div>
            ` : ''}

            <form id="reset-password-form" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-gray-800 mb-1">New password</label>
                <div class="relative">
                  <input type="${showPassword ? 'text' : 'password'}" id="reset-new-password" minlength="6" required placeholder="New password"
                    value="${escapeHtml(newPassword)}"
                    class="w-full bg-white border border-gray-300 text-gray-900 py-3 px-3 pl-9 pr-9 rounded-xl outline-none text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                  <i class="fa-solid fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                  <button type="button" id="reset-toggle-password" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Show or hide password">
                    <i class="fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-800 mb-1">Confirm password</label>
                <div class="relative">
                  <input type="${showPassword ? 'text' : 'password'}" id="reset-confirm-password" minlength="6" required placeholder="Confirm new password"
                    value="${escapeHtml(confirmPassword)}"
                    class="w-full bg-white border border-gray-300 text-gray-900 py-3 px-3 pl-9 rounded-xl outline-none text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green">
                  <i class="fa-solid fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                </div>
              </div>

              <button type="submit" class="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-green-800 transition shadow-md text-sm" ${submitting ? 'disabled' : ''}>
                ${submitting ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          `}
        </div>
      </main>
    `;

    const signInBtn = container.querySelector('#reset-signin-btn');
    if (signInBtn) signInBtn.addEventListener('click', goSignIn);

    const toggleBtn = container.querySelector('#reset-toggle-password');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        captureInputs();
        showPassword = !showPassword;
        update();
      });
    }

    const form = container.querySelector('#reset-password-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        captureInputs();
        errorMessage = '';

        if (newPassword.length < 6) {
          errorMessage = 'Password must be at least 6 characters.';
          update();
          return;
        }
        if (newPassword !== confirmPassword) {
          errorMessage = 'Passwords do not match.';
          update();
          return;
        }

        submitting = true;
        update();
        try {
          successMessage = await stateEngine.completePasswordReset(accessToken, newPassword);
          if (window.location.hash) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch (err) {
          errorMessage = err?.message || 'Could not update the password. Request a new reset email and try again.';
        } finally {
          submitting = false;
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
