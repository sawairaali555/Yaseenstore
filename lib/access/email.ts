import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {sql,now,AccessError,actorGuard,audit,rate,blocked} from './server';
import {seal,unseal} from './crypto';
import {User,ROLES,Role,has,canGrant} from './policy';
import {database} from '@/lib/store-data';
const encryptionKey=()=>String((env as any).ADMIN_MFA_KEY||'');
export async function emailConfig(){
 const row=await sql("SELECT * FROM email_config WHERE id='resend'").first<any>();
 return row?{key:await unseal(row.secret,encryptionKey(),'resend-config'),sender:row.sender}:null;
}
export async function emailStatus(){const row=await sql("SELECT sender FROM email_config WHERE id='resend'").first<any>();return {configured:!!row,sender:row?.sender||''};}
export async function saveEmailConfig(u:User,d:unknown){
 if(u.role!=='super_admin')throw new AccessError(403,'Only Super Admin can configure email.');
 const input=z.object({apiKey:z.string().trim().regex(/^re_[A-Za-z0-9_-]{10,200}$/),sender:z.string().trim().email().max(254)}).parse(d);
 await rate(u.id,'email-settings',10);
 const secret=await seal(input.apiKey,encryptionKey(),'resend-config');
 await database().batch([...actorGuard(u),sql("INSERT INTO email_config (id,secret,sender) VALUES ('resend',?,?) ON CONFLICT(id) DO UPDATE SET secret=excluded.secret,sender=excluded.sender",secret,input.sender),await audit(u,'email.configured','resend','Updated invitation email credentials',{sender:input.sender})]);
 return {ok:true,...await emailStatus()};
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function prepareEmail(id:string,email:string,url:string,role:Role,expires:number,sender:string){
 const text=`You are invited to Zeliy Pakistan as ${ROLES[role].name}.\n\nAccept your invitation: ${url}\n\nSign in with ${email}. Expires ${new Date(expires).toISOString()}.\nYou also need permission to open this private Site. Contact the inviter if access is denied.\nIf you were not expecting this invitation, you can ignore this email.`;
 const payload={from:`Zeliy Pakistan <${sender}>`,to:[email],subject:'Your invitation to Zeliy Pakistan',text,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#122039"><h1>zeliy<span style="color:#eabf62">.</span></h1><h2>You’re invited</h2><p>Join Zeliy Pakistan as <b>${escape(ROLES[role].name)}</b>.</p><p><a href="${escape(url)}" style="background:#122039;color:white;padding:14px 22px;display:inline-block;text-decoration:none;border-radius:8px">Accept invitation</a></p><p>Sign in with ${escape(email)}. This invitation expires ${new Date(expires).toUTCString()}.</p><p>You also need permission to open this private Site. Contact your inviter if access is denied.</p><p>If you weren’t expecting this invitation, ignore this email.</p></div>`};
 return sql('INSERT INTO invite_emails (invite_id,payload,state,updated_at) VALUES (?,?,\'pending\',?)',id,await seal(JSON.stringify(payload),encryptionKey(),'invite-email:'+id),now());
}
export async function sendInviteEmail(u:User,id:string){
 if(!has(u,'invites.create'))throw new AccessError(403,'You cannot send invitations.');
 const inv=await sql('SELECT * FROM access_invites WHERE id=?',id).first<any>();
 if(!inv)throw new AccessError(404,'Invitation not found.');
 if(u.role!=='super_admin'&&inv.invited_by!==u.id)throw new AccessError(403,'You can only send your own invitations.');
 if(!canGrant(u,inv.role)||inv.status==='revoked'||inv.expires_at<=now()||inv.uses>=inv.max_uses)throw new AccessError(409,'This invitation can no longer be sent.');
 const issuer=await sql('SELECT * FROM access_users WHERE id=?',inv.invited_by).first<User>();
 if(!issuer||issuer.status!=='active'||!canGrant(issuer,inv.role)||await blocked(issuer.id))throw new AccessError(403,'The inviter is no longer authorized.');
 const row=await sql('SELECT * FROM invite_emails WHERE invite_id=?',id).first<any>();
 if(!row)throw new AccessError(409,'This is a link-only invitation. Create a new email invitation.');
 if(row.state==='accepted')return {state:'accepted',providerId:row.provider_id};
 // Keep every replay within the provider's 24-hour idempotency window.
 if(row.first_attempt&&row.first_attempt+23*3600000<=now())throw new AccessError(409,'Retry window closed. Revoke this invitation and create a new one.');
 const config=await emailConfig();if(!config)throw new AccessError(409,'Configure Resend in the Invites tab first.');
 await rate(u.id,'invite-email',40);
 const t=now(),guard=crypto.randomUUID();
 await database().batch([...actorGuard(u),...actorGuard(issuer),sql("INSERT INTO access_guard (id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM invite_emails e JOIN access_invites i ON i.id=e.invite_id WHERE e.invite_id=? AND e.state<>'accepted' AND (e.first_attempt IS NULL OR e.first_attempt>?) AND (e.state<>'sending' OR e.updated_at<?) AND i.status<>'revoked' AND i.uses<i.max_uses AND i.expires_at>?) THEN 1 ELSE 0 END",guard,id,t-23*3600000,t-60000,t),sql('DELETE FROM access_guard WHERE id=?',guard),sql("UPDATE invite_emails SET state='sending',first_attempt=COALESCE(first_attempt,?),updated_at=?,error=NULL WHERE invite_id=?",t,t,id),await audit(u,'invite.email_requested',id,'Requested invitation email')]);
 let state='unknown',error='Delivery could not be confirmed. Retry within 23 hours.',providerId:string|null=null;
 try {
  const payload=await unseal(row.payload,encryptionKey(),'invite-email:'+id);
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':'zeliy-invite-'+id},body:payload,signal:AbortSignal.timeout(12000)});
  const result:any=await response.json();
  if(response.ok&&typeof result.id==='string'){state='accepted';error='';providerId=result.id;}
  else if(response.status>=400&&response.status<500){state='failed';error=response.status===429?'Resend rate limit reached. Retry shortly.':response.status===401||response.status===403?'Check your Resend API key and verified sender domain.':`Resend rejected the email (HTTP ${response.status}). Check your sender and Resend dashboard.`;}
 }catch{/* Do not log provider bodies, keys or invitation tokens. */}
 await database().batch([sql('UPDATE invite_emails SET state=?,provider_id=?,error=?,updated_at=?,payload=CASE WHEN ?=\'accepted\' THEN \'\' ELSE payload END WHERE invite_id=?',state,providerId,error||null,now(),state,id),await audit(u,'invite.email_'+state,id,error||'Resend accepted the invitation email',{providerId})]);
 return {state,error:error||null,providerId};
}
