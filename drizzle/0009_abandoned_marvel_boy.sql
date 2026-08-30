CREATE TABLE `rental_handoffs` (
	`booking_id` text PRIMARY KEY NOT NULL,
	`deposit_amount` integer DEFAULT 0 NOT NULL,
	`deposit_received` integer DEFAULT false NOT NULL,
	`condition_out` text NOT NULL,
	`equipment_list` text,
	`handed_over_at` integer NOT NULL,
	`condition_in` text,
	`deposit_result` text,
	`return_note` text,
	`returned_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
