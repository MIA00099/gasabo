/**
 * KIGALI MARKET PLATFORM - Native Authentic Bilingual Translation System (English & Kinyarwanda)
 * Verified native Kinyarwanda terminology for Rwandan digital commerce.
 */

export const translations = {
  en: {
    // Nav & General
    nav_marketplace: 'Marketplace',
    nav_realestate: 'Real Estate',
    nav_admin: 'Admin & Services',
    lang_toggle_en: '🇬🇧 English',
    lang_toggle_rw: '🇷🇼 Kinyarwanda',
    
    // Hero Section
    hero_title1: 'This is where',
    hero_title2: 'to buy and see.',
    hero_sub: 'Supplies the difference.',
    browse_products: '🔍 Browse Products',
    start_selling: '✏️ Start Selling',
    
    // Floating Search Bar
    search_placeholder: 'Search products, coffee, cars, craft baskets, electronics...',
    cat_all: 'Category: All',
    district_all: 'District: All',
    all_categories: 'Category: All',
    all_districts: 'District: All',
    search_btn: 'Search',
    search_button: 'Search',

    // Section Headers
    popular_categories: 'Popular Categories',
    browse_categories: 'Popular Categories',
    explore_sector: 'Explore items by sector',
    featured_products: 'Featured Products',
    handpicked: 'Handpicked verified items across Rwanda',
    latest_products: 'Latest Products',
    active_duration: 'Active listed items (Active duration: 6 Months)',
    
    // Badges & Card Actions
    featured_badge: 'FEATURED',
    vvip_badge: 'VVIP',
    verified_badge: 'Verified',
    view_btn: 'View',
    contact_btn: 'Contact',
    sold_by: 'Sold by',
    whatsapp_btn: 'WhatsApp',
    details_btn: 'Details',

    // Category Names
    cat_electronics: 'Electronics',
    cat_vehicles: 'Vehicles',
    cat_furniture: 'Furniture',
    cat_agri: 'Agriculture',
    cat_fashion: 'Fashion',

    // Footer
    footer_desc: "Rwanda's Premier Official Direct Marketplace & Gasabo Real Estate Corporate Portal. Enabling direct peer-to-peer trade across all 30 districts.",
    quick_links: 'Quick Links',
    districts: 'Districts',
    headquarters: 'Headquarters',
    link_catalog: 'Marketplace Catalog',
    link_re: 'Gasabo Real Estate',
    link_sell: 'Start Selling',
    link_admin: 'Admin Portal'
  },
  rw: {
    // Nav & General
    nav_marketplace: 'Isoko',
    nav_realestate: 'Imitungo n\'Inzu',
    nav_admin: 'Ubuyobozi n\'Serivisi',
    lang_toggle_en: '🇬🇧 Icyongereza',
    lang_toggle_rw: '🇷🇼 Kinyarwanda',
    
    // Hero Section
    hero_title1: 'Aha ni ho',
    hero_title2: 'ugurira ukanabona.',
    hero_sub: 'Itanga itandukaniro rya nyawo.',
    browse_products: '🔍 Shakisha Ibicuruzwa',
    start_selling: '✏️ Tangira Kugurisha',
    
    // Floating Search Bar
    search_placeholder: 'Shakisha ibicuruzwa, ikawa, imodoka, agaseke, ikoranabuhanga...',
    cat_all: 'Ibyiciro: Byose',
    district_all: 'Akarere: Kose',
    all_categories: 'Ibyiciro: Byose',
    all_districts: 'Akarere: Kose',
    search_btn: 'Shakisha',
    search_button: 'Shakisha',

    // Section Headers
    popular_categories: 'Ibyiciro Bikunzwe',
    browse_categories: 'Ibyiciro Bikunzwe',
    explore_sector: 'Shakisha ibicuruzwa ukurikije urwego',
    featured_products: 'Ibicuruzwa Byatoranyijwe',
    handpicked: 'Ibicuruzwa byagenzuwe mu Rwanda n\'abacuruzi bizewe',
    latest_products: 'Ibicuruzwa Bishya',
    active_duration: 'Ibicuruzwa biriko biragurishwa (Bimara: Amezi 6)',
    
    // Badges & Card Actions
    featured_badge: 'BYATORANYIJWE',
    vvip_badge: 'VVIP',
    verified_badge: 'Wizewe',
    view_btn: 'Reba',
    contact_btn: 'Contact',
    sold_by: 'Ugura kuri',
    whatsapp_btn: 'WhatsApp',
    details_btn: 'Amakuru',

    // Category Names
    cat_electronics: 'Elegitoroniki',
    cat_vehicles: 'Imodoka',
    cat_furniture: 'Ibikoresho zo mu Nzu',
    cat_agri: 'Ubuhinzi n\'Ubworozi',
    cat_fashion: 'Imyenda n\'Imiterere',

    // Footer
    footer_desc: "Urubuga rukuru rw'isoko ryo mu Rwanda n'imitungo n'inzu za Gasabo. Koroshya ubucuruzi bw'ako kanya mu turere twose 30.",
    quick_links: 'Ibyerekezo bya Vuba',
    districts: 'Uturere',
    headquarters: 'Icyicaro Gikuru',
    link_catalog: 'Urutonde rw\'Isoko',
    link_re: 'Imitungo n\'Inzu za Gasabo',
    link_sell: 'Tangira Kugurisha',
    link_admin: 'Urubuga rw\'Ubuyobozi'
  }
};

export function getTranslation(lang, key) {
  const dictionary = translations[lang] || translations['en'];
  return dictionary[key] || translations['en'][key] || key;
}
