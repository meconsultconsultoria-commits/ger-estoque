CREATE TABLE `audits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`details` text NOT NULL,
	`user_email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`qty` integer NOT NULL,
	`doc` text NOT NULL,
	`vehicle` text NOT NULL,
	`owner` text NOT NULL,
	`owner_email` text NOT NULL,
	`reason` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scheduled_loads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`qty` integer NOT NULL,
	`doc` text NOT NULL,
	`vehicle` text NOT NULL,
	`status` text DEFAULT 'Programada' NOT NULL,
	`owner` text NOT NULL,
	`created_at` text NOT NULL
);
