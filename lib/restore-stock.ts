import type { ManagedProduct } from './store-data';
import { AccessError } from './access/server';

export function restoreStock(product: ManagedProduct, item: { variantId?: string; size?: string; color?: string }, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new AccessError(400, 'Restock quantity must be a positive whole number.');
  const variants = product.variants || [];
  const matches = variants.filter(variant => item.variantId
    ? variant.id === item.variantId
    : (variant.size || 'Standard') === (item.size || 'Standard') && (!item.color || (variant.color || '').toLowerCase() === item.color.toLowerCase()));
  if (variants.length && matches.length !== 1) throw new AccessError(409, `The exact inventory variant for ${product.name} is unavailable. Review the order before restocking.`);
  const matchedVariant = matches[0];
  const sizeStock = product.sizeStock;
  let prevStock: number;
  if (matchedVariant) {
    prevStock = Number(matchedVariant.stock || 0);
    matchedVariant.stock = prevStock + quantity;
    product.stock = variants.reduce((total, variant) => total + Number(variant.stock || 0), 0);
  } else if (sizeStock && Object.keys(sizeStock).length) {
    const size = item.size || 'Standard';
    if (!(size in sizeStock)) throw new AccessError(409, `Size ${size} is unavailable for ${product.name}.`);
    prevStock = Number(sizeStock[size] || 0);
    sizeStock[size] = prevStock + quantity;
    product.stock = Object.values(sizeStock).reduce((total, stock) => total + Number(stock || 0), 0);
  } else {
    prevStock = Number(product.stock || 0);
    product.stock = prevStock + quantity;
  }
  return { prevStock, newStock: prevStock + quantity, matchedVariant };
}
