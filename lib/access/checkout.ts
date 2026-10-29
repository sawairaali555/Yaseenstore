import { database } from '@/lib/store-data';
import type { User } from './policy';
import { actor, AccessError, blocked, rate, sql } from './server';
import { digest } from './crypto';

export async function checkoutIdentity(req: Request): Promise<{ user: User; guest: boolean }> {
  try { return { user: await actor(), guest: false }; }
  catch (error) {
    // Preserve bans/permission failures for authenticated users. Only the
    // independent Supabase storefront supports anonymous COD checkout.
    if (!(error instanceof AccessError) || error.status !== 401 || (database() as any)?.provider !== 'supabase') throw error;
  }
  const requestedTenant = new URL(req.url).searchParams.get('tenant');
  if (requestedTenant && requestedTenant !== 'ecomdrop' && requestedTenant !== 'zeliy-pakistan') {
    throw new AccessError(403, 'This store does not accept guest orders.');
  }
  const address = req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for') || 'unknown';
  await rate('guest-ip:' + await digest(address.slice(0,200)), 'checkout', 20, 3600000);
  const user = await sql("SELECT * FROM access_users WHERE id='storefront-guest' AND role='member' AND status='active'").first<User>();
  if (!user || await blocked(user.id)) throw new AccessError(503, 'Guest checkout is temporarily unavailable.');
  return { user, guest: true };
}
