CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`subject` text,
	`body` text NOT NULL,
	`consent_at` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_created_idx` ON `messages` (`created_at`);