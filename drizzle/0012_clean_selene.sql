CREATE TABLE `logistics_container_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`day` integer NOT NULL,
	`source_id` text NOT NULL,
	`destination_id` text NOT NULL,
	`slot` integer NOT NULL,
	`quantity` real NOT NULL,
	`fee` real NOT NULL,
	`deadline` real NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`accepted_by` text
);
--> statement-breakpoint
CREATE INDEX `container_world_day` ON `logistics_container_offers` (`world_id`,`day`,`source_id`);