CREATE TABLE `tenants` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `domain` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `country` text DEFAULT 'Pakistan' NOT NULL,
  `currency` text DEFAULT 'PKR' NOT NULL,
  `timezone` text DEFAULT 'Asia/Karachi' NOT NULL,
  `address` text DEFAULT '' NOT NULL,
  `contact_phone` text DEFAULT '' NOT NULL,
  `owner_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);
--> statement-breakpoint
CREATE TABLE `tenant_memberships` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL,
  `user_id` text NOT NULL,
  `role` text DEFAULT 'staff' NOT NULL,
  `permissions` text DEFAULT '[]' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `invitation_label` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_tenant_memberships_user_tenant ON tenant_memberships(user_id, tenant_id);
--> statement-breakpoint
CREATE INDEX idx_tenant_memberships_user ON tenant_memberships(user_id, status);
--> statement-breakpoint
CREATE TABLE `user_tenant_preferences` (
  `user_id` text PRIMARY KEY NOT NULL,
  `primary_tenant_id` text NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `store_applications` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `service_type` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `data` text DEFAULT '{}' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_store_applications_user ON store_applications(user_id, updated_at);
