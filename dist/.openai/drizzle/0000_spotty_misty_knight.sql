CREATE TABLE `member_wards` (
	`member_id` integer NOT NULL,
	`ward_id` integer NOT NULL,
	PRIMARY KEY(`member_id`, `ward_id`),
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ward_id`) REFERENCES `wards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_member_wards_ward_id` ON `member_wards` (`ward_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`auth_user_id` text,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'leader' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_email` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_auth_user_id` ON `members` (`auth_user_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ward_id` integer NOT NULL,
	`week_start` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sacramental_observation` text DEFAULT '' NOT NULL,
	`punctuality_state` text DEFAULT '' NOT NULL,
	`punctuality_note` text DEFAULT '' NOT NULL,
	`ward_council_observation` text DEFAULT '' NOT NULL,
	`followup_state` text DEFAULT '' NOT NULL,
	`followup_note` text DEFAULT '' NOT NULL,
	`missionary_observation` text DEFAULT '' NOT NULL,
	`other_observation` text DEFAULT '' NOT NULL,
	`schedule_state` text DEFAULT '' NOT NULL,
	`schedule_note` text DEFAULT '' NOT NULL,
	`reporter_member_id` integer,
	`reporter_name` text DEFAULT '' NOT NULL,
	`submitted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`ward_id`) REFERENCES `wards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_ward_week` ON `reports` (`ward_id`,`week_start`);--> statement-breakpoint
CREATE INDEX `idx_reports_week_status` ON `reports` (`week_start`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reports_reporter` ON `reports` (`reporter_member_id`);--> statement-breakpoint
CREATE TABLE `wards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_wards_name` ON `wards` (`name`);