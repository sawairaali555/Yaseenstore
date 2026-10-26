import type { Product } from '@/app/catalog';
import type { StoreOffer } from '@/lib/store-data';

export type PromotionCartItem = {
  id: string;
  qty: number;
  variantId?: string;
  size?: string;
  color?: string;
};

export type PromotionResult = {
  discount: number;
  subtotal: number;
  applied: Array<{
    id: string;
    title: string;
    discount: number;
    reason: string;
  }>;
  rejected: Array<{ id: string; title: string; reason: string }>;
};

function roundMoney(value: number) {
  return Math.max(0, Math.round(value));
}

function isWithinSchedule(offer: StoreOffer, now: Date) {
  const start = offer.startAt ? Date.parse(offer.startAt) : NaN;
  const end = offer.endAt ? Date.parse(offer.endAt) : NaN;
  if (Number.isFinite(start) && now.getTime() < start) return false;
  if (Number.isFinite(end) && now.getTime() > end) return false;
  return true;
}

function eligibleItems(offer: StoreOffer, items: PromotionCartItem[], products: Product[]) {
  const productIds = new Set(offer.eligibleProductIds || []);
  const categories = new Set((offer.eligibleCategories || []).map((value) => value.toLowerCase()));
  const hasProductRule = productIds.size > 0;
  const hasCategoryRule = categories.size > 0;
  return items.filter((item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    if (!product) return false;
    if (!hasProductRule && !hasCategoryRule) return true;
    return productIds.has(product.id) || categories.has(String(product.category || '').toLowerCase()) || categories.has(String(product.subcategory || '').toLowerCase());
  });
}

/**
 * Deterministic automatic-promotion calculation shared by checkout and admin quote flows.
 * Existing offers remain compatible: percentage/fixed/bundle and minQuantity are supported.
 */
export function calculatePromotions(
  items: PromotionCartItem[],
  products: Product[],
  offers: StoreOffer[] = [],
  now = new Date(),
): PromotionResult {
  const priced = items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    const variant = product?.variants?.find((candidate) => candidate.id === item.variantId);
    const unitPrice = Number(variant?.price || product?.offerPrice || product?.price || 0);
    return { item, product, unitPrice, lineTotal: unitPrice * item.qty };
  }).filter((line) => line.product && line.unitPrice > 0);

  const subtotal = roundMoney(priced.reduce((sum, line) => sum + line.lineTotal, 0));
  const eligibleOffers = offers
    .filter((offer) => offer.enabled && isWithinSchedule(offer, now))
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  const applied: PromotionResult['applied'] = [];
  const rejected: PromotionResult['rejected'] = [];
  let remainingSubtotal = subtotal;

  for (const offer of eligibleOffers) {
    const matching = eligibleItems(offer, items, products);
    const quantity = matching.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
    const minQuantity = Math.max(1, Number(offer.minQuantity || 1));
    if (quantity < minQuantity) {
      rejected.push({ id: offer.id, title: offer.title, reason: `Add ${minQuantity - quantity} more eligible item${minQuantity - quantity === 1 ? '' : 's'}.` });
      continue;
    }

    const eligibleSubtotal = roundMoney(priced
      .filter((line) => matching.some((item) => item.id === line.item.id && (item.variantId || '') === (line.item.variantId || '')))
      .reduce((sum, line) => sum + line.lineTotal, 0));
    const base = eligibleSubtotal || remainingSubtotal;
    const rawDiscount = offer.discountType === 'fixed'
      ? Number(offer.discountValue || 0)
      : roundMoney(base * Math.min(100, Number(offer.discountValue || 0)) / 100);
    const discount = Math.min(remainingSubtotal, offer.maxDiscount ? Number(offer.maxDiscount) : rawDiscount, rawDiscount);
    if (discount <= 0) continue;

    applied.push({
      id: offer.id,
      title: offer.title,
      discount: roundMoney(discount),
      reason: offer.tagline || `${offer.discountValue}${offer.discountType === 'percentage' ? '% off' : ' off'}`,
    });
    remainingSubtotal = Math.max(0, remainingSubtotal - discount);
    if (!offer.stackable) break;
  }

  return {
    discount: roundMoney(applied.reduce((sum, offer) => sum + offer.discount, 0)),
    subtotal,
    applied,
    rejected,
  };
}
