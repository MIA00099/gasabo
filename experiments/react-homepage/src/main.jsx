import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

async function getJson(path, signal) {
  const response = await fetch('/api' + path, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

function useResource(path) {
  const [result, setResult] = useState({ status: 'loading', data: null, path });
  useEffect(() => {
    const controller = new AbortController();
    setResult({ status: 'loading', data: null, path });
    getJson(path, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ status: 'ready', data, path }); })
      .catch(error => {
        if (!controller.signal.aborted) setResult({ status: 'error', message: error.message, path });
      });
    return () => controller.abort();
  }, [path]);
  // Do not render stale results while React is committing a new query.
  return result.path === path ? result : { status: 'loading', data: null, path };
}

function Section({ title, resource, select, render }) {
  return <section className="section">
    <h2>{title}</h2>
    {resource.status === 'loading' && <div className="placeholder" role="status">Loading {title.toLowerCase()}…</div>}
    {resource.status === 'error' && <p role="alert">Could not load {title.toLowerCase()}: {resource.message}</p>}
    {resource.status === 'ready' && render(select(resource.data) || [])}
  </section>;
}

function ProductCard({ item }) {
  const image = Array.isArray(item.images) ? item.images[0] : null;
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [image]);
  return <article className="card">
    <div className="product-media">{typeof image === 'string' && image && !imageFailed ? <img className="product-image" src={image} alt={item.title} loading="lazy" onError={() => setImageFailed(true)} /> : <span className="no-photo">No image available</span>}{item.isFeatured && <span className="product-badge">Featured</span>}{!item.isFeatured && item.isTrending && <span className="product-badge">Trending</span>}</div>
    <a className="product-link" href={'/product/' + encodeURIComponent(item.id)}>{item.title}</a>
    <p className="product-price">{item.price != null ? 'RWF ' + Number(item.price).toLocaleString('en-US') : 'Price on request'}</p>
    <small>{item.district || ''}</small>
  </article>;
}

function HeroSlider({ banners, onShop }) {
  const [index, setIndex] = useState(0);
  const now = Date.now();
  const ads = (banners.data?.banners || []).filter(ad =>
    ad.type === 'HERO_SLIDER' && ad.status === 'ACTIVE' &&
    (!ad.startDate || Date.parse(ad.startDate) <= now) &&
    (!ad.endDate || Date.parse(ad.endDate) > now)
  );
  useEffect(() => setIndex(0), [banners.data]);
  useEffect(() => {
    if (ads.length < 2) return undefined;
    const timer = setInterval(() => setIndex(i => (i + 1) % ads.length), 5000);
    return () => clearInterval(timer);
  }, [ads.length]);
  const active = ads[index] || ads[0];
  return <section className="market-hero" aria-label="Marketplace promotions">
    <div className="hero-copy">
      <h1>Discover great deals on Kigali Market</h1>
      <p>Explore products from sellers across Rwanda.</p>
      <button className="shop-button" onClick={onShop}>Shop now</button>
    </div>
    <div className="hero-promo">
      {banners.status === 'loading' && <div className="hero-loading" role="status" aria-label="Loading promotions" />}
      {banners.status === 'error' && <p>Promotions are temporarily unavailable.</p>}
      {banners.status === 'ready' && (active ? <div className="hero-slide">
        {active.targetUrl ? <a href={active.targetUrl}><img src={active.image} alt={active.title || 'Promotion'} fetchPriority="high" /></a> : <img src={active.image} alt={active.title || 'Promotion'} fetchPriority="high" />}
        {ads.length > 1 && <div className="hero-dots">{ads.map((ad, i) => <button key={ad.id} aria-label={`Show promotion ${i + 1}`} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)} />)}</div>}
      </div> : <div className="hero-empty">KIGALI MARKET</div>)}
    </div>
  </section>;
}

function Home() {
  // These requests resolve independently. Neither blocks the other section.
  const categories = useResource('/categories');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => { const id = setTimeout(() => { setDebouncedQuery(query.trim()); setPage(0); }, 300); return () => clearTimeout(id); }, [query]);
  // Reset pagination in the same user action as the filter change, avoiding
  // an unnecessary request for the old page under the new filter.
  const productParams = new URLSearchParams({ offset: String(page * 12), limit: '12' });
  if (debouncedQuery) productParams.set('search', debouncedQuery);
  if (selectedCategory !== 'all') productParams.set('category', selectedCategory);
  const products = useResource('/products?' + productParams.toString());
  const flashDeals = useResource('/products/flash-deals');
  const banners = useResource('/advertisements');

  const categoryItems = useMemo(() => categories.data?.categories || [], [categories.data]);
  const allProducts = products.data?.products || [];
  const visibleProducts = allProducts;
  const groupedProducts = useMemo(() => {
    const groups = new Map();
    for (const item of visibleProducts) {
      const category = categoryItems.find(c => c.id === item.categoryId)?.name || item.category || 'Other listings';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    }
    return [...groups].sort(([a], [b]) => {
      const priority = name => /^others?$/i.test(name) ? 999 : /electronics/i.test(name) ? 1 : /vehicle|car|auto/i.test(name) ? 2 : /house|estate|property/i.test(name) ? 3 : /land|plot/i.test(name) ? 4 : 10;
      return priority(a) - priority(b);
    });
  }, [visibleProducts, categoryItems]);
  return <main>
    <div className="top-strip"><span>EN · RW</span><span>Buy and sell across Rwanda</span></div>
    <header className="header"><a className="brand" href="/">Kigali Market</a><nav aria-label="Primary navigation" className="main-nav"><a href="/">Home</a><a href="/products">Products</a><a href="/stores">Stores</a><a href="/realestate">Real Estate</a></nav><a className="header-account" href="/#/auth">Sign in</a></header>
    <div className="experiment-notice">React homepage experiment — not production</div>
    <HeroSlider banners={banners} onShop={() => document.getElementById("search-products")?.focus()} />
    <Section title="Categories" resource={categories} select={data => data.categories}
      render={items => <div className="chips"><button className={selectedCategory === 'all' ? 'chip active' : 'chip'} onClick={() => { setSelectedCategory('all'); setPage(0); }}>All categories</button>{items.map(item => <button key={item.id} className={selectedCategory === item.id ? 'chip active' : 'chip'} onClick={() => { setSelectedCategory(item.id); setPage(0); }}>{item.name}</button>)}</div>} />
    <Section title="Flash deals" resource={flashDeals} select={data => data.products}
      render={items => items.length ? <div className="flash-layout"><div className="flash-lead"><span className="flash-label">Limited-time offers</span><ProductCard item={items[0]} /></div><div className="flash-rail">{items.slice(1, 5).map(item => <ProductCard key={item.id} item={item} />)}</div></div> : <p>No active flash deals.</p>} />
    <section className="section"><label htmlFor="search-products">Search marketplace</label><input id="search-products" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products..." /></section>
    <Section title="Marketplace products" resource={products} select={data => data.products}
      render={() => groupedProducts.length ? groupedProducts.map(([name, items]) => <div key={name} className="category-group"><h3>{name}</h3><div className="cards">{items.map(item => <ProductCard key={item.id} item={item} />)}</div></div>) : <p>No matching products.</p>} />
    <nav className="pagination" aria-label="Product pages"><button disabled={page === 0 || products.status === 'loading'} onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</button><span>Page {page + 1}</span><button disabled={products.status !== 'ready' || allProducts.length < 12} onClick={() => setPage(p => p + 1)}>Next</button></nav>
  </main>;
}

createRoot(document.getElementById('root')).render(<Home />);
