CREATE TABLE `appeals` (
	`id` text PRIMARY KEY NOT NULL,
	`moderation_action_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`resolution_note` text,
	`reviewed_by` text,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	FOREIGN KEY (`moderation_action_id`) REFERENCES `moderation_actions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appeals_moderation_action_id_unique` ON `appeals` (`moderation_action_id`);--> statement-breakpoint
CREATE INDEX `appeals_owner_id_created_at_idx` ON `appeals` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `appeals_status_created_at_idx` ON `appeals` (`status`,`created_at`);