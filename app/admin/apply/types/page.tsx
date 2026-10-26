import { actor, AccessError } from '@/lib/access/server';
import { redirect } from 'next/navigation';
import ApplyTypes from './screen';
import '../../admin.css';
import '../../your-stores/stores.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Apply for a service | EcomDrop', robots: { index: false, follow: false } };

export default async function Page() {
  try {
    await actor();
    return <ApplyTypes />;
  } catch (error) {
    if (error instanceof AccessError) redirect('/admin/login?next=%2Fadmin%2Fapply%2Ftypes');
    throw error;
  }
}
