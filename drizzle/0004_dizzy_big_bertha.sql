CREATE TABLE `suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`message` text NOT NULL,
	`status` text DEFAULT 'unread' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "suggestions_status_check" CHECK("suggestions"."status" IN ('unread', 'read'))
);
--> statement-breakpoint
CREATE INDEX `suggestions_created_idx` ON `suggestions` (`created_at`);--> statement-breakpoint
CREATE INDEX `suggestions_status_created_idx` ON `suggestions` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `reviews` ADD `hashtags` text DEFAULT '[]' NOT NULL;