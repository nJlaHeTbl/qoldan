CREATE TABLE `phone_reveals` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`viewer_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`viewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phone_reveals_listing_viewer_unique` ON `phone_reveals` (`listing_id`,`viewer_id`);--> statement-breakpoint
CREATE INDEX `phone_reveals_viewer_created_at_idx` ON `phone_reveals` (`viewer_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `listings` ADD `show_phone` integer DEFAULT true NOT NULL;