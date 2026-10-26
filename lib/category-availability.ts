import type { Product } from '@/app/catalog';
import type { CategoryNode } from './categories';

export function productHasStock(product: Product): boolean {
  if (product.status && product.status !== 'Active') return false;
  if (product.storefront?.showOnStorefront === false) return false;
  if (product.variants?.length) return product.variants.some(variant => Number(variant.stock || 0) > 0);
  const sizes = product.sizeStock as Record<string, number> | undefined;
  if (sizes && Object.keys(sizes).length) return Object.values(sizes).some(value => Number(value) > 0);
  return Number(product.stock || 0) > 0;
}

export function categoryAvailability(tree: CategoryNode[], products: Product[]): Map<string, boolean> {
  const stocked = products.filter(productHasStock);
  const result = new Map<string, boolean>();
  const walk = (node: CategoryNode, ancestors: string[]): boolean => {
    const names = [...ancestors, node.name];
    const direct = stocked.some(product => {
      const path = [product.category, product.subcategory, (product as Product & { childCategory?: string }).childCategory].filter(Boolean);
      return path.includes(node.name) && ancestors.every(name => path.includes(name));
    });
    const descendants = node.children.map(child => walk(child, names)).some(Boolean);
    const available = direct || descendants;
    result.set(node.id, available);
    return available;
  };
  tree.forEach(node => walk(node, []));
  return result;
}

export function visibleCategoryTree(tree: CategoryNode[], availability: Map<string, boolean>): CategoryNode[] {
  return tree.flatMap(node => node.enabled && availability.get(node.id)
    ? [{ ...node, children: visibleCategoryTree(node.children, availability) }]
    : []);
}
