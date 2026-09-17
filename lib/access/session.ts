import {passwordAction} from './password';
import {AccessError} from './server';
import {headers} from 'next/headers';
import {z} from 'zod';
import {reply,sql} from './server';
import {digest} from './crypto';
export async function adminSession(data:unknown){
 if((data as any)?.action!=='login'&&(data as any)?.action!=='logout')return passwordAction(data);
 const d=z.object({action:z.enum(['login','logout']),next:z.enum(['/admin','/admin/team']).default('/admin')}).parse(data);
 if(d.action==='logout'){
  const h=await headers();const token=h.get('cookie')?.match(/(?:^|;\s*)__Host-zeliy_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(token)await sql('DELETE FROM access_sessions WHERE token_hash=?',await digest(token)).run();
  return reply({ok:true},200,{'Set-Cookie':'__Host-zeliy_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
 }
 throw new AccessError(403,'Use your email and password. Create your first password from the login page.');

}
