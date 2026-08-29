CREATE TABLE `moderation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text,
	`moderator_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_owner_id` text NOT NULL,
	`target_title` text NOT NULL,
	`action` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`moderator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `moderation_actions_created_at_idx` ON `moderation_actions` (`created_at`);--> statement-breakpoint
CREATE INDEX `moderation_actions_target_owner_created_at_idx` ON `moderation_actions` (`target_owner_id`,`created_at`);