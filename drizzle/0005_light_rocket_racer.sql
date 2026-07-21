DROP INDEX IF EXISTS `reviews_status_visited_idx`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `reviews_status_created_idx` ON `reviews` (`status`,`is_featured`,`created_at`);--> statement-breakpoint
ALTER TABLE `reviews` DROP COLUMN `visited_at`;
