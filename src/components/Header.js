/**
 * Site header, ported from the delivered mockups (nmm/*.html).
 *
 * The markup is the mockups' markup - same Tailwind classes, same structure,
 * same order - with the static values swapped for real data. Where the app
 * needs a behaviour the static files could not have (an actual session, real
 * categories, a working language switch) that is wired here, but the classes
 * are left alone so the rendering stays theirs rather than an approximation.
 *
 * NOT-YET-BUILT CONTROLS
 * "More" and "Help Center" have no destination in this app yet. They are kept
 * because the mockups have them, but they say so when clicked rather than
 * silently doing nothing.
 *
 * COPY
 * The announcement strip reads exactly as the mockups write it. I had
 * replaced the delivery line - this platform is classifieds, buyers contact
 * sellers directly and no delivery is arranged - and raised that twice. The
 * decision was to keep the mockups' wording, so it stands as delivered.
 */

const ROLE_LABELS = {
  admin: 'Administrator',
  sub_admin: 'Sub-Administrator',
  seller: 'Seller',
  user: 'Member',
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

function notReadyToast(label) {
  document.querySelector('.km-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'km-toast fixed left-1/2 bottom-7 -translate-x-1/2 translate-y-3 bg-brand-dark text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl opacity-0 transition-all duration-200 z-[12000]';
  el.setAttribute('role', 'status');
  el.textContent = `${label} is coming soon.`;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.remove('opacity-0', 'translate-y-3');
    el.classList.add('opacity-100', 'translate-y-0');
  });
  setTimeout(() => {
    el.classList.add('opacity-0');
    setTimeout(() => el.remove(), 250);
  }, 2200);
}

export function renderHeaderHtml(ctx) {
  const {
    activePortal, currentUser, currentLang, searchQuery,
    showAccountChip, showNotifBell, unreadNotifCount, notifications, notifDropdownOpen,
  } = ctx;

  const roleLabel = ROLE_LABELS[currentUser.role] || '';
  const isRealEstate = activePortal === 'realestate';
  const navLink = 'h-full flex items-center px-1 hover:text-gray-300';
  const navLinkActive = 'h-full flex items-center px-1 text-brand-orange border-b-2 border-brand-orange';

  return `
    <!-- Top Announcement Bar -->
    <div class="bg-brand-green text-white text-[10px] py-1 flex-none">
      <div class="compact-container flex justify-between items-center">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-truck"></i>
          <span>Free Delivery on orders over RWF 50,000</span>
        </div>
        <div class="hidden md:flex items-center gap-3">
          <div class="flex items-center gap-1 cursor-pointer" id="lang-toggle-en">
            <img src="https://flagcdn.com/w20/gb.png" alt="English" class="w-4 h-3 rounded-sm">
            <span>English</span>
            <i class="fa-solid fa-chevron-down text-[8px]"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Header -->
    <header class="bg-white py-2 shadow-sm z-50 flex-none">
      <div class="compact-container flex flex-wrap md:flex-nowrap items-center justify-between gap-3">

        <div class="flex items-center gap-2 cursor-pointer" id="nav-brand-home" role="button" tabindex="0"
          aria-label="Kigali Market - home">
          <img src="${isRealEstate ? '/real-estate-logo.png' : '/logo.svg'}" alt=""
            class="h-9 md:h-10 w-auto object-contain shrink-0">
          <div class="leading-none">
            <h1 class="text-xl font-black text-brand-dark tracking-tight">${isRealEstate ? 'GASABO' : 'KIGALI'}</h1>
            <h1 class="text-xl font-black text-brand-green tracking-tight flex items-center">${isRealEstate ? 'REAL ESTATE' : 'MARKET'}<span class="text-brand-orange text-sm">.COM</span></h1>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="flex-1 w-full md:w-auto order-3 md:order-none max-w-3xl">
          <form id="header-search-form" role="search"
            class="flex rounded-full border-2 border-brand-green overflow-hidden h-10">
            <button type="button" id="nav-all-categories"
              class="bg-gray-50 px-3 py-1 text-xs text-gray-600 border-r border-gray-200 items-center gap-1 hover:bg-gray-100 hidden sm:flex whitespace-nowrap">
              All Categories <i class="fa-solid fa-chevron-down text-[10px]"></i>
            </button>
            <label class="sr-only" for="header-search-input">Search listings</label>
            <input id="header-search-input" type="text" autocomplete="off"
              value="${escapeHtml(searchQuery)}"
              placeholder="Search for products, vehicles, properties and more..."
              class="flex-1 px-3 outline-none text-xs min-w-0">
            <button type="submit" aria-label="Search"
              class="bg-brand-green text-white px-6 hover:bg-green-800 transition-colors">
              <i class="fa-solid fa-search text-sm"></i>
            </button>
          </form>
        </div>

        <!-- User Actions -->
        <div class="flex items-center gap-4 order-2 md:order-none shrink-0">
          ${showNotifBell ? `
            <div class="relative">
              <button type="button" id="header-notif-btn"
                class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 bg-gray-50 hover:text-brand-green relative"
                aria-label="Notifications${unreadNotifCount ? `, ${unreadNotifCount} unread` : ''}">
                <i class="fa-regular fa-bell text-sm"></i>
                ${unreadNotifCount > 0 ? `<span class="absolute -top-1 -right-1 bg-brand-orange text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">${unreadNotifCount}</span>` : ''}
              </button>
              ${notifDropdownOpen ? `
                <div id="notif-dropdown" class="absolute top-11 right-0 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-xl z-[100]">
                  <div class="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                    <span class="font-bold text-sm text-gray-900">Notifications</span>
                    ${unreadNotifCount > 0 ? `<button type="button" id="notif-mark-all-read" class="text-brand-green text-xs font-bold hover:underline">Mark all read</button>` : ''}
                  </div>
                  ${notifications.length === 0 ? `
                    <p class="px-4 py-8 text-center text-xs text-gray-400">No notifications yet.</p>
                  ` : notifications.map((n) => `
                    <button type="button" class="notif-item block w-full text-left px-4 py-3 border-b border-gray-50 ${n.isRead ? 'bg-white' : 'bg-green-50'}" data-id="${n.id}">
                      <span class="block text-xs text-gray-800 leading-snug">${escapeHtml(n.message)}</span>
                      <span class="block text-[10px] text-gray-400 mt-1">${new Date(n.createdAt).toLocaleString()}</span>
                    </button>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${showAccountChip ? `
            <div class="flex items-center gap-2">
              <div class="hidden lg:block leading-tight text-xs text-right">
                <p class="text-gray-500 font-medium">${escapeHtml(currentUser.name.split(' ')[0])}</p>
                <p class="font-bold">${roleLabel}</p>
              </div>
              <button type="button" id="header-logout-btn"
                class="bg-brand-dark text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gray-800 transition">
                Logout
              </button>
            </div>
          ` : `
            <div class="flex items-center gap-2 cursor-pointer hover:text-brand-green" id="header-signin-btn">
              <div class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 bg-gray-50">
                <i class="fa-regular fa-user text-sm"></i>
              </div>
              <div class="hidden lg:block leading-tight text-xs">
                <p class="text-gray-500 font-medium">Sign In</p>
                <p class="font-bold flex items-center gap-1">My Account <i class="fa-solid fa-chevron-down text-[8px]"></i></p>
              </div>
            </div>
          `}
        </div>
      </div>
    </header>

    <!-- Navigation Bar -->
    <nav class="bg-brand-dark text-white flex-none">
      <div class="compact-container flex items-center h-10">

        <button type="button" id="nav-all-categories-2"
          class="bg-brand-green h-full px-4 flex items-center gap-2 cursor-pointer w-48 mr-4 shrink-0">
          <i class="fa-solid fa-bars text-sm"></i>
          <span class="font-semibold text-sm">All Categories</span>
          <i class="fa-solid fa-chevron-down ml-auto text-[10px]"></i>
        </button>

        <ul class="hidden lg:flex items-center gap-5 font-medium text-xs flex-1 h-full">
          <li class="h-full flex items-center">
            <button type="button" id="nav-link-mkt" class="${activePortal === 'marketplace' ? navLinkActive : navLink}">Home</button>
          </li>
          <li class="h-full flex items-center">
            <button type="button" id="nav-link-stores" class="${navLink}">Stores</button>
          </li>
          <li class="h-full flex items-center">
            <button type="button" id="nav-link-vehicles" class="${navLink}">Vehicles</button>
          </li>
          <li class="h-full flex items-center">
            <button type="button" id="nav-link-re" class="${isRealEstate ? navLinkActive : navLink}">Real Estate</button>
          </li>
          <li class="h-full flex items-center">
            <button type="button" data-soon="Services" class="${navLink}">Services</button>
          </li>
          <li class="h-full flex items-center gap-1 cursor-pointer hover:text-gray-300 px-1">
            <button type="button" data-soon="More sections" class="flex items-center gap-1">More <i class="fa-solid fa-chevron-down text-[8px]"></i></button>
          </li>
        </ul>

        <button type="button" id="header-post-ad-btn"
          class="bg-brand-orange text-white font-bold py-1.5 px-4 rounded-full flex items-center gap-1.5 hover:bg-orange-500 transition-colors shadow-md ml-auto lg:ml-0 text-sm shrink-0">
          <i class="fa-solid fa-plus-circle"></i> Post an Ad
        </button>
      </div>
    </nav>
  `;
}

/**
 * Mobile bottom tab bar, from the spec's phone mockup. Revealed below 900px
 * only - the desktop header already carries these actions.
 */
export function renderMobileTabBarHtml(ctx) {
  const { activePortal, currentUser } = ctx;
  const signedIn = currentUser.role !== 'guest';
  const tab = 'flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold';

  return `
    <nav class="mobile-tabbar lg:hidden fixed left-0 right-0 bottom-0 bg-white border-t border-gray-200 shadow-[0_-4px_18px_rgba(15,23,42,0.08)] z-[1100] grid grid-cols-5 items-end px-1 pt-1"
      style="padding-bottom: calc(0.25rem + env(safe-area-inset-bottom, 0px));" aria-label="Primary">
      <button type="button" id="mtab-home" class="${tab} ${activePortal === 'marketplace' ? 'text-brand-green' : 'text-gray-500'}">
        <i class="fa-solid fa-house text-base"></i> Home
      </button>
      <button type="button" id="mtab-categories" class="${tab} text-gray-500">
        <i class="fa-solid fa-border-all text-base"></i> Categories
      </button>
      <button type="button" id="mtab-post" class="${tab} text-gray-500">
        <span class="w-11 h-11 -mt-5 rounded-full bg-brand-green text-white text-2xl font-light flex items-center justify-center shadow-lg">+</span>
        Post Ad
      </button>
      <button type="button" data-soon="Messages" class="${tab} text-gray-500">
        <i class="fa-regular fa-comment-dots text-base"></i> Messages
      </button>
      <button type="button" id="mtab-account" class="${tab} text-gray-500">
        <i class="fa-regular fa-user text-base"></i> ${signedIn ? 'Account' : 'Sign In'}
      </button>
    </nav>
  `;
}

export function bindHeaderEvents(root, handlers) {
  const {
    goHome, goRealEstate, goSignup, logout, setLanguage,
    toggleNotifications, markAllRead, markRead, search, goStores, goVehicles,
  } = handlers;

  const on = (sel, ev, fn) => root.querySelector(sel)?.addEventListener(ev, fn);

  root.querySelectorAll('[data-soon]').forEach((btn) => {
    btn.addEventListener('click', () => notReadyToast(btn.dataset.soon));
  });

  const brand = root.querySelector('#nav-brand-home');
  brand?.addEventListener('click', goHome);
  brand?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
  });

  on('#nav-link-mkt', 'click', goHome);
  on('#nav-link-re', 'click', goRealEstate);
  on('#nav-link-stores', 'click', goStores);
  on('#nav-link-vehicles', 'click', goVehicles);
  on('#nav-all-categories', 'click', goHome);
  on('#nav-all-categories-2', 'click', goHome);
  on('#header-post-ad-btn', 'click', goSignup);
  on('#header-signin-btn', 'click', goSignup);
  on('#util-become-seller', 'click', goSignup);
  on('#header-logout-btn', 'click', logout);

  on('#lang-toggle-en', 'click', () => setLanguage('en'));
  on('#lang-toggle-rw', 'click', () => setLanguage('rw'));

  on('#header-notif-btn', 'click', toggleNotifications);
  on('#notif-mark-all-read', 'click', (e) => { e.stopPropagation(); markAllRead(); });
  root.querySelectorAll('.notif-item').forEach((btn) => {
    btn.addEventListener('click', () => markRead(btn.dataset.id));
  });

  on('#header-search-form', 'submit', (e) => {
    e.preventDefault();
    search(root.querySelector('#header-search-input')?.value.trim() || '');
  });
}

export function bindMobileTabBarEvents(root, handlers) {
  const { goHome, goSignup } = handlers;

  root.querySelectorAll('[data-soon]').forEach((btn) => {
    btn.addEventListener('click', () => notReadyToast(btn.dataset.soon));
  });

  root.querySelector('#mtab-home')?.addEventListener('click', goHome);
  root.querySelector('#mtab-post')?.addEventListener('click', goSignup);
  root.querySelector('#mtab-account')?.addEventListener('click', goSignup);
  root.querySelector('#mtab-categories')?.addEventListener('click', () => {
    goHome();
    setTimeout(() => {
      document.querySelector('.cat-rail-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  });
}
