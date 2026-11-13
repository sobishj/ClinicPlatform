CREATE TABLE `media_chunks` (
	`key` text NOT NULL,
	`idx` integer NOT NULL,
	`mime` text NOT NULL,
	`data` blob NOT NULL,
	PRIMARY KEY(`key`, `idx`)
);
