CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`date_from` text NOT NULL,
	`date_to` text NOT NULL,
	`customer_phone` text NOT NULL,
	`delivery` integer DEFAULT false NOT NULL,
	`comment` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bookings_listing_id_created_at_idx` ON `bookings` (`listing_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `bookings_owner_id_idx` ON `bookings` (`owner_id`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`owner_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `listing_id`),
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`price` text NOT NULL,
	`unit` text,
	`location` text NOT NULL,
	`region` text NOT NULL,
	`category` text NOT NULL,
	`offer_type` text NOT NULL,
	`image_url` text NOT NULL,
	`phone` text NOT NULL,
	`available` text,
	`description` text,
	`seller_type` text NOT NULL,
	`delivery` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listings_status_created_at_idx` ON `listings` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `listings_region_status_idx` ON `listings` (`region`,`status`);--> statement-breakpoint
CREATE INDEX `listings_owner_id_idx` ON `listings` (`owner_id`);--> statement-breakpoint
CREATE INDEX `listings_category_offer_type_idx` ON `listings` (`category`,`offer_type`);--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`place` text NOT NULL,
	`when_text` text NOT NULL,
	`budget` text NOT NULL,
	`kind` text NOT NULL,
	`region` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`response_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `requests_status_created_at_idx` ON `requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `requests_region_kind_idx` ON `requests` (`region`,`kind`);--> statement-breakpoint
CREATE INDEX `requests_owner_id_idx` ON `requests` (`owner_id`);--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`price` text NOT NULL,
	`message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `responses_request_id_created_at_idx` ON `responses` (`request_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `responses_owner_id_idx` ON `responses` (`owner_id`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`key` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `uploads_owner_id_idx` ON `uploads` (`owner_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
