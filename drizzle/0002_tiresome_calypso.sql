CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text
);
--> statement-breakpoint
CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `worlds` ADD `config` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `worlds` ADD `status` text DEFAULT 'running' NOT NULL;--> statement-breakpoint
ALTER TABLE `worlds` ADD `created` integer DEFAULT 0 NOT NULL;