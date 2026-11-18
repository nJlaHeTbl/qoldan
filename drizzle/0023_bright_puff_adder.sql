CREATE TABLE `auctions` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`start_price` integer NOT NULL,
	`min_step` integer NOT NULL,
	`reserve_price` integer,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`base_ends_at` integer NOT NULL,
	`extensions` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_bid` integer,
	`bid_count` integer DEFAULT 0 NOT NULL,
	`leader_id` text,
	`result` text,
	`winner_id` text,
	`settled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auctions_listing_id_unique` ON `auctions` (`listing_id`);--> statement-breakpoint
CREATE INDEX `auctions_status_ends_at_idx` ON `auctions` (`status`,`ends_at`);--> statement-breakpoint
CREATE INDEX `auctions_seller_id_idx` ON `auctions` (`seller_id`);--> statement-breakpoint
CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`auction_id` text NOT NULL,
	`bidder_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bidder_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bids_auction_amount_unique` ON `bids` (`auction_id`,`amount`);--> statement-breakpoint
CREATE INDEX `bids_auction_created_at_idx` ON `bids` (`auction_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `bids_bidder_created_at_idx` ON `bids` (`bidder_id`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `bids_immutable` BEFORE UPDATE ON `bids` BEGIN SELECT RAISE(ABORT, 'bids are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `auctions_terms_locked` BEFORE UPDATE ON `auctions` WHEN OLD.bid_count > 0 AND (NEW.start_price != OLD.start_price OR NEW.min_step != OLD.min_step OR NEW.reserve_price IS NOT OLD.reserve_price OR NEW.starts_at != OLD.starts_at OR NEW.base_ends_at != OLD.base_ends_at OR NEW.seller_id != OLD.seller_id OR NEW.listing_id != OLD.listing_id) BEGIN SELECT RAISE(ABORT, 'auction terms are locked after the first bid'); END;
--> statement-breakpoint
CREATE TRIGGER `auctions_end_never_shortened` BEFORE UPDATE ON `auctions` WHEN NEW.ends_at < OLD.ends_at AND OLD.status = 'active' BEGIN SELECT RAISE(ABORT, 'auction end time cannot be shortened'); END;
--> statement-breakpoint
CREATE TRIGGER `auctions_result_final` BEFORE UPDATE ON `auctions` WHEN OLD.status IN ('ended', 'cancelled') AND (NEW.status != OLD.status OR NEW.current_bid IS NOT OLD.current_bid OR (NEW.winner_id IS NOT OLD.winner_id AND NEW.winner_id IS NOT NULL) OR NEW.result IS NOT OLD.result) BEGIN SELECT RAISE(ABORT, 'a finished auction cannot be changed'); END;