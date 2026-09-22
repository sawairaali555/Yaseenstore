import Store from '../store';
import { catalog, categoryTree, settings } from '@/lib/store-data';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
const pages = new Set(['products', 'cart', 'checkout', 'wishlist', 'track-order', 'about', 'delivery', 'returns', 'privacy', 'contact-us', 'faq']);

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!(path.length === 1 && pages.has(path[0])) && !(path.length === 2 && path[0] === 'product')) notFound();
  const data = await Promise.all([catalog(), settings(), categoryTree()]).catch(() => null);
  if (!data) return <main className="wrap section"><h1>We will be right back</h1><p>The store is temporarily unavailable. Please refresh in a moment.</p><a href="/">Return to store</a></main>;
  const [items, config, tree] = data;
  if (path[0] === 'product' && !items.some(item => item.id === path[1])) notFound();
  return <Store path={path} initialProducts={items} config={config} categories={tree} />;
}
