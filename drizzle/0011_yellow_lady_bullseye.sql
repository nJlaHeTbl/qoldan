CREATE TABLE `request_selections` (
	`request_id` text PRIMARY KEY NOT NULL,
	`response_id` text NOT NULL,
	`selected_by` text NOT NULL,
	`status` text DEFAULT 'selected' NOT NULL,
	`selected_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`selected_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `request_selections_response_id_unique` ON `request_selections` (`response_id`);