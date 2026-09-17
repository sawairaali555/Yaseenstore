CREATE TABLE `email_config` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`sender` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invite_emails` (
	`invite_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`provider_id` text,
	`error` text,
	`first_attempt` integer,
	`updated_at` integer NOT NULL
);
