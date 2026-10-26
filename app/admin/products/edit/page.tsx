import ProductEdit from './screen';
import { actor, AccessError } from '@/lib/access/server';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit product | Cartify Pakistan', robots: { index: false, follow: false } };
export default async function Page(){try{await actor('content.edit')}catch(error){if(error instanceof AccessError)redirect('/admin/login');throw error}return <ProductEdit/>;}
