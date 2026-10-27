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
  // Index each stocked path once instead of scanning the catalog for every node.
  const pathsByName = new Map<string, Set<string>[]>();
  for (const product of products) {
    if (!productHasStock(product)) continue;
    const path = new Set([product.category, product.subcategory, product.childCategory]
      .filter((name): name is string => Boolean(name)));
    for (const name of path) {
      const paths = pathsByName.get(name) ?? [];
      paths.push(path);
      pathsByName.set(name, paths);
    }
  }
  const result = new Map<string, boolean>();
  const walk = (node: CategoryNode, ancestors: string[]): boolean => {
    const names = [...ancestors, node.name];
    const direct = (pathsByName.get(node.name) ?? []).some(path =>
      ancestors.every(name => path.has(name)));
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
