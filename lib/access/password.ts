import {headers} from 'next/headers';
import {z} from 'zod';
import {actor,userRecord,sql,rate,now,AccessError,reply,actorGuard,audit,blocked,issueSession} from './server';
import {digest,randomToken} from './crypto';
import {passwordHash,passwordMatches} from './password-hash';
import {verify} from './mfa';
import {emailConfig} from './email';
import {User,has,ORIGIN} from './policy';
import {database} from '@/lib/store-data';
const password=z.string().min(15,'Use at least 15 characters.').max(128,'Use at most 128 characters.');
const email=z.string().trim().toLowerCase().email().max(254);
const code=z.string().max(6).optional();
const clearCookie={'Set-Cookie':'__Host-zeliy_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'};
async function limits(address:string,action:string){const h=await headers();await rate('ip:'+await digest(h.get('cf-connecting-ip')||'unknown'),action,25,900000);await rate('email:'+await digest(address),action,5,900000);}
async function mfa(u:User,otp?:string){const enabled=await sql('SELECT enabled FROM access_mfa WHERE user_id=?',u.id).first<any>();return enabled?.enabled?await verify(u,otp||''):guard('SELECT 1 WHERE NOT EXISTS(SELECT 1 FROM access_mfa WHERE user_id=? AND enabled=1)',u.id);}
function guard(query:string,...args:any[]){const id=crypto.randomUUID();return [sql('INSERT INTO access_guard (id,ok) SELECT ?,CASE WHEN EXISTS('+query+') THEN 1 ELSE 0 END',id,...args),sql('DELETE FROM access_guard WHERE id=?',id)];}
function credentialGuard(u:User,hash:string){return guard('SELECT 1 FROM access_passwords WHERE user_id=? AND hash=?',u.id,hash);}
async function eligible(u:User|null){return !!u&&u.status==='active'&&has(u,'users.read')&&!await blocked(u.id);}
export async function passwordAction(data:any){
 const action=z.enum(['password-login','setup','change','forgot','reset']).parse(data.action);
 if(action==='password-login'){
  const d=z.object({email,password:z.string().min(1).max(128),code,next:z.enum(['/admin','/admin/team']).default('/admin')}).parse(data);
  await limits(d.email,'password-login');
  const u=await sql('SELECT * FROM access_users WHERE email=?',d.email).first<User>();
  const record=u?await sql('SELECT hash FROM access_passwords WHERE user_id=?',u.id).first<any>():null;
  const valid=passwordMatches(d.password,record?.hash||null);
  if(!valid||!await eligible(u)){if(u)await(await audit({...u,id:'anonymous'},'session.login_failed',u.id,'Unsuccessful password sign-in')).run();throw new AccessError(401,'Email or password is incorrect, or this account cannot access admin.');}
  const step=await mfa(u!,d.code);
  const cookie=await issueSession(u!,true,'password',[...credentialGuard(u!,record.hash),...step]);
  return reply({ok:true,next:await blocked(u!.id,'mute')?'/admin/team':d.next},200,{'Set-Cookie':cookie});
 }
 if(action==='setup'){
  const d=z.object({password,code}).parse(data);
  // Only the verified owner of this exact account can enroll its FIRST password.
  const {identity,user:u}=await userRecord(false);await limits(identity.email,'password-setup');
  if(!await eligible(u))throw new AccessError(403,'Accept your staff invitation and activate your account before setting a password.');
  if(await sql('SELECT user_id FROM access_passwords WHERE user_id=?',u!.id).first())throw new AccessError(409,'A password is already set. Use Forgot password or change it after logging in.');
  const steps=await mfa(u!,d.code),hash=passwordHash(d.password);
  await database().batch([...actorGuard(u!),...steps,sql('INSERT INTO access_passwords (user_id,hash,updated_at) VALUES (?,?,?)',u!.id,hash,now()),sql('UPDATE access_users SET session_version=session_version+1,version=version+1 WHERE id=?',u!.id),sql('DELETE FROM access_sessions WHERE user_id=?',u!.id),await audit(u!,'password.setup',u!.id,'Created first admin password')]);
  return reply({ok:true,message:'Password created. Sign in with your email and new password.'},200,clearCookie);
 }
 if(action==='change'){
  const d=z.object({password,currentPassword:z.string().min(1).max(128),code}).parse(data),u=await actor('users.read');await limits(u.email,'password-change');
  const record=await sql('SELECT hash FROM access_passwords WHERE user_id=?',u.id).first<any>();
  if(!passwordMatches(d.currentPassword,record?.hash||null))throw new AccessError(403,'Current password is incorrect.');
  await replacePassword(u,passwordHash(d.password),[...credentialGuard(u,record.hash),...await mfa(u,d.code)],'password.changed');
  return reply({ok:true,message:'Password changed. Please sign in again.'},200,clearCookie);
 }
 if(action==='forgot'){
  const d=z.object({email}).parse(data);await limits(d.email,'password-reset');
  const config=await emailConfig();if(!config)throw new AccessError(503,'Password recovery email is not configured. Contact the store owner.');
  const response={ok:true,message:'If this email belongs to an eligible account, a recovery link will be sent. Check your inbox and spam folder.'};
  const u=await sql('SELECT * FROM access_users WHERE email=?',d.email).first<User>();
  if(!await eligible(u))return reply(response);
  if(!await sql('SELECT user_id FROM access_passwords WHERE user_id=?',u!.id).first())return reply(response);
  const id=crypto.randomUUID(),token=randomToken(),url=ORIGIN+'/admin/login#reset='+token;
  await database().batch([...actorGuard(u!),sql('DELETE FROM password_resets WHERE expires_at<?',now()),sql('INSERT INTO password_resets (id,user_id,token_hash,version,expires_at) VALUES (?,?,?,?,?)',id,u!.id,await digest(token),u!.session_version,now()+1800000),await audit({...u!,id:'anonymous'},'password.recovery_requested',u!.id,'Password recovery requested')]);
  let accepted=false;
  try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':'zeliy-password-'+id},body:JSON.stringify({from:`Zeliy Pakistan <${config.sender}>`,to:[u!.email],subject:'Reset your Zeliy admin password',text:`Open this link to reset your admin password:\n\n${url}\n\nThis single-use link expires in 30 minutes. If you did not request it, ignore this email. Your password has not changed.`}),signal:AbortSignal.timeout(12000)});accepted=r.ok;}catch{}
  await(await audit({...u!,id:'anonymous'},accepted?'password.recovery_accepted':'password.recovery_unconfirmed',u!.id,accepted?'Resend accepted recovery email':'Recovery email could not be confirmed')).run();
  return reply(response);
 }
 const d=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password,code}).parse(data);await limits('reset:'+await digest(d.token),'password-reset-use');
 const tokenHash=await digest(d.token),reset=await sql('SELECT * FROM password_resets WHERE token_hash=? AND expires_at>?',tokenHash,now()).first<any>();
 const u=reset?await sql('SELECT * FROM access_users WHERE id=?',reset.user_id).first<User>():null;
 if(!reset||!await eligible(u)||reset.version!==u!.session_version)throw new AccessError(400,'This recovery link is invalid or expired. Request a new one.');
 await replacePassword(u!,passwordHash(d.password),[...guard('SELECT 1 FROM password_resets WHERE id=? AND token_hash=? AND expires_at>? AND version=?',reset.id,tokenHash,now(),u!.session_version),...await mfa(u!,d.code)],'password.reset');
 return reply({ok:true,message:'Password reset. Sign in with your new password.'},200,clearCookie);
}
async function replacePassword(u:User,hash:string,steps:ReturnType<typeof sql>[],action:string){await database().batch([...actorGuard(u),...steps,sql('UPDATE access_passwords SET hash=?,updated_at=? WHERE user_id=?',hash,now(),u.id),sql('UPDATE access_users SET session_version=session_version+1,version=version+1 WHERE id=?',u.id),sql('DELETE FROM access_sessions WHERE user_id=?',u.id),sql('DELETE FROM password_resets WHERE user_id=?',u.id),await audit(u,action,u.id,'Password updated and all app sessions revoked')]);}
