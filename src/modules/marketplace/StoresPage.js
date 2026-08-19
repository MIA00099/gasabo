/**
 * Stores Directory View - Ported from delivered mockup stores.html.
 * Renders verified sellers, their contact info, location, categories, and products.
 */
import { stateEngine } from '../../store/stateEngine.js';
import { pushPath, pathForListing, ROUTE_PRODUCT } from '../../store/router.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

// Sample verified stores dataset based on stores.html mockup, enriched with live products if available
const DEFAULT_STORES = [
  {
    id: 'store-1',
    name: 'Mike Rwagasabo',
    initials: 'MR',
    verified: true,
    phone: '+250 788 123 456',
    district: 'Gasabo',
    categories: ['Electronics', 'Real Estate'],
    products: [
      { id: 'p1', title: 'iPhone 13 Pro Max 128GB', price: 950000, wasPrice: 1190000, discount: '-20%', rating: 4.8, reviews: 120, image: '/03454683-fd32-47bb-89ad-8a441c5169b1.png' },
      { id: 'p2', title: 'Modern 3-Bedroom Villa in Gacuriro', price: 145000000, wasPrice: null, discount: null, rating: 5.0, reviews: 14, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80' },
      { id: 'p3', title: 'MacBook Pro M2 16" (2023)', price: 1850000, wasPrice: 2100000, discount: '-12%', rating: 4.9, reviews: 42, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80' },
      { id: 'p4', title: 'Samsung 55" QLED 4K Smart TV', price: 680000, wasPrice: 750000, discount: '-9%', rating: 4.7, reviews: 31, image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=600&q=80' },
    ]
  },
  {
    id: 'store-2',
    name: 'Kigali Tech Hub',
    initials: 'KT',
    verified: true,
    phone: '+250 789 987 654',
    district: 'Nyarugenge',
    categories: ['Electronics'],
    products: [
      { id: 'p5', title: 'Sony WH-1000XM5 Headphones', price: 380000, wasPrice: 420000, discount: '-10%', rating: 4.9, reviews: 88, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
      { id: 'p6', title: 'iPad Air 5th Gen 256GB WiFi', price: 720000, wasPrice: 800000, discount: '-10%', rating: 4.8, reviews: 56, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80' },
      { id: 'p7', title: 'Canon EOS R6 Mark II Body', price: 2400000, wasPrice: 2600000, discount: '-7%', rating: 5.0, reviews: 19, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80' },
    ]
  },
  {
    id: 'store-3',
    name: 'Gasabo Motors & Auto',
    initials: 'GM',
    verified: true,
    phone: '+250 783 111 222',
    district: 'Kicukiro',
    categories: ['Vehicles'],
    products: [
      { id: 'p8', title: 'Toyota RAV4 Hybrid 2022', price: 38000000, wasPrice: 42000000, discount: '-10%', rating: 4.9, reviews: 27, image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80' },
      { id: 'p9', title: 'Mercedes-Benz C200 2020 AMG Line', price: 45000000, wasPrice: 49000000, discount: '-8%', rating: 5.0, reviews: 15, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80' },
    ]
  }
];

export function renderStoresPage(container) {
  let searchFilter = '';
  let categoryFilter = 'all';
  let districtFilter = 'all';

  function render() {
    const state = stateEngine.getState();
    const stores = DEFAULT_STORES;

    const filteredStores = stores.filter((store) => {
      const matchSearch = !searchFilter ||
        store.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        store.phone.includes(searchFilter) ||
        store.district.toLowerCase().includes(searchFilter.toLowerCase());

      const matchCat = categoryFilter === 'all' || store.categories.includes(categoryFilter);
      const matchDist = districtFilter === 'all' || store.district.toLowerCase() === districtFilter.toLowerCase();

      return matchSearch && matchCat && matchDist;
    });

    container.innerHTML = `
      <div class="bg-[#F4F7F6] py-6 px-4 min-h-screen">
        <div class="compact-container">

          <!-- Page Title & Stats Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <i class="fa-solid fa-store text-brand-green"></i> Verified Sellers & Stores
              </h1>
              <p class="text-xs text-gray-500 mt-1">Explore verified sellers, their listed products, phone numbers, and location details</p>
            </div>

            <div class="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm text-xs">
              <span class="font-bold text-brand-green">Active Stores: ${stores.length}</span>
              <span class="text-gray-300">|</span>
              <span class="text-gray-600">Total Listings: ${stores.reduce((acc, s) => acc + s.products.length, 0)}+</span>
            </div>
          </div>

          <!-- Filter Controls Bar -->
          <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap items-center gap-3 flex-1">

              <div class="relative min-w-[200px] flex-1 sm:flex-none">
                <input type="text" id="seller-search" value="${escapeHtml(searchFilter)}"
                  placeholder="Search seller name or phone..."
                  class="w-full bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-xl py-2 px-3 pl-8 outline-none focus:border-brand-green">
                <i class="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>

              <select id="category-filter" class="bg-gray-50 border border-gray-300 text-gray-700 text-xs rounded-xl py-2 px-3 outline-none focus:border-brand-green">
                <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
                <option value="Electronics" ${categoryFilter === 'Electronics' ? 'selected' : ''}>Electronics</option>
                <option value="Real Estate" ${categoryFilter === 'Real Estate' ? 'selected' : ''}>Real Estate</option>
                <option value="Vehicles" ${categoryFilter === 'Vehicles' ? 'selected' : ''}>Vehicles</option>
                <option value="Furniture" ${categoryFilter === 'Furniture' ? 'selected' : ''}>Furniture</option>
              </select>

              <select id="district-filter" class="bg-gray-50 border border-gray-300 text-gray-700 text-xs rounded-xl py-2 px-3 outline-none focus:border-brand-green">
                <option value="all" ${districtFilter === 'all' ? 'selected' : ''}>All Districts</option>
                <option value="Gasabo" ${districtFilter === 'Gasabo' ? 'selected' : ''}>Gasabo</option>
                <option value="Nyarugenge" ${districtFilter === 'Nyarugenge' ? 'selected' : ''}>Nyarugenge</option>
                <option value="Kicukiro" ${districtFilter === 'Kicukiro' ? 'selected' : ''}>Kicukiro</option>
              </select>
            </div>

            <span class="text-xs text-gray-500 font-medium">Showing <strong class="text-gray-900" id="store-count">${filteredStores.length} Stores</strong></span>
          </div>

          <!-- STORES GRID -->
          <div class="space-y-6" id="stores-list">
            ${filteredStores.length === 0 ? `
              <div class="bg-white rounded-2xl p-12 text-center border border-gray-200">
                <i class="fa-solid fa-store-slash text-4xl text-gray-300 mb-3"></i>
                <h3 class="font-bold text-gray-700 text-base mb-1">No verified stores found</h3>
                <p class="text-xs text-gray-500">Try adjusting your search terms or filter criteria.</p>
              </div>
            ` : filteredStores.map((store) => `
              <div class="store-card bg-white rounded-2xl p-5 shadow-sm border border-gray-200 transition hover:shadow-md">
                <!-- Top Info Row -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div class="flex items-center gap-3">
                    <div class="w-14 h-14 rounded-full bg-green-100 border-2 border-brand-green flex items-center justify-center text-brand-green font-black text-xl shadow-inner shrink-0">
                      ${store.initials}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h2 class="text-lg font-bold text-gray-900">${escapeHtml(store.name)}</h2>
                        ${store.verified ? `
                          <span class="bg-green-100 text-brand-green text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <i class="fa-solid fa-circle-check"></i> Verified Seller
                          </span>
                        ` : ''}
                      </div>
                      <div class="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-1">
                        <span class="flex items-center gap-1 font-semibold text-gray-800">
                          <i class="fa-solid fa-phone text-brand-green"></i> ${escapeHtml(store.phone)}
                        </span>
                        <span class="flex items-center gap-1">
                          <i class="fa-solid fa-location-dot text-brand-orange"></i> District: ${escapeHtml(store.district)}
                        </span>
                        <span class="flex items-center gap-1">
                          <i class="fa-solid fa-box text-gray-400"></i> ${store.products.length} Products Listed
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <a href="tel:${store.phone.replace(/\s+/g, '')}" class="bg-brand-green text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-green-800 transition flex items-center gap-1.5 shadow">
                      <i class="fa-solid fa-phone text-xs"></i> Call Seller
                    </a>
                    <a href="https://wa.me/${store.phone.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 shadow">
                      <i class="fa-brands fa-whatsapp text-xs"></i> WhatsApp
                    </a>
                  </div>
                </div>

                <!-- Products Carousel/Grid -->
                <div class="mt-4">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-bold text-gray-700 uppercase tracking-wider">Store Inventory</span>
                    <div class="flex gap-1.5">
                      ${store.categories.map((c) => `<span class="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">${escapeHtml(c)}</span>`).join('')}
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    ${store.products.map((p) => `
                      <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-brand-green transition cursor-pointer flex flex-col justify-between group product-item-btn" data-id="${p.id}">
                        <div>
                          <div class="h-32 rounded-lg bg-white overflow-hidden flex items-center justify-center p-2 mb-2 relative border border-gray-100">
                            ${p.discount ? `<span class="absolute top-1.5 left-1.5 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded">${p.discount}</span>` : ''}
                            <img src="${p.image}" alt="${escapeHtml(p.title)}" class="max-h-full object-contain group-hover:scale-105 transition transform">
                          </div>
                          <h4 class="text-xs font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-brand-green">${escapeHtml(p.title)}</h4>
                        </div>
                        <div>
                          <div class="flex items-baseline gap-1.5 mt-2">
                            <span class="font-black text-sm text-brand-dark">RWF ${p.price.toLocaleString()}</span>
                            ${p.wasPrice ? `<span class="text-[10px] text-gray-400 line-through">RWF ${p.wasPrice.toLocaleString()}</span>` : ''}
                          </div>
                          <div class="flex items-center text-[9px] text-yellow-400 mt-1">
                            <i class="fa-solid fa-star"></i> <span class="font-bold text-gray-700 ml-1">${p.rating}</span>
                            <span class="text-gray-400 ml-1">(${p.reviews})</span>
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

        </div>
      </div>
    `;

    // Bind event handlers
    const searchInput = container.querySelector('#seller-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchFilter = e.target.value;
        render();
      });
    }

    const catSelect = container.querySelector('#category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        categoryFilter = e.target.value;
        render();
      });
    }

    const distSelect = container.querySelector('#district-filter');
    if (distSelect) {
      distSelect.addEventListener('change', (e) => {
        districtFilter = e.target.value;
        render();
      });
    }

    container.querySelectorAll('.product-item-btn').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        pushPath(pathForListing(ROUTE_PRODUCT, id));
        stateEngine.setRoute({ kind: ROUTE_PRODUCT, id });
      });
    });
  }

  render();
}
