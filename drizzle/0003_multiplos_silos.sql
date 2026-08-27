PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `silos` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` TEXT NOT NULL,
  `product` TEXT NOT NULL,
  `capacity` INTEGER NOT NULL CHECK (`capacity` > 0),
  `minimum_stock` INTEGER DEFAULT 0 NOT NULL CHECK (`minimum_stock` >= 0 AND `minimum_stock` <= `capacity`),
  `active` INTEGER DEFAULT 1 NOT NULL,
  `created_at` TEXT NOT NULL,
  `updated_at` TEXT NOT NULL
);

INSERT OR IGNORE INTO `silos` (`id`,`name`,`product`,`capacity`,`minimum_stock`,`active`,`created_at`,`updated_at`)
VALUES
  (1,'Silo 1','Cimento',120000,12000,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  (2,'Silo 2','Calcário',90000,12000,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

ALTER TABLE `movements` ADD COLUMN `silo_id` INTEGER NOT NULL DEFAULT 1 REFERENCES `silos`(`id`) ON DELETE RESTRICT;
ALTER TABLE `scheduled_loads` ADD COLUMN `silo_id` INTEGER NOT NULL DEFAULT 1 REFERENCES `silos`(`id`) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS `movements_silo_idx` ON `movements` (`silo_id`);
CREATE INDEX IF NOT EXISTS `scheduled_loads_silo_idx` ON `scheduled_loads` (`silo_id`);
