DROP INDEX `saved_searches_owner_filters_unique`;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD `livestock_type` text DEFAULT 'Все виды' NOT NULL;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD `livestock_price_mode` text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD `livestock_quantity_group` text DEFAULT 'all' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `saved_searches_owner_filters_unique` ON `saved_searches` (`owner_id`,`search_query`,`region`,`category`,`offer_type`,`delivery_only`,`company_only`,`livestock_type`,`livestock_price_mode`,`livestock_quantity_group`);