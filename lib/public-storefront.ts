import type { Product } from '@/app/catalog';

// Only customer-facing catalog fields belong in a deployable snapshot.
const fields = [
  'id', 'name', 'category', 'subcategory', 'childCategory', 'brand', 'productType',
  'price', 'old', 'image', 'images', 'description', 'shortDescription', 'features',
  'status', 'soldCount', 'tag', 'sku', 'barcode', 'color', 'option', 'listingGroup',
  'stock', 'trackInventory', 'allowBackorders', 'hasVariants', 'variantOptions',
  'colorGalleries', 'sizeStock', 'sizes', 'pricingMode', 'offerPrice', 'offerStart',
  'offerEnd', 'pricingType', 'bundles', 'shipping', 'storefront', 'deal', 'seo',
] as const;

export function publicStorefrontProduct(product: Product): Product {
  const result = Object.fromEntries(fields.filter(key => product[key] !== undefined).map(key => [key, product[key]]));
  result.variants = product.variants?.map(({ costPrice: _costPrice, ...variant }) => variant);
  result.reviews = product.reviews?.filter(review => !('status' in review) || review.status === 'Approved');
  return result as Product;
}
