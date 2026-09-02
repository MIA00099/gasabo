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

/* ---------------------------------------------------------------------------
   Article pages - About, Terms & Conditions, Privacy Policy.

   These are prose, not cards or an accordion, so they share one small
   renderer: a list of { heading, body } sections where each body block is a
   paragraph (`p`), a bullet list (`ul`) or a term/description list (`dl`).
   Content is transcribed from the source documents supplied by Kigali Market.
   --------------------------------------------------------------------------- */

const ABOUT_SECTIONS = [
  {
    heading: 'Who We Are',
    body: [
      { p: "Kigali Market is Rwanda's leading online classifieds marketplace. Since our inception, we have connected thousands of buyers and sellers across the country, enabling them to trade goods and services quickly, safely, and efficiently." },
      { p: "From vehicles and electronics to jobs and real estate, Kigali Market serves as a trusted platform for local commerce, empowering individuals, small businesses, and service providers to reach a wider audience." },
    ],
  },
  {
    heading: 'Our Mission',
    body: [
      { p: "Our mission is simple: to make buying and selling faster, safer, and more accessible for every Rwandan. We believe that when people can trade confidently, opportunities multiply — benefiting sellers, buyers, and the community at large." },
    ],
  },
  {
    heading: 'What We Do',
    body: [
      { ul: [
        'Provide a user-friendly platform for posting and browsing classified ads.',
        'Support a wide variety of categories: vehicles, electronics, household items, property, jobs, services, and more.',
        'Encourage local, face-to-face transactions while providing tools for broader online reach.',
        'Maintain safety and trust through guidelines, reporting tools, and community support.',
      ] },
    ],
  },
  {
    heading: 'Our Values',
    body: [
      { dl: [
        ['Trust & Safety', 'We prioritize secure transactions and provide guidance to prevent fraud, ensuring every user feels confident when trading.'],
        ['Community Growth', "By empowering local sellers and service providers, we contribute to Rwanda's digital economy and entrepreneurial growth."],
        ['Innovation', 'We continuously enhance our platform with new features and tools, making trading faster, smarter, and more effective.'],
        ['Accessibility', 'Whether in Kigali or rural areas, Kigali Market ensures everyone can buy or sell with ease through a simple, intuitive platform.'],
      ] },
    ],
  },
  {
    heading: 'Our Vision for Rwanda',
    body: [
      { p: "Rwanda's digital economy is growing rapidly. With increasing internet access and mobile connectivity, we aim to provide a marketplace that is tailored to local needs. Kigali Market integrates local payment options, supports Kinyarwanda, French and English languages, and empowers sellers to thrive in an online-first economy." },
    ],
  },
  {
    heading: 'Why Choose Kigali Market',
    body: [
      { ul: [
        'A wide range of listings across multiple categories',
        'Simple, fast posting and search functionality',
        'Local-focused platform with Rwandan currency and languages',
        'A safe and community-centered marketplace',
        'Opportunities to grow your business and personal sales',
      ] },
    ],
  },
  {
    heading: 'Get Involved',
    body: [
      { p: "Join our community and start benefiting from Rwanda's largest online marketplace:" },
      { ul: [
        'Sellers: List your products or services and reach thousands of potential buyers.',
        'Buyers: Browse listings, filter your search, and negotiate safely with sellers.',
        'Partners & Agents: Collaborate with Kigali Market to expand reach, offer services, or promote businesses.',
      ] },
    ],
  },
  {
    heading: 'Contact Us',
    body: [
      { ul: [
        'Phone / WhatsApp: +250 788 350 555',
        'Email: kigalimarket@gmail.com',
      ] },
    ],
  },
];

const TERMS_SECTIONS = [
  {
    heading: 'About these Terms',
    body: [
      { p: 'Kigalimarket.com is a platform provided by Kigali Market Ltd. By using Kigali Market, you agree to comply with these Terms of Use and all applicable laws.' },
    ],
  },
  {
    heading: 'Using Kigali Market',
    body: [
      { p: 'As a condition of your use of Kigali Market, you agree that you will not:' },
      { ul: [
        'Violate any applicable laws, including consumer protection, data protection, or intellectual property laws.',
        'Post misleading, false, or incomplete listings.',
        'Share obscene, threatening, or defamatory content.',
        'Infringe on any third-party rights or distribute viruses and spam.',
        'Use automated tools (e.g., bots, scrapers) without written permission.',
        'Collect information about users without their consent.',
      ] },
      { p: 'We reserve the right to remove content or restrict accounts that violate these terms.' },
    ],
  },
  {
    heading: 'Abusing Kigali Market',
    body: [
      { p: 'Kigali Market works with its community to ensure safety and integrity. Please report offensive or fraudulent content using our reporting tools.' },
      { p: 'We may take action such as issuing warnings, limiting access, or terminating accounts for repeated violations, without assuming liability for user content.' },
    ],
  },
  {
    heading: 'Fees and Services',
    body: [
      { p: 'Kigali Market is generally free to use. Some premium services may require payment, clearly stated at the time of purchase. All fees are in Rwandan Francs and are non-refundable.' },
      { p: 'If payments fail or accounts become overdue, we may suspend or limit services until payment is made.' },
    ],
  },
  {
    heading: 'Content',
    body: [
      { p: 'All content on Kigali Market — including listings, text, and images — is protected by copyright laws. You may not copy, modify, or redistribute content without consent.' },
      { p: 'By posting content, you grant Kigali Market a worldwide, royalty-free license to use, display, and distribute it as part of our services.' },
    ],
  },
  {
    heading: 'Infringement',
    body: [
      { p: 'Do not post content that infringes third-party rights. If you believe your rights are violated, you may report the offending content to Kigali Market for removal.' },
    ],
  },
  {
    heading: 'Liability',
    body: [
      { p: 'Kigali Market acts solely as a platform and not as a supplier. We are not responsible for the accuracy, legality, or safety of user content or transactions between users.' },
      { p: 'We do not verify listings and are not liable for any loss or damage arising from use of the platform.' },
      { p: 'Your use of Kigali Market is at your own risk.' },
    ],
  },
  {
    heading: 'Personal Information',
    body: [
      { p: 'By using Kigali Market, you consent to the collection and processing of your personal information as described in our Privacy Policy.' },
    ],
  },
  {
    heading: 'Security',
    body: [
      { p: 'We take reasonable steps to protect your account. However, you are responsible for keeping your login credentials secure. Report any suspected unauthorized access immediately.' },
    ],
  },
  {
    heading: 'Disputes',
    body: [
      { p: 'Any disputes arising from use of Kigali Market shall be governed by the laws of Rwanda. We encourage users to resolve disputes amicably before pursuing legal action.' },
    ],
  },
  {
    heading: 'General',
    body: [
      { p: 'These Terms of Use constitute the entire agreement between you and Kigali Market regarding use of the platform. See our full Privacy Policy for data practices.' },
      { p: 'We reserve the right to update these Terms at any time. Continued use of Kigali Market after changes constitutes acceptance of the new terms.' },
      { p: 'If you have questions, contact us at kigalimarket@gmail.com.' },
    ],
  },
];

const PRIVACY_SECTIONS = [
  {
    heading: 'Scope and Consent',
    body: [
      { p: 'This Privacy Notice describes:' },
      { ul: [
        'the personal information we collect and how we use that information;',
        'when we might disclose your personal information; and',
        'how we keep and protect your personal information.',
      ] },
      { p: 'It applies to this Site and any Services where this Privacy Notice is referenced. By using our Services and/or registering for an account, you accept the terms of this Privacy Notice and our Terms of Use.' },
      { p: 'Kigali Market is responsible for the collection, use, disclosure, retention and protection of your personal information under applicable laws.' },
    ],
  },
  {
    heading: 'What is Personal Information?',
    body: [
      { p: 'Personal information is data that can identify a person directly or indirectly. It excludes anonymous or aggregated data that cannot identify a specific person.' },
    ],
  },
  {
    heading: 'Public Information',
    body: [
      { p: 'Public information is any information you share publicly, such as on our site. This may be visible to anyone and can appear in search engines, APIs, or media.' },
    ],
  },
  {
    heading: 'Changes to this Privacy Notice',
    body: [
      { p: 'We may change this Privacy Notice at any time. Updates take effect 30 days after posting on this Site.' },
    ],
  },
  {
    heading: 'Failure to Provide Personal Information',
    body: [
      { p: 'Providing personal information is voluntary. However, if you decline, we may not be able to offer some services.' },
    ],
  },
  {
    heading: 'Your Rights',
    body: [
      { p: 'You have the right to access, correct, or delete your personal data. You may also object to processing based on legitimate interest.' },
      { p: "If you believe we've used your data unlawfully, you may contact us or the Information Regulator:" },
      { ul: ['Tel: +250 788 350 555'] },
    ],
  },
  {
    heading: 'Information We Collect',
    body: [
      { p: 'We may collect the following types of personal information:' },
      { ul: [
        'Name, email address, and phone number when you register.',
        'Listing details and images you upload.',
        'Messages you send or receive on the platform.',
        'Device information and browsing activity on our site.',
        'Payment information when you purchase a premium service.',
      ] },
    ],
  },
  {
    heading: 'How We Use Your Information',
    body: [
      { p: 'We use your personal information to:' },
      { ul: [
        'Operate and improve the Kigali Market platform.',
        'Communicate with you about your account or listings.',
        'Process payments and prevent fraud.',
        'Send you marketing communications (you may opt out at any time).',
        'Comply with legal obligations.',
      ] },
    ],
  },
  {
    heading: 'Disclosure of Personal Information',
    body: [
      { p: 'We do not sell your personal data. We may share it with trusted service providers who assist in operating our platform, subject to confidentiality agreements, or when required by law.' },
    ],
  },
  {
    heading: 'Security',
    body: [
      { p: 'We use reasonable technical and organisational measures to protect your personal information. However, no internet transmission is 100% secure.' },
    ],
  },
  {
    heading: 'Questions & Contact',
    body: [
      { p: 'For any privacy concerns, contact us on +250 788 350 555.' },
    ],
  },
];

function renderArticleBlock(block) {
  if (block.p) {
    return `<p class="text-sm text-gray-700 leading-relaxed mb-3 last:mb-0">${escapeHtml(block.p)}</p>`;
  }
  if (block.ul) {
    return `
      <ul class="space-y-2 mb-3 last:mb-0">
        ${block.ul.map((li) => `
          <li class="flex gap-3 text-sm text-gray-700 leading-relaxed">
            <i class="fa-solid fa-circle-check text-brand-green mt-1 shrink-0"></i>
            <span>${escapeHtml(li)}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
  if (block.dl) {
    return `
      <dl class="space-y-3 mb-3 last:mb-0">
        ${block.dl.map(([term, desc]) => `
          <div>
            <dt class="text-sm font-bold text-brand-dark">${escapeHtml(term)}</dt>
            <dd class="text-sm text-gray-700 leading-relaxed">${escapeHtml(desc)}</dd>
          </div>
        `).join('')}
      </dl>
    `;
  }
  return '';
}

function renderArticlePage(container, handlers, { eyebrow, title, icon, subtitle, updated, sections }) {
  container.innerHTML = supportShell({
    eyebrow,
    title,
    icon,
    subtitle,
    body: `
      <article class="support-card support-article bg-white border border-gray-100 rounded-2xl p-5 md:p-8 shadow-sm">
        ${updated ? `<p class="text-xs text-gray-400 mb-6">Last updated ${escapeHtml(updated)}</p>` : ''}
        <div class="divide-y divide-gray-100">
          ${sections.map((sec) => `
            <section class="py-5 first:pt-0 last:pb-0">
              <h2 class="text-lg md:text-xl font-black text-brand-dark mb-2.5">${escapeHtml(sec.heading)}</h2>
              ${sec.body.map(renderArticleBlock).join('')}
            </section>
          `).join('')}
        </div>
      </article>
    `,
  });

  bindBackHome(container, handlers.goHome);
}

export function renderAboutPage(container, handlers = {}) {
  renderArticlePage(container, handlers, {
    eyebrow: 'Company',
    title: 'About Kigali Market',
    icon: 'fa-circle-info',
    subtitle: "Rwanda's online classifieds marketplace — trade goods and services quickly, safely and locally.",
    sections: ABOUT_SECTIONS,
  });
}

export function renderTermsPage(container, handlers = {}) {
  renderArticlePage(container, handlers, {
    eyebrow: 'Legal',
    title: 'Terms & Conditions',
    icon: 'fa-file-contract',
    subtitle: 'The rules for using Kigali Market (kigalimarket.com), operated by Kigali Market Ltd.',
    updated: 'September 2026',
    sections: TERMS_SECTIONS,
  });
}

export function renderPrivacyPage(container, handlers = {}) {
  renderArticlePage(container, handlers, {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    icon: 'fa-shield-halved',
    subtitle: 'How Kigali Market collects, uses, and protects your personal information.',
    updated: 'September 2026',
    sections: PRIVACY_SECTIONS,
  });
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
