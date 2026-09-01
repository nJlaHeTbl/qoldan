CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`page_context` text,
	`status` text DEFAULT 'new' NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`reviewed_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `support_tickets_owner_created_at_idx` ON `support_tickets` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_tickets_status_created_at_idx` ON `support_tickets` (`status`,`created_at`);