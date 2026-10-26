"use client";

import { adminFetch } from '@/lib/admin-request';
import type { OwnerStore } from '@/lib/multitenant';
import { ArrowUpRight, CheckCircle2, Globe2, Languages, Moon, Plus, Search, Store, Sun, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

const relationLabel = (store: OwnerStore) => store.relation === 'owned' ? 'Owned store' : (store.invitationLabel || 'Invited store');

export default function YourStores({ user, stores }: { user: { name: string; role: string }; stores: OwnerStore[] }) {
  const [items, setItems] = useState(stores);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((store) => [store.name, store.domain, store.country, store.address, store.contactPhone].join(' ').toLowerCase().includes(q));
  }, [items, query]);
  const primary = items.find((store) => store.primary) || items[0];

  async function makePrimary(tenantId: string) {
    setBusy(tenantId);
    try {
      const response = await adminFetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'primary', tenantId }),
      });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update primary store.');
      setItems((current) => current.map((store) => ({ ...store, primary: store.id === tenantId })));
      toast.success('Primary store updated.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="stores-owner-shell">
      <Toaster richColors />
      <aside className="stores-owner-side">
        <a className="stores-owner-logo" href="/admin/your-stores">ecomdrop<span>.</span><small>STORES OWNER</small></a>
        <nav>
          <a className="active" href="/admin/your-stores"><Store size={18} />Your Stores</a>
          <a href="/admin/apply/types"><Plus size={18} />Create New Store</a>
        </nav>
      </aside>
      <main className="stores-owner-main">
        <header className="stores-owner-top">
          <form className="stores-search" onSubmit={(event) => event.preventDefault()}>
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stores, domains, cities..." aria-label="Search stores" />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="stores-top-actions">
            <a href={primary ? `/admin?tenant=${encodeURIComponent(primary.slug)}` : '/admin'}>Go to Store <ArrowUpRight size={16} /></a>
            <button aria-label="English"><Languages size={17} />EN</button>
            <button aria-label="Light theme"><Sun size={17} /></button>
            <button aria-label="Dark theme"><Moon size={17} /></button>
            <span className="stores-user"><UserRound size={17} />{user.name}<small>{user.role}</small></span>
          </div>
        </header>
        <section className="stores-title">
          <div>
            <span>GENERAL</span>
            <h1>Your Stores</h1>
            <p>Switch between owned and invited tenant workspaces. Primary store controls the default admin context.</p>
          </div>
          <a className="stores-create" href="/admin/apply/types"><Plus size={18} />Create New Store</a>
        </section>
        <section className="stores-grid" aria-label="Stores">
          {filtered.map((store) => (
            <article className="store-card" key={store.id}>
              <div className="store-card-head">
                <span className={store.relation === 'owned' ? 'owned' : 'invited'}>{relationLabel(store)}</span>
                {store.primary && <b><CheckCircle2 size={15} />Primary</b>}
              </div>
              <h2>{store.name}</h2>
              <p className="store-domain"><Globe2 size={16} />{store.domain}</p>
              <dl>
                <div><dt>Region</dt><dd>{store.country} · {store.currency}</dd></div>
                <div><dt>Status</dt><dd>{store.status}</dd></div>
                <div><dt>Role</dt><dd>{store.membershipRole}</dd></div>
                <div><dt>Address</dt><dd>{store.address || 'Not added'}</dd></div>
                <div><dt>Contact</dt><dd>{store.contactPhone || 'Not added'}</dd></div>
              </dl>
              <div className="store-actions">
                <a href={`/admin?tenant=${encodeURIComponent(store.slug)}`}>Go to Store <ArrowUpRight size={15} /></a>
                {!store.primary && store.membershipStatus === 'active' && <button disabled={busy === store.id} onClick={() => makePrimary(store.id)}>{busy === store.id ? 'Saving...' : 'Make Primary'}</button>}
              </div>
            </article>
          ))}
        </section>
        {!filtered.length && <div className="stores-empty"><Store size={30} /><h2>No stores found</h2><p>Try a different search or start a new service application.</p></div>}
      </main>
    </div>
  );
}
