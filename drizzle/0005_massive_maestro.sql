CREATE TABLE `listing_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
