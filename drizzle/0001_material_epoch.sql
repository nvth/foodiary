CREATE TABLE `review_dishes` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`name` text NOT NULL,
	`photo_sort_order` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_dishes_review_sort_idx` ON `review_dishes` (`review_id`,`sort_order`);