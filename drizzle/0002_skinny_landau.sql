CREATE TABLE `cuisine_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cuisine_categories_name_unique` ON `cuisine_categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `cuisine_categories_name_key_unique` ON `cuisine_categories` (`name_key`);--> statement-breakpoint
CREATE INDEX `cuisine_categories_name_idx` ON `cuisine_categories` (`name`);--> statement-breakpoint
INSERT INTO `cuisine_categories` (`id`, `name`, `name_key`)
SELECT
	'legacy-' || lower(hex(`name_key`)),
	`name`,
	`name_key`
FROM (
	SELECT
		MIN(CASE WHEN trim(`cuisine`) = '' THEN 'Chưa phân loại' ELSE trim(`cuisine`) END) AS `name`,
		lower(CASE WHEN trim(`cuisine`) = '' THEN 'Chưa phân loại' ELSE trim(`cuisine`) END) AS `name_key`
	FROM `restaurants`
	GROUP BY lower(CASE WHEN trim(`cuisine`) = '' THEN 'Chưa phân loại' ELSE trim(`cuisine`) END) COLLATE NOCASE
);--> statement-breakpoint
ALTER TABLE `restaurants` ADD `category_id` text REFERENCES cuisine_categories(id) ON DELETE RESTRICT;--> statement-breakpoint
UPDATE `restaurants`
SET `category_id` = (
	SELECT `id`
	FROM `cuisine_categories`
	WHERE `name_key` = lower(CASE
		WHEN trim(`restaurants`.`cuisine`) = '' THEN 'Chưa phân loại'
		ELSE trim(`restaurants`.`cuisine`)
	END) COLLATE NOCASE
	LIMIT 1
);--> statement-breakpoint
CREATE INDEX `restaurants_category_idx` ON `restaurants` (`category_id`);--> statement-breakpoint
CREATE TRIGGER `restaurants_category_required_insert`
BEFORE INSERT ON `restaurants`
WHEN NEW.`category_id` IS NULL OR trim(NEW.`category_id`) = ''
BEGIN
	SELECT RAISE(ABORT, 'restaurants.category_id is required');
END;--> statement-breakpoint
CREATE TRIGGER `restaurants_category_required_update`
BEFORE UPDATE ON `restaurants`
WHEN NEW.`category_id` IS NULL OR trim(NEW.`category_id`) = ''
BEGIN
	SELECT RAISE(ABORT, 'restaurants.category_id is required');
END;
