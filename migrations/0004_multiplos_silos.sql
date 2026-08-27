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

-- SQLite não permite adicionar REFERENCES com default não nulo em tabelas preenchidas.
-- O default preserva todo o histórico no Silo 1; os gatilhos mantêm a integridade.
ALTER TABLE `movements` ADD COLUMN `silo_id` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `scheduled_loads` ADD COLUMN `silo_id` INTEGER NOT NULL DEFAULT 1;

CREATE TRIGGER IF NOT EXISTS `movements_silo_insert_guard`
BEFORE INSERT ON `movements`
WHEN NOT EXISTS (SELECT 1 FROM `silos` WHERE `id` = NEW.`silo_id`)
BEGIN SELECT RAISE(ABORT, 'Silo inválido'); END;

CREATE TRIGGER IF NOT EXISTS `movements_silo_update_guard`
BEFORE UPDATE OF `silo_id` ON `movements`
WHEN NOT EXISTS (SELECT 1 FROM `silos` WHERE `id` = NEW.`silo_id`)
BEGIN SELECT RAISE(ABORT, 'Silo inválido'); END;

CREATE TRIGGER IF NOT EXISTS `scheduled_loads_silo_insert_guard`
BEFORE INSERT ON `scheduled_loads`
WHEN NOT EXISTS (SELECT 1 FROM `silos` WHERE `id` = NEW.`silo_id`)
BEGIN SELECT RAISE(ABORT, 'Silo inválido'); END;

CREATE TRIGGER IF NOT EXISTS `scheduled_loads_silo_update_guard`
BEFORE UPDATE OF `silo_id` ON `scheduled_loads`
WHEN NOT EXISTS (SELECT 1 FROM `silos` WHERE `id` = NEW.`silo_id`)
BEGIN SELECT RAISE(ABORT, 'Silo inválido'); END;

CREATE INDEX IF NOT EXISTS `movements_silo_idx` ON `movements` (`silo_id`);
CREATE INDEX IF NOT EXISTS `scheduled_loads_silo_idx` ON `scheduled_loads` (`silo_id`);
