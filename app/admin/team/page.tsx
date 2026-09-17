import {actor,AccessError} from '@/lib/access/server';
import {redirect} from 'next/navigation';
import Team from './screen';
import '../admin.css';
import './team.css';
export const dynamic='force-dynamic';
export const metadata={title:'Zeliy | Team & access',robots:{index:false,follow:false}};
export default async function Page(){try{await actor('users.read')}catch(e){if(e instanceof AccessError)redirect('/admin/login?next=%2Fadmin%2Fteam');throw e}return <Team/>}
