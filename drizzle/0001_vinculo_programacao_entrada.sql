PRAGMA foreign_keys = ON;

ALTER TABLE `movements` ADD COLUMN `scheduled_load_id` INTEGER REFERENCES `scheduled_loads`(`id`) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS `movements_scheduled_load_unique` ON `movements` (`scheduled_load_id`);
