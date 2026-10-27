import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

async function getJson(path, signal) {
  const response = await fetch('/api' + path, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

function useResource(path) {
  const [result, setResult] = useState({ status: 'loading', data: null });
  useEffect(() => {
    const controller = new AbortController();
    setResult({ status: 'loading', data: null });
    getJson(path, controller.signal)
      .then(data => setResult({ status: 'ready', data }))
      .catch(error => {
        if (!controller.signal.aborted) setResult({ status: 'error', message: error.message });
      });
    return () => controller.abort();
  }, [path]);
  return result;
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
  return <article className="card">
    {typeof image === 'string' && image.startsWith('/') && <img className="product-image" src={image} alt="" loading="lazy" />}
    <a className="product-link" href={'/product/' + encodeURIComponent(item.id)}>{item.title}</a>
    <p>{item.price != null ? Number(item.price).toLocaleString('en-RW') + ' RWF' : 'Price on request'}</p>
    <small>{item.district || ''}</small>
  </article>;
}

function Home() {
  // These requests resolve independently. Neither blocks the other section.
  const categories = useResource('/categories');
  const products = useResource('/products?offset=0&limit=12');
  const flashDeals = useResource('/products/flash-deals');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const categoryItems = categories.data?.categories || [];
  const allProducts = products.data?.products || [];
  const visibleProducts = useMemo(() => allProducts.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch = item.title?.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  }), [allProducts, selectedCategory, query]);
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
    <header className="header"><strong>Kigali Market</strong><span>React migration experiment · not production</span></header>
    <div className="hero"><h1>Discover Kigali Market</h1><p>Browse products from sellers in Rwanda.</p></div>
    <Section title="Categories" resource={categories} select={data => data.categories}
      render={items => <div className="chips"><button className={selectedCategory === 'all' ? 'chip active' : 'chip'} onClick={() => setSelectedCategory('all')}>All categories</button>{items.map(item => <button key={item.id} className={selectedCategory === item.id ? 'chip active' : 'chip'} onClick={() => setSelectedCategory(item.id)}>{item.name}</button>)}</div>} />
    <Section title="Flash deals" resource={flashDeals} select={data => data.products}
      render={items => items.length ? <div className="cards">{items.map(item => <ProductCard key={item.id} item={item} />)}</div> : <p>No active flash deals.</p>} />
    <section className="section"><label htmlFor="search-products">Search loaded products</label><input id="search-products" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products..." /></section>
    <Section title="Marketplace products" resource={products} select={data => data.products}
      render={() => groupedProducts.length ? groupedProducts.map(([name, items]) => <div key={name} className="category-group"><h3>{name}</h3><div className="cards">{items.map(item => <ProductCard key={item.id} item={item} />)}</div></div>) : <p>No matching products in this initial sample.</p>} />
  </main>;
}

createRoot(document.getElementById('root')).render(<Home />);
