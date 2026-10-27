// Rebuild saved cart lines from the catalog; browser data is not authoritative.
export function normalizeCart(value, products) {
  if (!Array.isArray(value)) return [];
  const catalog = new Map(products.map(product => [product.id, product]));
  const reserved = new Map();
  const lines = new Map();
  for (const item of value.slice(0, 100)) {
    const product = catalog.get(item?.id);
    if (!product || !Number.isSafeInteger(item.qty) || item.qty <= 0) continue;
    const stock = Number.isFinite(product.stock) ? Math.max(0, Math.floor(product.stock)) : 0;
    const qty = Math.min(item.qty, stock - (reserved.get(product.id) || 0));
    if (qty <= 0) continue;
    const variant = Object.fromEntries(Object.entries(item.variant || {})
      .filter(([name, selection]) => product.variants?.some(option =>
        option.name === name && option.values.includes(selection)))
      .sort(([a], [b]) => a.localeCompare(b)));
    const key = `${product.id}:${JSON.stringify(variant)}`;
    const existing = lines.get(key);
    lines.set(key, {
      key, id: product.id, name: product.name, price: product.price,
      qty: (existing?.qty || 0) + qty, variant,
    });
    reserved.set(product.id, (reserved.get(product.id) || 0) + qty);
  }
  return [...lines.values()];
}

export function readSavedValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Shopping remains available when persistence is blocked or full.
  }
}
