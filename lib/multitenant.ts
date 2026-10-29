import { database } from '@/lib/store-data';
import type { User } from '@/lib/access/policy';
import { AccessError } from '@/lib/access/server';

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'suspended' | string;
  country: string;
  currency: string;
  timezone: string;
  address: string;
  contactPhone: string;
  ownerId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type TenantMembership = {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
  status: string;
  invitationLabel: string;
  createdAt: number;
  updatedAt: number;
};

export type OwnerStore = Tenant & {
  relation: 'owned' | 'invited';
  membershipRole: string;
  membershipStatus: string;
  invitationLabel: string;
  primary: boolean;
};

const now = () => Date.now();
const fallbackTenant = (userId: string): Tenant => ({
  id: 'zeliy-pakistan',
  slug: 'ecomdrop',
  name: 'EcomDrop',
  domain: 'ecomdrop.localhost',
  status: 'active',
  country: 'Pakistan',
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  address: '',
  contactPhone: '',
  ownerId: userId,
  createdAt: now(),
  updatedAt: now(),
});

export async function ensureTenantTables() {
  const db = database();
  if (!db || (db as any).provider === 'supabase') return db;
  await db.prepare(`CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    country TEXT NOT NULL DEFAULT 'Pakistan',
    currency TEXT NOT NULL DEFAULT 'PKR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
    address TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    owner_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS tenant_memberships (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    permissions TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    invitation_label TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS user_tenant_preferences (
    user_id TEXT PRIMARY KEY,
    primary_tenant_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS store_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    data TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_memberships_user_tenant ON tenant_memberships(user_id, tenant_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_memberships(user_id, status)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_store_applications_user ON store_applications(user_id, updated_at)').run();
  return db;
}

function mapTenant(row: any): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    domain: row.domain,
    status: row.status,
    country: row.country,
    currency: row.currency,
    timezone: row.timezone,
    address: row.address,
    contactPhone: row.contact_phone,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function seedDefaultTenant(user: User) {
  const db = await ensureTenantTables();
  const tenant = fallbackTenant(user.id);
  if (!db) return tenant;
  await db.batch([
    db.prepare('INSERT INTO tenants (id, slug, name, domain, status, country, currency, timezone, address, contact_phone, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, domain = excluded.domain, country = excluded.country, currency = excluded.currency, timezone = excluded.timezone, owner_id = COALESCE(tenants.owner_id, excluded.owner_id), updated_at = excluded.updated_at')
      .bind(tenant.id, tenant.slug, tenant.name, tenant.domain, tenant.status, tenant.country, tenant.currency, tenant.timezone, tenant.address, tenant.contactPhone, user.id, tenant.createdAt, tenant.updatedAt),
    db.prepare('INSERT INTO tenant_memberships (id, tenant_id, user_id, role, permissions, status, invitation_label, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, tenant_id) DO NOTHING')
      .bind(`${tenant.id}:${user.id}`, tenant.id, user.id, user.role === 'super_admin' ? 'owner' : 'staff', JSON.stringify(user.role === 'super_admin' ? ['tenant.*'] : ['orders.manage', 'content.edit']), 'active', '', tenant.createdAt, tenant.updatedAt),
    db.prepare('INSERT INTO user_tenant_preferences (user_id, primary_tenant_id, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO NOTHING')
      .bind(user.id, tenant.id, tenant.updatedAt),
  ]);
  return tenant;
}

export async function listOwnerStores(user: User): Promise<OwnerStore[]> {
  const db = await ensureTenantTables();
  const fallback = fallbackTenant(user.id);
  if (!db) return [{ ...fallback, relation: 'owned', membershipRole: 'owner', membershipStatus: 'active', invitationLabel: '', primary: true }];
  await seedDefaultTenant(user);
  const pref = await db.prepare('SELECT primary_tenant_id FROM user_tenant_preferences WHERE user_id = ?').bind(user.id).first<{ primary_tenant_id: string }>();
  const rows = await db.prepare(`
    SELECT t.*, m.role AS membership_role, m.status AS membership_status, m.invitation_label
    FROM tenants t
    JOIN tenant_memberships m ON m.tenant_id = t.id
    WHERE m.user_id = ? AND m.status IN ('active', 'invited')
    ORDER BY CASE WHEN t.id = ? THEN 0 ELSE 1 END, t.name COLLATE NOCASE ASC
  `).bind(user.id, pref?.primary_tenant_id || fallback.id).all<any>();
  return (rows.results || []).map((row) => {
    const tenant = mapTenant(row);
    return {
      ...tenant,
      relation: tenant.ownerId === user.id ? 'owned' : 'invited',
      membershipRole: row.membership_role,
      membershipStatus: row.membership_status,
      invitationLabel: row.invitation_label || '',
      primary: tenant.id === (pref?.primary_tenant_id || fallback.id),
    };
  });
}

export async function setPrimaryTenant(user: User, tenantId: string) {
  const db = await ensureTenantTables();
  if (!db) throw new Error('Tenant database is unavailable.');
  const membership = await db.prepare('SELECT id FROM tenant_memberships WHERE user_id = ? AND tenant_id = ? AND status = ?').bind(user.id, tenantId, 'active').first();
  if (!membership) throw new Error('You do not have active access to that store.');
  await db.prepare('INSERT INTO user_tenant_preferences (user_id, primary_tenant_id, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET primary_tenant_id = excluded.primary_tenant_id, updated_at = excluded.updated_at').bind(user.id, tenantId, now()).run();
}

export async function tenantForRequest(user: User, requestedSlug?: string | null): Promise<Tenant> {
  const db = await ensureTenantTables();
  const fallback = fallbackTenant(user.id);
  if (!db) return fallback;
  await seedDefaultTenant(user);
  const pref = await db.prepare('SELECT primary_tenant_id FROM user_tenant_preferences WHERE user_id = ?').bind(user.id).first<{ primary_tenant_id: string }>();
  const row = requestedSlug
    ? await db.prepare(`SELECT t.* FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id WHERE m.user_id=? AND m.status='active' AND t.slug=? LIMIT 1`).bind(user.id, requestedSlug).first<any>()
    : await db.prepare(`SELECT t.* FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id WHERE m.user_id=? AND m.status='active' AND t.id=? LIMIT 1`).bind(user.id, pref?.primary_tenant_id || fallback.id).first<any>();
  if (row) return mapTenant(row);
  if (requestedSlug) throw new AccessError(403, 'You do not have access to that store.');
  return fallback;
}

export async function createStoreApplication(user: User, serviceType: string) {
  const db = await ensureTenantTables();
  if (!db) throw new Error('Tenant database is unavailable.');
  const id = crypto.randomUUID();
  const timestamp = now();
  await db.prepare('INSERT INTO store_applications (id, user_id, service_type, status, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, serviceType, 'draft', JSON.stringify({ serviceType }), timestamp, timestamp)
    .run();
  return { id, serviceType, status: 'draft' };
}
