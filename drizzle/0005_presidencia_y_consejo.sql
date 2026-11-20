CREATE TABLE IF NOT EXISTS `council_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_type` text NOT NULL,
	`source_id` integer NOT NULL,
	`source_field` text NOT NULL,
	`scope` text NOT NULL,
	`author_name` text NOT NULL,
	`ward_name` text NOT NULL,
	`source_label` text NOT NULL,
	`month_start` text NOT NULL,
	`excerpt` text NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_council_note_excerpt` ON `council_notes` (`source_type`,`source_id`,`source_field`,`excerpt`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_council_note_month` ON `council_notes` (`month_start`,`id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `presidency_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_id` integer NOT NULL,
	`request_key` text NOT NULL,
	`author_name` text NOT NULL,
	`scope` text NOT NULL,
	`month_start` text NOT NULL,
	`topic` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_presidency_sender_request` ON `presidency_messages` (`author_id`,`request_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_presidency_month` ON `presidency_messages` (`month_start`,`id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_presidency_sender_month` ON `presidency_messages` (`author_id`,`month_start`);