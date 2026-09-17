export type CategoryNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  image: string;
  enabled: boolean;
  displayOrder: number;
  description: string;
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
  depth: number;
  children: CategoryNode[];
};

export const defaultCategories = ['Fashion', 'Beauty & Care', 'Home & Kitchen', 'Electronics', 'Accessories'] as const;
export const categorySeed: Record<string, string[]> = {
  Fashion: ['Shoes', 'Clothing', 'Traditional wear'],
  'Beauty & Care': ['Skincare', 'Haircare', 'Beauty tools'],
  'Home & Kitchen': ['Cookware', 'Storage', 'Home essentials'],
  Electronics: ['Audio', 'Wearables', 'Mobile accessories'],
  Accessories: ['Bags', 'Watches', 'Everyday accessories'],
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'category';
}

export function buildDefaultCategoryTree(): CategoryNode[] {
  return defaultCategories.map((name, index) => {
    const parentId = slugify(name);
    return {
      id: parentId,
      parentId: null,
      name,
      slug: parentId,
      image: '',
      enabled: true,
      displayOrder: index,
      description: '',
      depth: 0,
      children: (categorySeed[name] || []).map((child, childIndex) => ({
        id: `${parentId}-${slugify(child)}`,
        parentId,
        name: child,
        slug: slugify(child),
        image: '',
        enabled: true,
        displayOrder: childIndex,
        description: '',
        depth: 1,
        children: [],
      })),
    };
  });
}

export function topLevelCategoryNames(tree: CategoryNode[] = []): string[] {
  return tree.filter((node) => node.enabled).map((node) => node.name);
}
