import {requireChatGPTUser} from '@/app/chatgpt-auth';
import Account from './screen';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/account');return <Account/>}
