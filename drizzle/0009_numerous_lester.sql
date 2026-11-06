CREATE TABLE `logistics_loaded_areas` (
	`id` text PRIMARY KEY NOT NULL,
	`loaded` integer NOT NULL,
	`source` text NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `logistics_partner_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`payload` text NOT NULL,
	`loaded` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `logistics_partner_area` ON `logistics_partner_registry` (`lat`,`lon`);--> statement-breakpoint
CREATE TABLE `logistics_runtime` (
	`id` text PRIMARY KEY NOT NULL,
	`updated` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `logistics_world_companies` ADD `name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `logistics_worlds` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `logistics_worlds` ADD `status` text DEFAULT 'running' NOT NULL;--> statement-breakpoint
ALTER TABLE `logistics_worlds` ADD `time_scale` real DEFAULT 1 NOT NULL;