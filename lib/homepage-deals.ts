import { effectivePrice, type Product } from '@/app/catalog';
import { isProductPurchasable } from '@/lib/inventory-engine';

export function homepageDeals(products: Product[], ids: string[] | undefined, clearance = false): Product[] {
  const available = products.filter(product => product.status === 'Active' && isProductPurchasable(product));
  if (ids !== undefined) {
    const byId = new Map(available.map(product => [product.id, product]));
    return ids.flatMap(id => { const product = byId.get(id); return product ? [product] : []; });
  }
  return clearance
    ? available.filter(product => product.old > effectivePrice(product)).slice(-3)
    : available.slice(0, 3);
}
