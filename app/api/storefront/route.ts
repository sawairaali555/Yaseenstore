import { catalog, categoryTree, settings } from '@/lib/store-data';
import { publicStorefrontProduct } from '@/lib/public-storefront';
import { effectivePrice } from '@/app/catalog';
import { filterStorefrontProducts, getSizesForColor, getSizeAvailabilityDetails } from '@/lib/inventory-engine';
import { productImage } from '@/lib/product-image';

export async function GET() {
  const publicCatalog = filterStorefrontProducts(await catalog());
  const products = publicCatalog.map(product => {
    const checkoutOptions = getSizesForColor(product, product.color, false).flatMap(size => {
      const availability = getSizeAvailabilityDetails(product, size, product.color);
      if (!availability.isPurchasable) return [];
      const variant = product.variants?.find(item => (item.size || 'Standard') === size && (!product.color || item.color?.toLowerCase() === product.color.toLowerCase()));
      return [{ size, color: product.color || '', variantId: variant?.id || '', stock: product.allowBackorders ? 50 : Math.min(50, availability.stock) }];
    });
    const category = product.subcategory === 'Shoes' ? 'Shoes' : product.category === 'Beauty & Care' ? 'Beauty' : product.category;
    const reviews = product.reviews || [];
    const rating = reviews.length ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)) : 0;
    let image = productImage(product.image);
    // Store-uploaded media uses the current origin (or the standalone API proxy).
    try { const url = new URL(image); if (url.pathname.startsWith('/api/media/')) image = url.pathname; } catch { /* Already a relative URL. */ }
    return {
      id: product.id, name: product.name, category, image,
      categoryPath: [...new Set([category, product.category, product.subcategory, product.childCategory].filter(Boolean))],
      price: effectivePrice(product), originalPrice: product.old || product.price,
      description: product.description || '', rating, reviews: reviews.length,
      sold: (product.soldCount || '0').replace(/\s*sold\s*$/i, ''), stock: product.stock ?? Math.max(0, ...checkoutOptions.map(option => option.stock)),
      checkoutOptions,
    };
  }).filter(product => product.checkoutOptions.length > 0);
  return Response.json({ products, catalog: publicCatalog.map(publicStorefrontProduct), settings: await settings(), categories: await categoryTree() }, { headers: { 'Cache-Control': 'no-store' } });
}
