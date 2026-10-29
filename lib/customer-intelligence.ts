import { database } from '@/lib/store-data';

export type CustomerProfileRecord = {
  tenant_id: string;
  customer_key: string;
  manual_trusted: number;
  manual_reason: string;
  notes: string;
  updated_by: string | null;
  updated_at: number;
};

export async function ensureCustomerIntelligenceTables() {
  const db = database();
  if (!db || (db as any).provider === 'supabase') return db;
  await db.prepare(`CREATE TABLE IF NOT EXISTS customer_profiles (
    tenant_id TEXT NOT NULL,
    customer_key TEXT NOT NULL,
    manual_trusted INTEGER NOT NULL DEFAULT 0,
    manual_reason TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    updated_by TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, customer_key)
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_profiles_tenant ON customer_profiles(tenant_id, updated_at)').run();
  return db;
}

export async function customerProfiles(tenantId: string) {
  const db = await ensureCustomerIntelligenceTables();
  if (!db) return [] as CustomerProfileRecord[];
  const rows = await db.prepare('SELECT tenant_id, customer_key, manual_trusted, manual_reason, notes, updated_by, updated_at FROM customer_profiles WHERE tenant_id=?').bind(tenantId).all<CustomerProfileRecord>();
  return rows.results || [];
}
