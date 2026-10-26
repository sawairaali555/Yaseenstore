"use client";

import { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/app/catalog';
import type { Settings } from '@/lib/store-data';
import { homepageDeals } from '@/lib/homepage-deals';

export default function DealCarousels({ config, products, onSave }: {
  config: Settings; products: Product[]; onSave: (updated: Settings) => Promise<boolean>;
}) {
  const [lightning, setLightning] = useState(() => config.lightningDealProductIds ?? homepageDeals(products, undefined).map(product => product.id));
  const [clearance, setClearance] = useState(() => config.clearanceDealProductIds ?? homepageDeals(products, undefined, true).map(product => product.id));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      if (await onSave({ ...config, lightningDealProductIds: lightning, clearanceDealProductIds: clearance })) toast.success('Homepage deal carousels saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save deal carousels'); }
    finally { setSaving(false); }
  };
  return <section className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
    <h2 className="text-lg font-bold text-slate-900">Homepage Deal Carousels</h2>
    <p className="text-sm text-slate-500 mt-1">Choose products for Lightning Deals and Clearance Deals. Remove all products to hide a carousel. Inactive or unavailable products are not shown to shoppers.</p>
    <label className="block text-sm font-semibold mt-4">Search products
      <input type="search" className="block w-full border border-slate-300 rounded-lg p-2 mt-1" placeholder="Product name or SKU" value={query} onChange={event => setQuery(event.target.value)} />
    </label>
    <div className="grid md:grid-cols-2 gap-5 mt-4">
      {([{ title: 'Lightning Deals', ids: lightning, setIds: setLightning }, { title: 'Clearance Deals', ids: clearance, setIds: setClearance }]).map(({ title, ids, setIds }) => {
        const move = (index: number, direction: number) => setIds(current => {
          const next = [...current];
          [next[index], next[index + direction]] = [next[index + direction], next[index]];
          return next;
        });
        const matches = products.filter(product => !ids.includes(product.id) && `${product.name} ${product.sku || ''}`.toLowerCase().includes(query.toLowerCase()));
        return <div key={title} className="border border-slate-200 rounded-lg p-4">
          <h3 className="font-bold">{title} <span className="text-slate-500 text-sm">({ids.length}/100)</span></h3>
          <ol className="mt-3 space-y-2 max-h-72 overflow-y-auto">
            {ids.map((id, index) => <li key={id} className="flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
              <span className="flex-1 min-w-0">{products.find(product => product.id === id)?.name || 'Removed product'}
                {products.find(product => product.id === id)?.status !== 'Active' && <small className="block text-amber-700">Not active on storefront</small>}
              </span>
              <button type="button" disabled={saving || index === 0} onClick={() => move(index, -1)} aria-label={`Move product ${index + 1} up in ${title}`} className="p-2 disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" disabled={saving || index === ids.length - 1} onClick={() => move(index, 1)} aria-label={`Move product ${index + 1} down in ${title}`} className="p-2 disabled:opacity-30"><ArrowDown size={16} /></button>
              <button type="button" disabled={saving} onClick={() => setIds(current => current.filter(value => value !== id))} aria-label={`Remove product ${index + 1} from ${title}`} className="p-2 text-red-600"><Trash2 size={16} /></button>
            </li>)}
          </ol>
          {!ids.length && <p className="text-sm text-slate-500 py-3">No products selected. This carousel will be hidden.</p>}
          <label className="block text-sm font-semibold mt-3">Add product
            <select value="" disabled={saving || ids.length >= 100} className="block border border-slate-300 rounded-lg p-2 w-full mt-1" onChange={event => { if (event.target.value) setIds(current => [...current, event.target.value]); }}>
              <option value="">{matches.length ? 'Choose a product…' : 'No matching products'}</option>
              {matches.map(product => <option key={product.id} value={product.id}>{product.name}{product.status !== 'Active' ? ' (Draft)' : ''}</option>)}
            </select>
          </label>
        </div>;
      })}
    </div>
    <button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2 mt-4 disabled:opacity-50"><Save size={16} />{saving ? 'Saving…' : 'Save Deal Carousels'}</button>
  </section>;
}
