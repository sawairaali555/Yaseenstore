"use client";

import { adminFetch } from '@/lib/admin-request';
import { ArrowLeft, Check, Plug, ShoppingBag, Store, Truck, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

const services = [
  { id: 'sell-with-store', title: 'Sell with a store', icon: Store, text: 'Launch a hosted storefront with domain, checkout, catalog, and store brand assets.' },
  { id: 'connect-store', title: 'Connect my store', icon: Plug, text: 'Keep Shopify or a custom storefront and connect warehousing, delivery, and order flow.' },
  { id: 'deliver-for-ecomplug', title: 'Deliver for EcomDrop', icon: Truck, text: 'Apply as a courier or delivery partner with company, transport, and banking details.' },
  { id: 'buy-from-ecomplug', title: 'Buy from EcomDrop', icon: ShoppingBag, text: 'Request quotes and purchase orders without operating a storefront.' },
  { id: 'supply-to-ecomplug', title: 'Supply to EcomDrop', icon: Warehouse, text: 'List products and fulfill purchase orders as a supplier partner.' },
] as const;

export default function ApplyTypes() {
  const [selected, setSelected] = useState<(typeof services)[number]['id']>('sell-with-store');
  const [busy, setBusy] = useState(false);

  async function continueApplication() {
    setBusy(true);
    try {
      const response = await adminFetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', serviceType: selected }),
      });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start application.');
      toast.success('Application draft started.');
      window.location.href = '/admin/your-stores';
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="apply-shell">
      <Toaster richColors />
      <a className="apply-back" href="/admin/your-stores"><ArrowLeft size={17} />Your Stores</a>
      <section className="apply-title">
        <span>Services</span>
        <h1>Apply for a service</h1>
        <p>Progress is saved at each step. Choose the service type that matches the store or partner workflow you want to start.</p>
      </section>
      <div className="apply-progress"><span className="active">Services</span><span>Company</span><span>Store</span><span>Banking</span><span>Review</span></div>
      <section className="apply-options">
        {services.map((service) => {
          const Icon = service.icon;
          const active = selected === service.id;
          return (
            <button key={service.id} className={active ? 'selected' : ''} onClick={() => setSelected(service.id)} type="button">
              <Icon size={24} />
              <span>{service.title}</span>
              <p>{service.text}</p>
              {active && <b><Check size={16} />Selected</b>}
            </button>
          );
        })}
      </section>
      <footer className="apply-actions">
        <a href="/admin/your-stores">Cancel</a>
        <button onClick={continueApplication} disabled={busy}>{busy ? 'Saving...' : 'Continue'}</button>
      </footer>
    </main>
  );
}
