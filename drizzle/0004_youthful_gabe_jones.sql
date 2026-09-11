ALTER TABLE `organization_reports` ADD `approval_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `organization_reports` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `organization_reports` ADD `approved_by_member_id` integer REFERENCES members(id);--> statement-breakpoint
CREATE INDEX `idx_org_reports_approval` ON `organization_reports` (`approval_status`,`ward_id`);