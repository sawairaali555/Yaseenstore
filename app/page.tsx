import Store from './store';
import { catalog, categoryTree, settings } from '@/lib/store-data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await Promise.all([catalog(), settings(), categoryTree()]).catch(() => null);
  if (!data) return <main className="wrap section"><h1>We will be right back</h1><p>The store is temporarily unavailable. Please refresh in a moment.</p><a href="/">Try again</a></main>;
  const [items, config, tree] = data;
  return <Store path={[]} initialProducts={items} config={config} categories={tree} />;
}
