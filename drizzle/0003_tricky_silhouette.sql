CREATE TABLE `organization_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ward_id` integer NOT NULL,
	`month_start` text NOT NULL,
	`organization` text NOT NULL,
	`observation` text DEFAULT '' NOT NULL,
	`reporter_member_id` integer,
	`reporter_name` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`ward_id`) REFERENCES `wards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_org_reports_ward_month_org` ON `organization_reports` (`ward_id`,`month_start`,`organization`);--> statement-breakpoint
CREATE INDEX `idx_org_reports_month` ON `organization_reports` (`month_start`);--> statement-breakpoint
ALTER TABLE `members` ADD `report_scope` text DEFAULT 'high_council' NOT NULL;