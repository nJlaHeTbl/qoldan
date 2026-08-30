CREATE TABLE `business_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`profile_type` text NOT NULL,
	`organization_name` text NOT NULL,
	`bin` text NOT NULL,
	`phone` text NOT NULL,
	`region` text NOT NULL,
	`reference_url` text,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`reviewed_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_verifications_owner_id_unique` ON `business_verifications` (`owner_id`);--> statement-breakpoint
CREATE INDEX `business_verifications_status_created_at_idx` ON `business_verifications` (`status`,`created_at`);