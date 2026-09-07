DROP INDEX `responses_owner_id_idx`;--> statement-breakpoint
CREATE INDEX `responses_owner_created_at_idx` ON `responses` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `responses_request_owner_unique` ON `responses` (`request_id`,`owner_id`);--> statement-breakpoint
DROP INDEX `uploads_owner_id_idx`;--> statement-breakpoint
CREATE INDEX `uploads_owner_created_at_idx` ON `uploads` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `listings_image_url_unique` ON `listings` (`image_url`);