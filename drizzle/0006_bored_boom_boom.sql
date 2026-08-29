CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`context_type` text NOT NULL,
	`context_id` text NOT NULL,
	`context_title` text NOT NULL,
	`context_owner_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`context_owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_context_participant_unique` ON `conversations` (`context_type`,`context_id`,`participant_id`);--> statement-breakpoint
CREATE INDEX `conversations_owner_updated_at_idx` ON `conversations` (`context_owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `conversations_participant_updated_at_idx` ON `conversations` (`participant_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_created_at_idx` ON `messages` (`conversation_id`,`created_at`);