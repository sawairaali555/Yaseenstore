-- Separate from the existing public.products table and the Data API.
CREATE SCHEMA yaseenstore;
REVOKE ALL ON SCHEMA yaseenstore FROM PUBLIC, anon, authenticated;
CREATE TABLE yaseenstore."orders" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"details" text NOT NULL,
	"items" text NOT NULL,
	"total" BIGINT NOT NULL,
	"status" text DEFAULT 'Test order received' NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE yaseenstore."catalog_records" (
	"id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL
);

CREATE TABLE yaseenstore."store_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL
);

CREATE TABLE yaseenstore."access_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"metadata" text NOT NULL,
	"ip" text,
	"device" text,
	"created_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."access_bans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"kind" text NOT NULL,
	"reason" text NOT NULL,
	"expires_at" BIGINT,
	"revoked_at" BIGINT,
	"created_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."access_guard" (
	"id" text PRIMARY KEY NOT NULL,
	"ok" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."access_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"email" text,
	"role" text NOT NULL,
	"invited_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" BIGINT NOT NULL,
	"max_uses" BIGINT NOT NULL,
	"uses" BIGINT DEFAULT 0 NOT NULL,
	"created_at" BIGINT NOT NULL
);

CREATE UNIQUE INDEX "access_invites_code_hash_unique" ON yaseenstore."access_invites" ("code_hash");
CREATE TABLE yaseenstore."access_mfa" (
	"user_id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"enabled" BIGINT DEFAULT 0 NOT NULL,
	"last_counter" BIGINT DEFAULT -1 NOT NULL,
	"created_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."access_notices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"read_at" BIGINT,
	"created_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."access_rate" (
	"key" text PRIMARY KEY NOT NULL,
	"count" BIGINT NOT NULL,
	"expires_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."access_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rank" BIGINT NOT NULL,
	"permissions" text NOT NULL
);

CREATE TABLE yaseenstore."access_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"version" BIGINT NOT NULL,
	"expires_at" BIGINT NOT NULL
);

CREATE UNIQUE INDEX "access_sessions_token_hash_unique" ON yaseenstore."access_sessions" ("token_hash");
CREATE TABLE yaseenstore."access_users" (
	"id" text PRIMARY KEY NOT NULL,
	"auth_id" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" BIGINT NOT NULL,
	"last_seen" BIGINT,
	"deleted_at" BIGINT,
	"version" BIGINT DEFAULT 1 NOT NULL,
	"session_version" BIGINT DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX "access_users_auth_id_unique" ON yaseenstore."access_users" ("auth_id");
CREATE UNIQUE INDEX "access_users_email_unique" ON yaseenstore."access_users" ("email");
CREATE INDEX idx_access_users_created ON yaseenstore.access_users(created_at DESC);

CREATE INDEX idx_access_users_role_status ON yaseenstore.access_users(role,status);

CREATE INDEX idx_access_users_activity ON yaseenstore.access_users(last_seen DESC);

CREATE INDEX idx_access_bans_user_kind ON yaseenstore.access_bans(user_id,kind,revoked_at,expires_at);

CREATE INDEX idx_access_bans_created ON yaseenstore.access_bans(created_at DESC);

CREATE INDEX idx_access_invites_actor_created ON yaseenstore.access_invites(invited_by,created_at DESC);

CREATE INDEX idx_access_audit_created ON yaseenstore.access_audit(created_at DESC,id);

CREATE INDEX idx_access_audit_action_created ON yaseenstore.access_audit(action,created_at DESC);

CREATE INDEX idx_access_notices_user_created ON yaseenstore.access_notices(user_id,created_at DESC);

CREATE INDEX idx_access_sessions_user ON yaseenstore.access_sessions(user_id);











CREATE TABLE yaseenstore."email_config" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"sender" text NOT NULL
);

CREATE TABLE yaseenstore."invite_emails" (
	"invite_id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"provider_id" text,
	"error" text,
	"first_attempt" BIGINT,
	"updated_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."access_passwords" (
	"user_id" text PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"updated_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"version" BIGINT NOT NULL,
	"expires_at" BIGINT NOT NULL
);

CREATE UNIQUE INDEX "password_resets_token_hash_unique" ON yaseenstore."password_resets" ("token_hash");
ALTER TABLE yaseenstore."access_sessions" ADD "source" text DEFAULT 'platform' NOT NULL;
CREATE TABLE yaseenstore."listing_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."tenants" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "country" text DEFAULT 'Pakistan' NOT NULL,
  "currency" text DEFAULT 'PKR' NOT NULL,
  "timezone" text DEFAULT 'Asia/Karachi' NOT NULL,
  "address" text DEFAULT '' NOT NULL,
  "contact_phone" text DEFAULT '' NOT NULL,
  "owner_id" text,
  "created_at" BIGINT NOT NULL,
  "updated_at" BIGINT NOT NULL
);

CREATE UNIQUE INDEX "tenants_slug_unique" ON yaseenstore."tenants" ("slug");

CREATE TABLE yaseenstore."tenant_memberships" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text DEFAULT 'staff' NOT NULL,
  "permissions" text DEFAULT '[]' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "invitation_label" text DEFAULT '' NOT NULL,
  "created_at" BIGINT NOT NULL,
  "updated_at" BIGINT NOT NULL
);

CREATE UNIQUE INDEX idx_tenant_memberships_user_tenant ON yaseenstore.tenant_memberships(user_id, tenant_id);

CREATE INDEX idx_tenant_memberships_user ON yaseenstore.tenant_memberships(user_id, status);

CREATE TABLE yaseenstore."user_tenant_preferences" (
  "user_id" text PRIMARY KEY NOT NULL,
  "primary_tenant_id" text NOT NULL,
  "updated_at" BIGINT NOT NULL
);

CREATE TABLE yaseenstore."store_applications" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "service_type" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "data" text DEFAULT '{}' NOT NULL,
  "created_at" BIGINT NOT NULL,
  "updated_at" BIGINT NOT NULL
);

CREATE INDEX idx_store_applications_user ON yaseenstore.store_applications(user_id, updated_at);

CREATE TABLE yaseenstore.category_nodes (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      image TEXT DEFAULT '',
      enabled BIGINT NOT NULL DEFAULT 1,
      auto_disabled BIGINT NOT NULL DEFAULT 0,
      display_order BIGINT NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      meta_title TEXT NOT NULL DEFAULT '',
      meta_keywords TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      depth BIGINT NOT NULL DEFAULT 0
    );
CREATE TABLE yaseenstore.inventory_logs (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      sku TEXT,
      previous_stock BIGINT NOT NULL,
      change BIGINT NOT NULL,
      new_stock BIGINT NOT NULL,
      reason TEXT NOT NULL,
      order_id TEXT,
      actor_id TEXT,
      actor_name TEXT,
      created_at TEXT NOT NULL
    );
CREATE TABLE yaseenstore.return_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_alt_phone TEXT,
      customer_address TEXT,
      customer_city TEXT,
      order_date TEXT,
      delivery_date TEXT,
      requested_date TEXT,
      return_status TEXT NOT NULL,
      refund_status TEXT NOT NULL,
      inspection_status TEXT NOT NULL,
      inventory_action TEXT NOT NULL,
      items TEXT NOT NULL,
      total_refundable_amount BIGINT NOT NULL,
      approved_refund_amount BIGINT NOT NULL DEFAULT 0,
      return_reason TEXT NOT NULL,
      customer_comments TEXT,
      evidence_images TEXT,
      rejection_reason TEXT,
      internal_notes TEXT,
      refund_method TEXT,
      refund_account_title TEXT,
      refund_account_number TEXT,
      refund_bank_name TEXT,
      refund_reference TEXT,
      refunded_at TEXT,
      refunded_by TEXT,
      courier TEXT,
      tracking_number TEXT,
      timeline TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
CREATE INDEX IF NOT EXISTS idx_category_nodes_parent ON yaseenstore.category_nodes(parent_id, display_order, name);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON yaseenstore.inventory_logs(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_order ON yaseenstore.inventory_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON yaseenstore.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON yaseenstore.return_requests(return_status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_memberships_user_tenant ON yaseenstore.tenant_memberships(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON yaseenstore.tenant_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_store_applications_user ON yaseenstore.store_applications(user_id, updated_at);
CREATE TABLE yaseenstore.customer_profiles (
    tenant_id TEXT NOT NULL,
    customer_key TEXT NOT NULL,
    manual_trusted BIGINT NOT NULL DEFAULT 0,
    manual_reason TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    updated_by TEXT,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (tenant_id, customer_key)
  );
CREATE INDEX IF NOT EXISTS idx_customer_profiles_tenant ON yaseenstore.customer_profiles(tenant_id, updated_at);

ALTER TABLE yaseenstore.category_nodes ADD COLUMN deleted BIGINT NOT NULL DEFAULT 0;
CREATE TABLE yaseenstore.media_records (id TEXT PRIMARY KEY, content_type TEXT NOT NULL, body BYTEA NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE yaseenstore.backend_state (id TEXT PRIMARY KEY, initialized_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE yaseenstore.access_guard ADD CONSTRAINT access_guard_ok CHECK (ok=1);

CREATE FUNCTION yaseenstore.protect_audit() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable';
END;
$$;
CREATE TRIGGER access_audit_immutable BEFORE UPDATE OR DELETE ON yaseenstore.access_audit FOR EACH ROW EXECUTE FUNCTION yaseenstore.protect_audit();

CREATE FUNCTION yaseenstore.protect_owner() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.id='owner' THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Owner cannot be deleted'; END IF;
    IF NEW.role<>'super_admin' OR NEW.status<>'active' OR NEW.email IS DISTINCT FROM OLD.email OR NEW.auth_id IS DISTINCT FROM OLD.auth_id THEN
      RAISE EXCEPTION 'Owner identity and access are protected';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER access_owner_protect BEFORE UPDATE OR DELETE ON yaseenstore.access_users FOR EACH ROW EXECUTE FUNCTION yaseenstore.protect_owner();

CREATE INDEX idx_orders_tenant_created ON yaseenstore.orders ((details::jsonb ->> 'tenantId'),created_at DESC);
CREATE UNIQUE INDEX idx_orders_checkout_request ON yaseenstore.orders ((details::jsonb ->> 'tenantId'),(details::jsonb ->> 'checkoutRequestId')) WHERE (details::jsonb ->> 'checkoutRequestId') IS NOT NULL;
CREATE INDEX idx_catalog_status ON yaseenstore.catalog_records(status);
CREATE INDEX idx_sessions_expiry ON yaseenstore.access_sessions(expires_at);
CREATE INDEX idx_resets_expiry ON yaseenstore.password_resets(expires_at);

-- Defense in depth: these server-only tables have no public policies.
ALTER TABLE yaseenstore."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."catalog_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."store_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_bans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_guard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_mfa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_rate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."email_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."invite_emails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."access_passwords" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."password_resets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."listing_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."tenant_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."user_tenant_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."store_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."category_nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."inventory_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."return_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."customer_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."media_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaseenstore."backend_state" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA yaseenstore FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA yaseenstore FROM PUBLIC, anon, authenticated;

-- Images are served through /api/media; callers cannot write to Storage directly.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('yaseenstore-media','yaseenstore-media',false,3145728,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO NOTHING;
