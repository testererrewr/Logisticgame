ALTER TABLE `logistics_container_offers` ADD `source_country` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `logistics_container_offers` ADD `destination_country` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `logistics_container_offers` ADD `source_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `logistics_container_offers` ADD `destination_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `logistics_container_offers` ADD `distance_km` real DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `container_world_distance` ON `logistics_container_offers` (`world_id`,`day`,`status`,`distance_km`);--> statement-breakpoint
CREATE INDEX `container_world_places` ON `logistics_container_offers` (`world_id`,`day`,`source_country`,`destination_country`);