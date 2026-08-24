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
 * "Services" and "Help Center" still have no destination in this app. They
 * are kept because the mockups have them, but they say so when clicked rather
 * than silently doing nothing. "More" used to be one of these; it opens the
 * categories that have no item of their own in the nav row.
 *
 * COPY
 * The strip above the header carried "Free Delivery on orders over RWF
 * 50,000" through several rounds of this build. It has now been removed by
 * request. It was never true of this platform - buyers contact sellers
 * directly and the site arranges no delivery - which is why I had queried it
 * twice before; the decision at the time was to keep the mockups' wording.
 */

import { LANGUAGES, getTranslation } from '../store/i18n.js';
import { formatCategoryName } from '../utils/categoryIcon.js';

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

/**
 * The signal a control gives when it has no destination yet. Exported so
 * main.js can use it for a nav item whose category an admin has not created.
 */
export function notReadyToast(label) {
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
    activePortal, currentUser, currentLang,
    showAccountChip, showNotifBell, unreadNotifCount, notifications, notifDropdownOpen,
    categories = [], selectedCategory = 'all',
  } = ctx;

  const roleLabel = ROLE_LABELS[currentUser.role] || '';
  const isRealEstate = activePortal === 'realestate';
  const t = (key) => getTranslation(currentLang, key);
  const navLink = 'h-full flex items-center px-1 hover:text-gray-300';
  const navLinkActive = 'h-full flex items-center px-1 text-brand-orange border-b-2 border-brand-orange hover:text-orange-300 hover:border-orange-300';

  // Categories fill the middle of the nav bar - as many as fit. The rest are
  // moved into "More" by a measure pass after render (fitNavCategories in
  // bindHeaderEvents). Excludes the ones that already have their own fixed
  // item (Vehicles, Real Estate) or a search shortcut (Services, Jobs), so
  // nothing appears twice.
  const alreadyInNav = /vehicle|car|auto|motorcycle|moto|bike|real[\s_-]?estate|propert|house|land|plot|service|job|employ|career|vacanc/i;
  const navCategories = isRealEstate ? [] : categories.filter((c) => !alreadyInNav.test(c.name));

  return `
    <!-- Top strip: the three languages, and nothing else.

         It used to carry "Free Delivery on orders over RWF 50,000" on the
         left. That has been removed everywhere by request - it was never true
         of this platform anyway: buyers contact sellers directly and no
         delivery is arranged by the site.

         Losing it is what finally makes room for the languages on a phone.
         They were hidden below md because the strip had no room beside the
         notice, which left mobile visitors with no way to change language at
         all. With the left half gone the row fits at 320px, so the class that
         hid it is gone too. -->
    <div class="bg-brand-green text-white text-[10px] py-1 flex-none">
      <div class="compact-container flex justify-center md:justify-end items-center">
        <div class="flex items-center gap-0.5 sm:gap-1" role="group" aria-label="Choose a language">
          ${LANGUAGES.map((l, i) => `
            ${i ? '<span aria-hidden="true" class="text-white/40">|</span>' : ''}
            <button type="button" class="lang-pick flex items-center gap-1 px-1.5 py-0.5 rounded ${
              l.code === currentLang
                ? 'font-bold bg-white/15'
                : 'opacity-80 hover:opacity-100 hover:bg-white/10'
            }" data-lang="${l.code}" ${l.code === currentLang ? 'aria-current="true"' : ''}>
              <img src="https://flagcdn.com/w20/${l.flag}.png" alt="" class="w-4 h-3 rounded-sm">
              <span>${escapeHtml(l.label)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Header -->
    <header class="bg-white py-2 shadow-sm z-50 flex-none">
      <div class="compact-container relative flex flex-wrap md:flex-nowrap items-center justify-between gap-3">

        <!-- The marketplace mark is the supplied artwork, used unaltered.
             rounded-lg only softens the corners of the square it already is.

             The artwork is a full lockup and carries its own "KIGALI
             MARKET.com", so the wordmark beside it looks like a duplicate on
             paper. It is not one in practice: the lockup's own text is 7% of
             a square that renders 44px tall on a phone, which measures 3.3px
             - texture, not words. Dropping the HTML wordmark was the first
             thing I tried and it left the brand name unreadable at every
             size the header actually uses. -->
        <div class="flex items-center gap-2 cursor-pointer" id="nav-brand-home" role="button" tabindex="0"
          aria-label="${isRealEstate ? 'Gasabo Real Estate - home' : 'Kigali Market - home'}">
          <img src="${isRealEstate ? '/real-estate-logo.png' : '/logo-kigali-market.jpg'}" alt=""
            class="h-9 md:h-11 w-auto object-contain shrink-0 ${isRealEstate ? '' : 'rounded-lg'}">
          <div class="leading-none">
            <h1 class="text-xl font-black text-brand-dark tracking-tight">${isRealEstate ? 'GASABO' : 'KIGALI'}</h1>
            <h1 class="text-xl font-black text-brand-green tracking-tight flex items-center">${isRealEstate ? 'REAL ESTATE' : 'MARKET'}<span class="text-brand-orange text-sm">.COM</span></h1>
          </div>
        </div>



        ${isRealEstate ? '' : `
        <!-- User Actions -->
        <div class="flex items-center gap-3 md:gap-4 order-2 md:order-none shrink-0 ml-auto md:ml-0">
          <button type="button" id="nav-gasabo-brand"
            class="flex items-center gap-1.5 md:gap-2 shrink-0 hover:bg-gray-100 px-2.5 py-1 rounded-full border border-blue-100 bg-blue-50/60 transition cursor-pointer group"
            aria-label="Gasabo Real Estate">
            <img src="/real-estate-logo.png" alt=""
              class="h-6 md:h-7 w-auto object-contain shrink-0">
            <span class="text-xs md:text-sm font-black tracking-tight text-[#1D4ED8] group-hover:underline whitespace-nowrap">
              <span class="sm:hidden">Gasabo</span><span class="hidden sm:inline">Gasabo Real Estate</span>
            </span>
          </button>

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
                    <span class="font-bold text-sm text-gray-900">${escapeHtml(t('ui_notifications'))}</span>
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
              <!-- Signed in and browsing the shop: the way back to your own
                   dashboard. Without it a seller who wandered out to the
                   marketplace had no route home - "Post an Ad" and the
                   account button both went to the sign-up page, which is a
                   strange thing to offer somebody who is already signed in. -->
              <button type="button" id="header-dashboard-btn"
                class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-brand-green bg-gray-50 hover:bg-brand-green hover:text-white transition"
                title="${escapeHtml(t('ui_dashboard'))}" aria-label="${escapeHtml(t('ui_dashboard'))}">
                <i class="fa-solid fa-table-cells-large text-sm"></i>
              </button>
              <div class="hidden lg:block leading-tight text-xs text-right">
                <p class="text-gray-500 font-medium">${escapeHtml(currentUser.name.split(' ')[0])}</p>
                <p class="font-bold">${roleLabel}</p>
              </div>
              <button type="button" id="header-logout-btn"
                class="bg-brand-dark text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gray-800 transition">
                ${escapeHtml(t('ui_logout'))}
              </button>
            </div>
          ` : `
            <div class="flex items-center gap-2 cursor-pointer hover:text-brand-green" id="header-signin-btn">
              <div class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 bg-gray-50">
                <i class="fa-regular fa-user text-sm"></i>
              </div>
              <div class="hidden lg:block leading-tight text-xs">
                <p class="text-gray-500 font-medium">${escapeHtml(t('ui_sign_in'))}</p>
                <p class="font-bold flex items-center gap-1">${escapeHtml(t('ui_my_account'))} <i class="fa-solid fa-chevron-down text-[8px]"></i></p>
              </div>
            </div>
          `}
        </div>
        `}

        <!-- The way back to the marketplace lives in the Gasabo nav bar now,
             which is where the reference design puts it. -->
        ${isRealEstate ? '<span data-on-real-estate hidden></span>' : ''}
      </div>
    </header>

    <!-- Marketplace navigation, and the Post an Ad button inside it. Both
         are marketplace furniture: on the Gasabo portal the page carries its
         own Plots / Houses / Services / About sub-nav, and there is nothing
         to post an ad to. -->
    ${isRealEstate ? '' : `
    <!-- Navigation Bar -->
    <nav class="bg-brand-dark text-white flex-none">
      <!-- Two groups, not one scrolling row. The left group (All Categories +
           the fixed links) scrolls inside itself when it does not fit; the
           right group (More + Post an Ad) is shrink-0 and sits outside that
           scroll, so it can never be pushed off-screen. The old single
           overflow-x-auto row let a wide left side scroll Post an Ad out of
           view - and the brief "all categories inline" regression made the
           left side very wide. -->
      <div class="compact-container flex items-center h-10 gap-2 sm:gap-4">

        <!-- FIXED LEFT: All Categories + the permanent links. Scrolls inside
             itself on a phone where they cannot all fit; never grows past its
             own content, so it leaves the middle free on a wide screen. -->
        <div class="flex items-center gap-2 sm:gap-4 min-w-0 overflow-x-auto no-scrollbar h-full whitespace-nowrap">
          <button type="button" id="nav-all-categories-2" aria-haspopup="menu" aria-expanded="false"
            class="bg-brand-green h-full px-3 sm:px-4 flex items-center gap-2 cursor-pointer shrink-0 font-semibold text-xs sm:text-sm whitespace-nowrap">
            <i class="fa-solid fa-bars text-xs sm:text-sm"></i>
            <span>${escapeHtml(t('ui_all_categories'))}</span>
            <i class="fa-solid fa-chevron-down text-[10px] ml-1"></i>
          </button>

          <ul class="flex items-center gap-3 sm:gap-5 font-medium text-xs h-full whitespace-nowrap shrink-0">
            <li class="h-full flex items-center shrink-0">
              <button type="button" id="nav-link-mkt" class="${activePortal === 'marketplace' ? navLinkActive : navLink}">${escapeHtml(t('ui_home'))}</button>
            </li>
            <li class="h-full flex items-center shrink-0">
              <button type="button" id="nav-link-stores" class="${navLink}">${escapeHtml(t('ui_stores'))}</button>
            </li>
            <li class="h-full flex items-center shrink-0">
              <button type="button" id="nav-link-vehicles" class="${navLink}">${escapeHtml(t('ui_vehicles'))}</button>
            </li>
            <li class="h-full flex items-center shrink-0">
              <button type="button" id="nav-link-re" class="${navLink}">${escapeHtml(t('ui_real_estate'))}</button>
            </li>
            <li class="h-full flex items-center shrink-0">
              <button type="button" id="nav-link-services" class="${navLink}">${escapeHtml(t('ui_services'))}</button>
            </li>
            <li class="h-full flex items-center shrink-0">
              <button type="button" id="nav-link-jobs" class="${navLink}">${escapeHtml(t('ui_jobs'))}</button>
            </li>
          </ul>
        </div>

        <!-- CATEGORY FILL: takes the space the fixed items leave, and shows as
             many category links as fit. overflow-hidden clips the rest; the
             fitNavCategories pass then hides any partly-cut chip cleanly and
             leaves the overflow to More. On a phone this collapses to nothing
             and every category is in More. -->
        <div class="nav-cat-fill flex items-center gap-3 sm:gap-5 flex-1 min-w-0 overflow-hidden h-full whitespace-nowrap font-medium text-xs">
          ${navCategories.map((c) => `
            <button type="button" class="${selectedCategory === c.id ? navLinkActive : navLink} nav-category-item shrink-0" data-cat-id="${escapeHtml(c.id)}">
              ${escapeHtml(formatCategoryName(c.name))}
            </button>
          `).join('')}
        </div>

        <!-- RIGHT: pinned, always visible. More opens the full category list
             (the overflow included). -->
        <div class="flex items-center gap-2 sm:gap-4 shrink-0 h-full">
          <button type="button" id="nav-link-more" aria-haspopup="menu" aria-expanded="false"
            class="${navLink} gap-1 shrink-0">${escapeHtml(t('ui_more'))} <i class="fa-solid fa-chevron-down text-[8px]"></i></button>
          <button type="button" id="header-post-ad-btn"
            class="bg-orange-500 text-white font-bold py-1 px-3 sm:px-4 rounded-full flex items-center gap-1.5 hover:bg-brand-orange transition-colors shadow-md text-xs sm:text-sm shrink-0 whitespace-nowrap">
            <i class="fa-solid fa-plus-circle"></i> ${escapeHtml(t('ui_post_ad'))}
          </button>
        </div>
      </div>
    </nav>
    `}
  `;
}

/**
 * Mobile bottom tab bar, from the spec's phone mockup. Revealed below 900px
 * only - the desktop header already carries these actions.
 */
export function renderMobileTabBarHtml(ctx) {
  const { activePortal, currentUser, currentLang } = ctx;
  const t = (key) => getTranslation(currentLang, key);
  const signedIn = currentUser.role !== 'guest';
  const tab = 'flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition-colors hover:text-brand-green';

  return `
    <nav class="mobile-tabbar lg:hidden fixed left-0 right-0 bottom-0 bg-white border-t border-gray-200 shadow-[0_-4px_18px_rgba(15,23,42,0.08)] z-[1100] grid grid-cols-5 items-end px-1 pt-1"
      style="padding-bottom: calc(0.25rem + env(safe-area-inset-bottom, 0px));" aria-label="Primary">
      <button type="button" id="mtab-home" class="${tab} ${activePortal === 'marketplace' ? 'text-brand-green' : 'text-gray-500'}">
        <i class="fa-solid fa-house text-base"></i> ${escapeHtml(t('ui_home'))}
      </button>
      <button type="button" id="mtab-categories" class="${tab} text-gray-500">
        <i class="fa-solid fa-border-all text-base"></i> ${escapeHtml(t('ui_tab_categories'))}
      </button>
      <button type="button" id="mtab-post" class="${tab} text-gray-500">
        <span class="w-11 h-11 -mt-5 rounded-full bg-brand-green text-white text-2xl font-light flex items-center justify-center shadow-lg">+</span>
        ${escapeHtml(t('ui_tab_post'))}
      </button>
      <!-- Was a data-soon "Messages" button: it existed to say "coming soon"
           and nothing else, taking a fifth of the only navigation a phone
           gets. Stores is a real destination and had none on mobile at all. -->
      <button type="button" id="mtab-stores" class="${tab} text-gray-500">
        <i class="fa-solid fa-shop text-base"></i> ${escapeHtml(t('ui_stores'))}
      </button>
      <button type="button" id="mtab-account" class="${tab} text-gray-500">
        <i class="fa-regular fa-user text-base"></i> ${escapeHtml(signedIn ? t('ui_tab_account') : t('ui_sign_in'))}
      </button>
    </nav>
  `;
}

export function bindHeaderEvents(root, handlers) {
  const {
    goHome, goRealEstate, goSignup, logout, setLanguage,
    toggleNotifications, markAllRead, markRead, goStores, goVehicles, openCategories, goRealEstateCategory, currentLangCode,
    goServices, goJobs, openMore, goDashboard, selectCategory,
  } = handlers;

  const on = (sel, ev, fn) => root.querySelector(sel)?.addEventListener(ev, fn);

  root.querySelectorAll('[data-soon]').forEach((btn) => {
    btn.addEventListener('click', () => notReadyToast(btn.dataset.soon));
  });

  // On the Gasabo portal the brand block IS Gasabo, so clicking it should stay
  // there rather than jumping to the marketplace - that is what the "Kigali
  // Market" link in the Gasabo nav bar is for. The marker below only
  // renders on that portal, which is the cheapest way for this component
  // to tell where it is.
  const onRealEstate = Boolean(root.querySelector('[data-on-real-estate]'));
  const brandHome = onRealEstate ? goRealEstate : goHome;

  const brand = root.querySelector('#nav-brand-home');
  brand?.addEventListener('click', brandHome);
  brand?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); brandHome(); }
  });


  on('#nav-link-mkt', 'click', goHome);
  on('#nav-link-re', 'click', goRealEstateCategory);
  // Same destination as the Real Estate item in the nav bar below it.
  on('#nav-gasabo-brand', 'click', goRealEstate);
  on('#nav-link-stores', 'click', goStores);
  on('#nav-link-vehicles', 'click', goVehicles);
  // #nav-all-categories was the chip inside the header search form and went
  // with it; the nav bar's own #nav-all-categories-2 is the one left.
  // Same chevron, same promise. main.js supplies the handler because it is
  // the one with the store; this component stays free of it.
  on('#nav-all-categories-2', 'click', (e) => openCategories?.(e.currentTarget));
  on('#nav-link-services', 'click', goServices);
  on('#nav-link-jobs', 'click', goJobs);
  // The category links filling the middle of the bar.
  root.querySelectorAll('.nav-category-item').forEach((btn) => {
    btn.addEventListener('click', () => selectCategory?.(btn.dataset.catId));
  });
  // Show as many category links as fit; hide the rest (More still lists them).
  fitNavCategories(root);
  // 'More' opens the full category list - the overflow included.
  on('#nav-link-more', 'click', (e) => openMore?.(e.currentTarget));
  // The way back into a seller's or admin's own dashboard from the shop.
  on('#header-dashboard-btn', 'click', goDashboard);
  on('#header-post-ad-btn', 'click', goSignup);
  on('#header-signin-btn', 'click', goSignup);
  on('#util-become-seller', 'click', goSignup);
  on('#header-logout-btn', 'click', logout);

  // One button per language, sitting on the strip rather than behind a
  // chevron. Clicking the one already in use is a no-op rather than a
  // re-render of the whole app for no change.
  root.querySelectorAll('.lang-pick').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.lang;
      if (code && code !== currentLangCode) setLanguage(code);
    });
  });

  on('#header-notif-btn', 'click', toggleNotifications);
  on('#notif-mark-all-read', 'click', (e) => { e.stopPropagation(); markAllRead(); });
  root.querySelectorAll('.notif-item').forEach((btn) => {
    btn.addEventListener('click', () => markRead(btn.dataset.id));
  });

  // Keep the category row fitted whenever the header's width changes. A
  // ResizeObserver on the persistent header mount is used rather than a
  // window 'resize' listener: it fires once right after layout settles (so
  // the first fit measures final widths, not pre-font ones) and again on
  // every resize, and it does not depend on a DOM resize event firing. One
  // observer for the whole app - the header remounts on each render but the
  // mount element itself persists.
  ensureFitObserver();
}

let fitObserver = null;
let fitResizeBound = false;
function ensureFitObserver() {
  const refit = () => {
    const live = document.getElementById('header-mount');
    if (live) fitNavCategories(live);
  };

  // ResizeObserver is the primary mechanism: it fires once after layout
  // settles (so the first fit is measured against final widths) and on every
  // size change of the header.
  if (!fitObserver && typeof ResizeObserver !== 'undefined') {
    const mount = document.getElementById('header-mount');
    if (mount) {
      fitObserver = new ResizeObserver(refit);
      fitObserver.observe(mount);
    }
  }

  // A window 'resize' listener as well - belt and suspenders. Both fire in a
  // real browser; having both means a re-fit still happens if either path is
  // ever unavailable. rAF-coalesced so a drag-resize does not thrash.
  if (!fitResizeBound) {
    fitResizeBound = true;
    let raf = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(refit);
    });
  }
}

/**
 * Show as many category links as fit the middle lane; hide the rest.
 *
 * The chips render into a flex-1 lane between the fixed links and the pinned
 * More/Post-an-Ad group. This walks them left to right and hides the first one
 * whose right edge passes the lane's right edge, and everything after it - so
 * the row never shows a half-cut chip and never pushes anything off. The
 * hidden categories are still reachable through More, which lists them all.
 *
 * Cheap and idempotent: it only toggles a `hidden` attribute, and re-runs on
 * resize and on every header render.
 */
function fitNavCategories(root) {
  const lane = root.querySelector('.nav-cat-fill');
  if (!lane) return;
  const chips = [...lane.querySelectorAll('.nav-category-item')];
  if (chips.length === 0) return;

  // Start from a clean slate so a widened window can bring chips back.
  chips.forEach((c) => c.removeAttribute('hidden'));

  const laneRight = lane.getBoundingClientRect().right;
  let overflowing = false;
  for (const chip of chips) {
    if (overflowing) { chip.setAttribute('hidden', ''); continue; }
    // A couple of px of slack so a chip flush to the edge is not judged cut.
    if (chip.getBoundingClientRect().right > laneRight - 2) {
      chip.setAttribute('hidden', '');
      overflowing = true;
    }
  }
}

export function bindMobileTabBarEvents(root, handlers) {
  const { goHome, goSignup, goStores, goAccount } = handlers;

  root.querySelectorAll('[data-soon]').forEach((btn) => {
    btn.addEventListener('click', () => notReadyToast(btn.dataset.soon));
  });

  root.querySelector('#mtab-home')?.addEventListener('click', goHome);
  root.querySelector('#mtab-stores')?.addEventListener('click', goStores);
  // Post and Account both went to the sign-up page unconditionally, so a
  // signed-in seller tapping either was offered a form to create the account
  // they already had. These route by role now.
  root.querySelector('#mtab-post')?.addEventListener('click', goAccount || goSignup);
  root.querySelector('#mtab-account')?.addEventListener('click', goAccount || goSignup);
  root.querySelector('#mtab-categories')?.addEventListener('click', () => {
    goHome();
    setTimeout(() => {
      document.querySelector('.cat-rail-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  });
}
