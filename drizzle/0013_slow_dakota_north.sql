CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`search_query` text DEFAULT '' NOT NULL,
	`region` text DEFAULT 'Весь Казахстан' NOT NULL,
	`category` text DEFAULT 'Все категории' NOT NULL,
	`offer_type` text DEFAULT 'Все' NOT NULL,
	`delivery_only` integer DEFAULT false NOT NULL,
	`company_only` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`last_viewed_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_searches_owner_filters_unique` ON `saved_searches` (`owner_id`,`search_query`,`region`,`category`,`offer_type`,`delivery_only`,`company_only`);--> statement-breakpoint
CREATE INDEX `saved_searches_owner_created_at_idx` ON `saved_searches` (`owner_id`,`created_at`);