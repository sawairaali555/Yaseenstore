import {scryptSync,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {randomToken} from './crypto';
// OWASP's memory-conscious scrypt profile: 16 MiB, five passes.
const options={N:16384,r:8,p:5,maxmem:32*1024*1024};
export function passwordHash(password:string,salt=randomToken()){return 'scrypt-v1$'+salt+'$'+scryptSync(password,salt,32,options).toString('hex');}
export function passwordMatches(password:string,stored:string|null){const valid=stored?.match(/^scrypt-v1\$([a-f0-9]{64})\$([a-f0-9]{64})$/);const salt=valid?.[1]||'0'.repeat(64);const actual=scryptSync(password,salt,32,options);const expected=Buffer.from(valid?.[2]||'0'.repeat(64),'hex');return timingSafeEqual(actual,expected)&&!!valid;}
