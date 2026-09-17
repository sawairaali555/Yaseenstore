import { redirect } from 'next/navigation';
import { categoryTree } from '@/lib/store-data';

function findName(nodes: Awaited<ReturnType<typeof categoryTree>>, slug: string): string | undefined {
  for (const node of nodes) {
    if (!node.enabled) continue;
    if (node.slug === slug) return node.name;
    const child = findName(node.children, slug);
    if (child) return child;
  }
  return undefined;
}

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const tree = await categoryTree();
  const name = findName(tree, slug[slug.length - 1] || '');
  redirect(name ? `/products?category=${encodeURIComponent(name)}` : '/products');
}
