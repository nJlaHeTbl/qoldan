ALTER TABLE `reports` ADD `review_note` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `reviewed_by` text REFERENCES users(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `reviewed_at` integer;
