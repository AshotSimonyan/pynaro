CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`display_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`category_id` text NOT NULL,
	`problem` text NOT NULL,
	`urgency` text NOT NULL,
	`address` text NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`access_notes` text DEFAULT '' NOT NULL,
	`scheduled_for` text,
	`status` text DEFAULT 'requested' NOT NULL,
	`requested_business_id` text,
	`business_id` text,
	`technician_id` text,
	`service_call_fee` integer DEFAULT 0 NOT NULL,
	`estimate_items` text DEFAULT '[]' NOT NULL,
	`estimate_total` integer DEFAULT 0 NOT NULL,
	`pynaro_fee` integer DEFAULT 0 NOT NULL,
	`tip` integer DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'authorized' NOT NULL,
	`card_last_4` text DEFAULT '4242' NOT NULL,
	`rating` integer,
	`review` text,
	`events` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_display_id_unique` ON `jobs` (`display_id`);--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`fee_percent` integer DEFAULT 12 NOT NULL,
	`emergency_response_seconds` integer DEFAULT 120 NOT NULL,
	`immediate_response_seconds` integer DEFAULT 300 NOT NULL,
	`precise_location_after_acceptance` integer DEFAULT true NOT NULL
);
