import {actor,AccessError} from '@/lib/access/server';
import {redirect} from 'next/navigation';
import Admin from './panel';
import './admin.css';
export const dynamic='force-dynamic';
export const metadata={title:'Zeliy Pakistan | Store admin',robots:{index:false,follow:false}};
export default async function Page(){try{await actor('content.edit')}catch(e){if(e instanceof AccessError)redirect('/admin/login?next=%2Fadmin');throw e}return <Admin/>;}
