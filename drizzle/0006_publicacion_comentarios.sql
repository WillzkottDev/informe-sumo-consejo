CREATE TABLE IF NOT EXISTS `council_comment_publications` (
	`report_id` integer NOT NULL,
	`field` text NOT NULL,
	`approved_text` text NOT NULL,
	`approved_at` text NOT NULL,
	`approved_by` integer NOT NULL,
	PRIMARY KEY(`report_id`, `field`),
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
