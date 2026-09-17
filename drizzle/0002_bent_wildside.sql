CREATE TABLE `access_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`metadata` text NOT NULL,
	`ip` text,
	`device` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_bans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`reason` text NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_guard` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`email` text,
	`role` text NOT NULL,
	`invited_by` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`max_uses` integer NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_invites_code_hash_unique` ON `access_invites` (`code_hash`);--> statement-breakpoint
CREATE TABLE `access_mfa` (
	`user_id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`last_counter` integer DEFAULT -1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_rate` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rank` integer NOT NULL,
	`permissions` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`version` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_sessions_token_hash_unique` ON `access_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `access_users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_id` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen` integer,
	`deleted_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`session_version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_users_auth_id_unique` ON `access_users` (`auth_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `access_users_email_unique` ON `access_users` (`email`);--> statement-breakpoint
CREATE INDEX idx_access_users_created ON access_users(created_at DESC);
--> statement-breakpoint
CREATE INDEX idx_access_users_role_status ON access_users(role,status);
--> statement-breakpoint
CREATE INDEX idx_access_users_activity ON access_users(last_seen DESC);
--> statement-breakpoint
CREATE INDEX idx_access_bans_user_kind ON access_bans(user_id,kind,revoked_at,expires_at);
--> statement-breakpoint
CREATE INDEX idx_access_bans_created ON access_bans(created_at DESC);
--> statement-breakpoint
CREATE INDEX idx_access_invites_actor_created ON access_invites(invited_by,created_at DESC);
--> statement-breakpoint
CREATE INDEX idx_access_audit_created ON access_audit(created_at DESC,id);
--> statement-breakpoint
CREATE INDEX idx_access_audit_action_created ON access_audit(action,created_at DESC);
--> statement-breakpoint
CREATE INDEX idx_access_notices_user_created ON access_notices(user_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX idx_access_sessions_user ON access_sessions(user_id);
--> statement-breakpoint
CREATE TRIGGER access_guard_validate BEFORE INSERT ON access_guard WHEN NEW.ok <> 1 BEGIN SELECT RAISE(ABORT,'Authorization changed. Refresh and try again.'); END;
--> statement-breakpoint
CREATE TRIGGER access_audit_no_update BEFORE UPDATE ON access_audit BEGIN SELECT RAISE(ABORT,'Audit records are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER access_audit_no_delete BEFORE DELETE ON access_audit BEGIN SELECT RAISE(ABORT,'Audit records are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER access_owner_no_delete BEFORE DELETE ON access_users WHEN OLD.id='owner' BEGIN SELECT RAISE(ABORT,'Owner cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER access_owner_protect BEFORE UPDATE ON access_users WHEN OLD.id='owner' AND (NEW.role<>'super_admin' OR NEW.status<>'active' OR NEW.email<>OLD.email OR NEW.auth_id<>OLD.auth_id) BEGIN SELECT RAISE(ABORT,'Owner identity and access are protected'); END;
