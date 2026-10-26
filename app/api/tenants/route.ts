import { actor, audit, body, fail, reply } from '@/lib/access/server';
import { createStoreApplication, listOwnerStores, setPrimaryTenant } from '@/lib/multitenant';
import { z } from 'zod';

const primarySchema = z.object({ action: z.literal('primary'), tenantId: z.string().min(1).max(120) });
const applicationSchema = z.object({
  action: z.literal('apply'),
  serviceType: z.enum(['sell-with-store', 'connect-store', 'deliver-for-ecomplug', 'buy-from-ecomplug', 'supply-to-ecomplug']),
});

export async function GET() {
  try {
    const user = await actor();
    return reply({ stores: await listOwnerStores(user) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await actor();
    const payload = await body(req, 10000);
    if (payload?.action === 'primary') {
      const input = primarySchema.parse(payload);
      await setPrimaryTenant(user, input.tenantId);
      const auditStatement = await audit(user, 'tenant.primary_changed', input.tenantId, 'Changed primary store', { tenantId: input.tenantId });
      await auditStatement.run();
      return reply({ ok: true });
    }
    const input = applicationSchema.parse(payload);
    const application = await createStoreApplication(user, input.serviceType);
    const auditStatement = await audit(user, 'tenant.application_started', application.id, 'Started store service application', { serviceType: input.serviceType });
    await auditStatement.run();
    return reply({ application });
  } catch (error) {
    return fail(error);
  }
}
