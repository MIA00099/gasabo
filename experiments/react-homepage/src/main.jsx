import React, { useEffect, useState } from 'react';
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

function Home() {
  // These requests resolve independently. Neither blocks the other section.
  const categories = useResource('/categories');
  const products = useResource('/products?page=1&limit=12');
  return <main>
    <header className="header"><strong>Kigali Market</strong><span>React migration experiment · not production</span></header>
    <div className="hero"><h1>Discover Kigali Market</h1><p>Browse products from sellers in Rwanda.</p></div>
    <Section title="Categories" resource={categories} select={data => data.categories}
      render={items => <div className="chips">{items.map(item => <span key={item.id} className="chip">{item.name}</span>)}</div>} />
    <Section title="Latest products" resource={products} select={data => data.products}
      render={items => <div className="cards">{items.map(item => <article className="card" key={item.id}>
        <strong>{item.title}</strong><p>{item.price != null ? Number(item.price).toLocaleString('en-RW') + ' RWF' : 'Price on request'}</p>
      </article>)}</div>} />
  </main>;
}

createRoot(document.getElementById('root')).render(<Home />);
