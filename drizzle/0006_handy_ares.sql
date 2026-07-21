CREATE TABLE IF NOT EXISTS `suggestion_rate_limits` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`window_started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`daily_window_started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`daily_request_count` integer DEFAULT 1 NOT NULL,
	`last_message_hash` text NOT NULL,
	`last_message_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`duplicate_attempt` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
