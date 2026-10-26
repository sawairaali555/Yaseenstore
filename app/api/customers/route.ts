import { actor, actorGuard, audit, body, fail, origin, sql } from '@/lib/access/server';
import { tenantForRequest } from '@/lib/multitenant';
import { customerProfiles, ensureCustomerIntelligenceTables } from '@/lib/customer-intelligence';
import { z } from 'zod';

const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request) {
  try {
    const user = await actor('orders.manage');
    const tenant = await tenantForRequest(user, new URL(req.url).searchParams.get('tenant'));
    return reply({ tenantId: tenant.id, profiles: await customerProfiles(tenant.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    origin(req);
    const user = await actor('orders.manage');
    const tenant = await tenantForRequest(user, new URL(req.url).searchParams.get('tenant'));
    const input = z.object({
      action: z.enum(['trust', 'notes']),
      customerKey: z.string().trim().min(1).max(240),
      trusted: z.boolean().optional(),
      reason: z.string().max(500).optional(),
      notes: z.string().max(3000).optional(),
    }).parse(await body(req, 10000));
    const db = await ensureCustomerIntelligenceTables();
    if (!db) return reply({ error: 'Customer intelligence storage is unavailable.' }, 503);
    const previous = await db.prepare('SELECT manual_trusted, manual_reason, notes FROM customer_profiles WHERE tenant_id=? AND customer_key=?').bind(tenant.id, input.customerKey).first<{manual_trusted:number;manual_reason:string;notes:string}>();
    const trusted = input.action === 'trust' ? (input.trusted ? 1 : 0) : (previous?.manual_trusted || 0);
    const reason = input.action === 'trust' ? (input.reason || '') : (previous?.manual_reason || '');
    const notes = input.action === 'notes' ? (input.notes || '') : (previous?.notes || '');
    const now = Date.now();
    await db.batch([
      ...actorGuard(user),
      sql('INSERT INTO customer_profiles (tenant_id,customer_key,manual_trusted,manual_reason,notes,updated_by,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(tenant_id,customer_key) DO UPDATE SET manual_trusted=excluded.manual_trusted,manual_reason=excluded.manual_reason,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=excluded.updated_at', tenant.id, input.customerKey, trusted, reason, notes, user.id, now),
      await audit(user, input.action === 'trust' ? 'customer.trust_updated' : 'customer.notes_updated', input.customerKey, input.action === 'trust' ? (trusted ? 'Marked customer as trusted' : 'Removed manual trusted status') : 'Updated customer notes', { tenantId: tenant.id, reason }),
    ]);
    return reply({ ok: true, profile: { tenant_id: tenant.id, customer_key: input.customerKey, manual_trusted: trusted, manual_reason: reason, notes, updated_by: user.id, updated_at: now } });
  } catch (error) {
    return fail(error);
  }
}
