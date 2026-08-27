-- Estrutura multiempresa. A migração executável está em migrations/0005_clientes_temas.sql.
CREATE TABLE IF NOT EXISTS `clients` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` TEXT NOT NULL,
  `document` TEXT,
  `logo_url` TEXT,
  `primary_color` TEXT DEFAULT '#302d91' NOT NULL,
  `secondary_color` TEXT DEFAULT '#d63a1f' NOT NULL,
  `accent_color` TEXT DEFAULT '#ffffff' NOT NULL,
  `active` INTEGER DEFAULT 1 NOT NULL,
  `created_at` TEXT NOT NULL,
  `updated_at` TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS `user_clients` (
  `user_id` INTEGER NOT NULL,
  `client_id` INTEGER NOT NULL,
  `created_at` TEXT NOT NULL,
  PRIMARY KEY (`user_id`,`client_id`)
);
