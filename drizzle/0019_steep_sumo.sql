CREATE TABLE `settlement_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`settlement_id` text NOT NULL,
	`region_code` text NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`aliases` text NOT NULL,
	`reset` integer DEFAULT 0 NOT NULL,
	`expected_revision` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	`reviewed_by` text,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `settlement_edits_status_idx` ON `settlement_edits` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `settlement_edits_target_idx` ON `settlement_edits` (`settlement_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `settlement_edits_owner_idx` ON `settlement_edits` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `settlement_overrides` (
	`settlement_id` text PRIMARY KEY NOT NULL,
	`region_code` text NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`aliases` text NOT NULL,
	`reset` integer DEFAULT 0 NOT NULL,
	`revision` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `settlement_overrides_region_idx` ON `settlement_overrides` (`region_code`);