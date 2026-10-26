export function productHref(product) {
  const options = product.checkoutOptions || [];
  const option = options.find((item) => Number(item.stock) > 0) || options[0];
  const params = new URLSearchParams();

  if (option?.color) params.set('color', option.color);
  if (option?.size) params.set('size', option.size);
  if (option?.variantId) params.set('variantId', option.variantId);

  const query = params.toString();
  return `/product/${encodeURIComponent(product.id)}${query ? `?${query}` : ''}`;
}
