CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`object_key` text NOT NULL,
	`alt_text` text DEFAULT '' NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `photos_object_key_unique` ON `photos` (`object_key`);--> statement-breakpoint
CREATE INDEX `photos_review_sort_idx` ON `photos` (`review_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`area` text NOT NULL,
	`address` text NOT NULL,
	`cuisine` text NOT NULL,
	`price_label` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurants_slug_unique` ON `restaurants` (`slug`);--> statement-breakpoint
CREATE INDEX `restaurants_area_idx` ON `restaurants` (`area`);--> statement-breakpoint
CREATE INDEX `restaurants_cuisine_idx` ON `restaurants` (`cuisine`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`dish` text NOT NULL,
	`rating` real NOT NULL,
	`excerpt` text NOT NULL,
	`content` text NOT NULL,
	`visited_at` text NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_restaurant_idx` ON `reviews` (`restaurant_id`);--> statement-breakpoint
CREATE INDEX `reviews_status_visited_idx` ON `reviews` (`status`,`visited_at`);