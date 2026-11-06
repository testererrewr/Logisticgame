CREATE TABLE `logistics_partner_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated` integer NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `logistics_rule_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `logistics_worlds` ADD `market` text DEFAULT '{}' NOT NULL;