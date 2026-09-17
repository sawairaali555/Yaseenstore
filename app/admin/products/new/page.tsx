import {actor,AccessError} from '@/lib/access/server';
import {redirect} from 'next/navigation';
import Listing from './screen';
import './listing.css';
export const dynamic='force-dynamic';
export const metadata={title:'Add my product | Zeliy Pakistan',robots:{index:false,follow:false}};
export default async function Page(){try{await actor('content.edit')}catch(e){if(e instanceof AccessError)redirect('/admin/login');throw e}return <Listing/>}
