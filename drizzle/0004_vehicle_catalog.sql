CREATE TABLE `vehicle_catalogs` (
	`revision` integer PRIMARY KEY NOT NULL,
	`created` integer NOT NULL,
	`payload` text NOT NULL,
	`digest` text NOT NULL
);
