CREATE TABLE `logistics_world_companies` (
	`world_id` text NOT NULL,
	`user_id` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_action` text,
	`updated` integer NOT NULL,
	PRIMARY KEY(`world_id`, `user_id`),
	FOREIGN KEY (`world_id`) REFERENCES `logistics_worlds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `logistics_world_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`valid` integer NOT NULL,
	CONSTRAINT "world_guard_valid" CHECK("logistics_world_guards"."valid"=1)
);
--> statement-breakpoint
CREATE TABLE `logistics_world_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`receiver_id` text NOT NULL,
	`site_id` text NOT NULL,
	`good` text NOT NULL,
	`quantity` real NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`settled` integer,
	FOREIGN KEY (`world_id`) REFERENCES `logistics_worlds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "world_offer_quantity" CHECK("logistics_world_offers"."quantity">0 AND "logistics_world_offers"."quantity"<=10000),
	CONSTRAINT "world_offer_price" CHECK("logistics_world_offers"."price">=0 AND "logistics_world_offers"."price"<=2000000000),
	CONSTRAINT "world_offer_parties" CHECK("logistics_world_offers"."sender_id"<>"logistics_world_offers"."receiver_id"),
	CONSTRAINT "world_offer_status" CHECK("logistics_world_offers"."status" IN ('open','accepted','rejected','withdrawn'))
);
--> statement-breakpoint
CREATE INDEX `world_offers_receiver` ON `logistics_world_offers` (`world_id`,`receiver_id`,`status`);--> statement-breakpoint
CREATE TABLE `logistics_world_permissions` (
	`world_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`grantee_id` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`world_id`, `owner_id`, `grantee_id`),
	FOREIGN KEY (`world_id`) REFERENCES `logistics_worlds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`grantee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "world_permission_enabled" CHECK("logistics_world_permissions"."enabled" IN (0,1)),
	CONSTRAINT "world_permission_parties" CHECK("logistics_world_permissions"."owner_id"<>"logistics_world_permissions"."grantee_id")
);
--> statement-breakpoint
CREATE TABLE `logistics_worlds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`day` integer DEFAULT 1 NOT NULL,
	`last_tick` integer NOT NULL,
	`tick_ms` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
