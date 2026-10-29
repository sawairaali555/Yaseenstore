import {getChatGPTUser,chatGPTSignInPath} from '@/app/chatgpt-auth';
import Login from './screen';
import './login.css';
import {OWNER_EMAIL} from '@/lib/access/policy';
export const dynamic='force-dynamic';
export const metadata={title:'Admin login | Cartify Pakistan',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({searchParams}:{searchParams:Promise<{next?:string;mode?:string}>}){
 const params=await searchParams;
 const next=params.next==='/admin/team'?'/admin/team':'/admin';
 const mode=['setup','change','forgot'].includes(params.mode||'')?params.mode!:'login';
 const user=await getChatGPTUser();
 const standalone=!!process.env.VERCEL||process.env.AUTH_PROVIDER==='password';
 return <Login verifiedEmail={standalone?OWNER_EMAIL:user?.email||null} signIn={chatGPTSignInPath('/admin/login?mode=setup')} next={next} initialMode={mode} standalone={standalone}/>;
}
