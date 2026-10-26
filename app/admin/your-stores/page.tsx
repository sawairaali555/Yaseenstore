import { actor, AccessError } from '@/lib/access/server';
import { listOwnerStores } from '@/lib/multitenant';
import { redirect } from 'next/navigation';
import YourStores from './screen';
import '../admin.css';
import '../seller.css';
import './stores.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your Stores | EcomDrop', robots: { index: false, follow: false } };

export default async function Page() {
  try {
    const user = await actor();
    const stores = await listOwnerStores(user);
    return <YourStores user={{ name: user.name, role: user.role }} stores={stores} />;
  } catch (error) {
    if (error instanceof AccessError) redirect('/admin/login?next=%2Fadmin%2Fyour-stores');
    throw error;
  }
}
