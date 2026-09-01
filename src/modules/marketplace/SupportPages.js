import { pushHome, ROUTE_HOME } from '../../store/router.js';
import { stateEngine } from '../../store/stateEngine.js';

const SAFETY_TIPS = [
  "Don't do anything online that you wouldn't do in real life.",
  'Use common sense. If something sounds too good to be true, it probably is.',
  'Kigali Market encourages face-to-face, local trading. Ask to meet in a safe public place, inspect the item, then exchange money.',
  "Learn more about the seller you're transacting with. Check how long they have been active and review their reputation.",
  'If a local transaction is not possible, never send your item before receiving payment. Confirm that the money is reflected in your bank or Mobile Money account.',
  'Never share personal or banking information such as credit card numbers or ID numbers over the internet.',
  'In case of fraud or illegal activity, contact Kigali Market and report it to the Police.',
];

const FAQ_ITEMS = [
  {
    category: 'general',
    question: 'What is Kigali Market?',
    answer: 'Kigali Market is a classified ads platform in Rwanda where people can buy, sell, rent and advertise products and services within the Rwandan market.',
  },
  {
    category: 'selling',
    question: 'How can I post an ad on Kigali Market?',
    answer: 'Visit www.kigalimarket.com, register or log in, then click Post an Ad or Sign in my Account. Create an account if you do not have one, fill in the required details, and submit your ad for review.',
  },
  {
    category: 'selling',
    question: 'Is there a fee to post ads on Kigali Market?',
    answer: 'Posting an ad is currently free. For promotional placement, premium listing or flash sale visibility, contact the administrator so the fee can be discussed.',
  },
  {
    category: 'buying',
    question: 'Can I purchase products directly through Kigali Market?',
    answer: 'Yes. Open the listing you want and contact the seller using the phone number shown on that product.',
  },
  {
    category: 'support',
    question: 'How can I contact Kigali Market for support or inquiries?',
    answer: 'Call or WhatsApp +250 788 350 555, email kigalimarket@gmail.com, or contact Kigali Market on Facebook, Instagram and TikTok.',
  },
  {
    category: 'promotions',
    question: 'Are there any promotional offers available?',
    answer: 'Yes. Kigali Market occasionally offers promotions, and most promotional offers appear in the Flash Deals area.',
  },
  {
    category: 'promotions',
    question: 'How do I stay updated with the latest news and offers from Kigali Market?',
    answer: 'Follow Kigali Market on Facebook, Instagram and TikTok, and regularly visit www.kigalimarket.com for new listings and offers.',
  },
  {
    category: 'support',
    question: 'How do I report fraud or suspicious activity?',
    answer: 'Contact Kigali Market with the listing details and seller information, then report illegal activity to the Police if needed.',
  },
];

const FAQ_CATEGORIES = [
  ['all', 'All'],
  ['general', 'General'],
  ['buying', 'Buying'],
  ['selling', 'Selling'],
  ['promotions', 'Promotions'],
  ['support', 'Support'],
];

function supportShell({ title, subtitle, eyebrow, icon, body }) {
  return `
    <div class="support-page bg-[#F4F7F6] min-h-screen py-8 px-4 md:px-8">
      <div class="max-w-6xl mx-auto">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase text-brand-green mb-1">${escapeHtml(eyebrow)}</p>
            <h1 class="text-3xl md:text-4xl font-black text-brand-dark flex items-center gap-3">
              <i class="fa-solid ${icon} text-brand-orange"></i>
              ${escapeHtml(title)}
            </h1>
            <p class="text-sm md:text-base text-gray-600 mt-2 max-w-3xl">${escapeHtml(subtitle)}</p>
          </div>
          <button type="button" id="support-back-home" class="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-brand-dark font-bold px-4 py-2.5 rounded-xl text-xs hover:border-brand-green hover:text-brand-green transition shadow-sm">
            <i class="fa-solid fa-arrow-left"></i>
            Marketplace
          </button>
        </div>
        ${body}
      </div>
    </div>
  `;
}

function bindBackHome(container, handler) {
  container.querySelector('#support-back-home')?.addEventListener('click', () => {
    if (handler) {
      handler();
      return;
    }
    pushHome();
    stateEngine.setRoute({ kind: ROUTE_HOME, id: null });
  });
}

export function renderHelpCenterPage(container, handlers = {}) {
  container.innerHTML = supportShell({
    eyebrow: 'Support',
    title: 'Help Center',
    icon: 'fa-shield-heart',
    subtitle: 'Safety guidance and contact details for buying and selling on Kigali Market.',
    body: `
      <div class="grid grid-cols-1 lg:grid-cols-[1.5fr_0.9fr] gap-5">
        <section class="support-card bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm">
          <h2 class="text-xl font-black text-brand-dark mb-4">Safety Tips for Buying &amp; Selling</h2>
          <ul class="space-y-3 text-sm text-gray-700 leading-relaxed">
            ${SAFETY_TIPS.map((tip) => `
              <li class="flex gap-3">
                <i class="fa-solid fa-circle-check text-brand-green mt-1 shrink-0"></i>
                <span>${escapeHtml(tip)}</span>
              </li>
            `).join('')}
          </ul>
        </section>

        <aside class="support-card bg-brand-dark text-white rounded-2xl p-5 md:p-6 shadow-sm">
          <h2 class="text-xl font-black mb-4">Contact Us</h2>
          <div class="space-y-4 text-sm">
            <a href="tel:+250788350555" class="support-contact-row">
              <i class="fa-solid fa-phone"></i>
              <span><strong>Call/WhatsApp</strong><br>+250 788 350 555</span>
            </a>
            <a href="mailto:kigalimarket@gmail.com" class="support-contact-row">
              <i class="fa-solid fa-envelope"></i>
              <span><strong>Email</strong><br>kigalimarket@gmail.com</span>
            </a>
            <div class="support-contact-row">
              <i class="fa-solid fa-location-dot"></i>
              <span><strong>Location</strong><br>Kigali, Rwanda</span>
            </div>
          </div>
        </aside>
      </div>
    `,
  });

  bindBackHome(container, handlers.goHome);
}

export function renderFaqPage(container, handlers = {}) {
  container.innerHTML = supportShell({
    eyebrow: 'Questions',
    title: 'Frequently Asked Questions',
    icon: 'fa-circle-question',
    subtitle: 'Quick answers about posting ads, buying safely, promotions and contacting Kigali Market.',
    body: `
      <section class="support-card bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm">
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start mb-5">
          <label class="relative block">
            <span class="sr-only">Search frequently asked questions</span>
            <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input id="faq-search" type="search" placeholder="Search FAQs" class="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-green-100">
          </label>
          <div id="faq-filters" class="flex flex-wrap gap-2">
            ${FAQ_CATEGORIES.map(([id, label], index) => `
              <button type="button" data-faq-category="${id}" class="faq-filter px-3.5 py-2 rounded-xl border text-xs font-bold transition ${index === 0 ? 'bg-brand-green border-brand-green text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'}">
                ${escapeHtml(label)}
              </button>
            `).join('')}
          </div>
        </div>

        <p id="faq-result-count" class="text-xs text-gray-500 mb-3">${FAQ_ITEMS.length} answers available</p>

        <div id="faq-list" class="space-y-3">
          ${FAQ_ITEMS.map((item) => `
            <details class="support-faq-item border border-gray-200 rounded-xl bg-white overflow-hidden" data-category="${escapeHtml(item.category)}">
              <summary class="support-faq-summary cursor-pointer list-none flex items-center justify-between gap-4 px-4 py-3 text-sm font-black text-brand-dark">
                <span>${escapeHtml(item.question)}</span>
                <i class="fa-solid fa-chevron-down support-faq-chevron text-brand-green transition-transform"></i>
              </summary>
              <div class="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
                ${escapeHtml(item.answer)}
              </div>
            </details>
          `).join('')}
        </div>

        <div id="faq-empty" hidden class="text-center py-10 text-gray-500">
          <i class="fa-solid fa-magnifying-glass text-3xl text-gray-300 mb-3"></i>
          <p class="text-sm font-bold text-gray-700">No FAQ matched your search.</p>
        </div>
      </section>
    `,
  });

  bindBackHome(container, handlers.goHome);
  bindFaqInteractions(container);
}

function bindFaqInteractions(container) {
  const search = container.querySelector('#faq-search');
  const filters = Array.from(container.querySelectorAll('.faq-filter'));
  const items = Array.from(container.querySelectorAll('.support-faq-item'));
  const count = container.querySelector('#faq-result-count');
  const empty = container.querySelector('#faq-empty');
  let activeCategory = 'all';

  const setFilterStyle = (button, isActive) => {
    button.className = `faq-filter px-3.5 py-2 rounded-xl border text-xs font-bold transition ${
      isActive
        ? 'bg-brand-green border-brand-green text-white'
        : 'bg-white border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'
    }`;
  };

  const applyFilters = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;

    items.forEach((item) => {
      const categoryMatch = activeCategory === 'all' || item.dataset.category === activeCategory;
      const textMatch = !query || item.textContent.toLowerCase().includes(query);
      const show = categoryMatch && textMatch;
      item.hidden = !show;
      if (!show) item.open = false;
      if (show) visible += 1;
    });

    if (count) count.textContent = `${visible} ${visible === 1 ? 'answer' : 'answers'} available`;
    if (empty) empty.hidden = visible > 0;
  };

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.faqCategory || 'all';
      filters.forEach((candidate) => setFilterStyle(candidate, candidate === button));
      applyFilters();
    });
  });

  search?.addEventListener('input', applyFilters);

  items.forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      items.forEach((other) => {
        if (other !== details) other.open = false;
      });
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}
