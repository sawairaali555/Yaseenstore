export const OWNER_EMAIL='yaseenkhattak7@gmail.com';
export const ORIGIN='https://zeliy-pakistan.coateddavid.chatgpt.site';
export const LOCAL_ORIGINS=new Set(['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:5174','http://localhost:5174','http://127.0.0.1:5175','http://localhost:5175','http://127.0.0.1:4173','http://localhost:4173','http://127.0.0.1:3000','http://localhost:3000']);
export const ROLES={super_admin:{name:'Super Admin',rank:100,permissions:['users.read','users.add','users.remove','users.restore','users.purge','users.ban','users.mute','users.warn','roles.assign','invites.create','logs.read','content.edit','orders.manage','settings.edit']},admin:{name:'Admin',rank:60,permissions:['users.read','users.add','users.remove','users.restore','users.ban','users.mute','users.warn','invites.create','content.edit','orders.manage']},moderator:{name:'Moderator',rank:30,permissions:['users.read','users.ban','users.mute','users.warn','content.edit']},member:{name:'Member',rank:0,permissions:[]}} as const;
export type Role=keyof typeof ROLES;
export type User={id:string;auth_id:string|null;email:string;name:string;role:Role;status:string;created_at:number;last_seen:number|null;deleted_at:number|null;version:number;session_version:number};
export const has=(u:Pick<User,'role'>,p:string)=>(ROLES[u.role]?.permissions as readonly string[]|undefined)?.includes(p)||false;
export const higher=(a:User,t:User)=>a.id!==t.id&&t.email!==OWNER_EMAIL&&ROLES[a.role].rank>ROLES[t.role].rank;
export const canGrant=(a:User,role:Role)=>a.role==='super_admin'||(a.role==='admin'&&role!=='super_admin');
export const RECOVERY_MS=30*24*60*60*1000;
export function restrictionActive(row:{expires_at:number|null;revoked_at:number|null},now=Date.now()){return !row.revoked_at&&(row.expires_at===null||row.expires_at>now)}
export function isAllowedOrigin(origin:string|null){return !!origin&&(origin===ORIGIN||LOCAL_ORIGINS.has(origin)||/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));}
