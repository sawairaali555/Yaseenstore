import {actor} from '@/lib/access/server';
import {ORIGIN} from '@/lib/access/policy';
export async function isAdmin(){try{await actor('content.edit');return true}catch{return false}}
export function sameOrigin(req:Request){return req.headers.get('origin')===ORIGIN;}
