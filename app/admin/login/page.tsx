import {getChatGPTUser,chatGPTSignInPath} from '@/app/chatgpt-auth';
import Login from './screen';
import './login.css';
export const dynamic='force-dynamic';
export const metadata={title:'Admin login | Zeliy Pakistan',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({searchParams}:{searchParams:Promise<{next?:string;mode?:string}>}){
 const params=await searchParams;
 const next=params.next==='/admin/team'?'/admin/team':'/admin';
 const mode=['setup','change','forgot'].includes(params.mode||'')?params.mode!:'login';
 const user=await getChatGPTUser();
 return <Login verifiedEmail={user?.email||null} signIn={chatGPTSignInPath('/admin/login?mode=setup')} next={next} initialMode={mode}/>;
}
