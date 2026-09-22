import { z } from 'zod';

const cartItem = z.object({
  id: z.string().min(1).max(150),
  qty: z.number().int().min(1).max(50),
  size: z.string().min(1).max(40),
  color: z.string().max(50).optional(),
  variantId: z.string().max(100).optional(),
});

export function parseSavedCart(raw: string | null) {
  try {
    const value: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    return value.slice(0, 50).flatMap(item => {
      const result = cartItem.safeParse(item);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

export function parseSavedWishlist(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw || '[]');
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, 500)
      : [];
  } catch {
    return [];
  }
}

export function saveShoppingData(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
