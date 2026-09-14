CREATE TABLE `housing_details` (
	`listing_id` text PRIMARY KEY NOT NULL,
	`guests` integer NOT NULL,
	`rooms` integer NOT NULL,
	`search_text` text NOT NULL,
	`location_search` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
