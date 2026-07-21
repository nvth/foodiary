CREATE TABLE `blog_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`about_title` text NOT NULL,
	`about_body` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `blog_settings` (`id`, `about_title`, `about_body`)
VALUES (
	'main',
	'Mỗi tuần một câu chuyện ngon.',
	'Một email nhỏ về quán mới, món ngon và những góc phố mình vừa đi qua.'
);
