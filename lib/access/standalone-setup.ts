import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { database } from '@/lib/store-data';
import { OWNER_EMAIL, ROLES } from './policy';
import { digest } from './crypto';
import { passwordHash } from './password-hash';
import { AccessError, now, sql } from './server';

// Initial enrollment needs a server-held secret, never an identity header or
// a client-supplied email/role. It cannot reset an existing owner's credentials.
export async function setupStandaloneOwner(data: unknown) {
  const token = process.env.ADMIN_SETUP_TOKEN;
  if (!token || token.length < 32 || (database() as any)?.provider !== 'supabase') {
    throw new AccessError(503, 'Initial admin setup is unavailable. Contact the store owner.');
  }
  const input = z.object({
    setupKey: z.string().min(1).max(512),
    password: z.string().min(15, 'Use at least 15 characters.').max(128),
  }).parse(data);
  const actual = Buffer.from(await digest(input.setupKey), 'hex');
  const expected = Buffer.from(await digest(token), 'hex');
  if (!timingSafeEqual(actual, expected)) throw new AccessError(403, 'The setup key is incorrect.');
  if (await sql("SELECT id FROM access_users WHERE id='owner' OR email=?", OWNER_EMAIL).first()) {
    throw new AccessError(409, 'The owner account already exists. Sign in or use password recovery.');
  }
  const timestamp = now();
  await database().batch([
    ...Object.entries(ROLES).map(([id, role]) => sql('INSERT INTO access_roles (id,name,rank,permissions) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING', id, role.name, role.rank, JSON.stringify(role.permissions))),
    sql("INSERT INTO access_users (id,email,name,role,status,created_at) VALUES ('owner',?,?,'super_admin','active',?)", OWNER_EMAIL, 'Store Owner', timestamp),
    sql("INSERT INTO access_passwords (user_id,hash,updated_at) VALUES ('owner',?,?)", passwordHash(input.password), timestamp),
    sql("INSERT INTO access_audit (id,actor_id,target_id,action,reason,metadata,created_at) VALUES (?,'owner','owner','password.setup','Initial owner enrollment','{}',?)", crypto.randomUUID(), timestamp),
  ]);
  return { ok: true, message: 'Your admin account is ready. Sign in with your email and password.' };
}
