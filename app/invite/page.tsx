import {requireChatGPTUser} from '@/app/chatgpt-auth';
import Invite from './screen';
export const dynamic='force-dynamic';
export const metadata={title:'Accept your Zeliy invitation',referrer:'no-referrer',robots:{index:false,follow:false}};
export default async function Page(){return <Invite/>}
