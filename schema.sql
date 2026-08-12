-- GER - Gestão de Estoque e Registros
-- Schema para migração externa em Cloudflare D1.
-- Mantém as tabelas operacionais da versão 11 e adiciona autenticação própria.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `password_hash` TEXT NOT NULL,
  `role` TEXT DEFAULT 'operator' NOT NULL CHECK (`role` IN ('admin','operator')),
  `active` INTEGER DEFAULT 1 NOT NULL,
  `created_at` TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `token_hash` TEXT NOT NULL UNIQUE,
  `user_id` INTEGER NOT NULL,
  `expires_at` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `sessions_token_idx` ON `sessions` (`token_hash`);
CREATE INDEX IF NOT EXISTS `sessions_user_idx` ON `sessions` (`user_id`);

CREATE TABLE IF NOT EXISTS `audits` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `action` TEXT NOT NULL,
  `entity` TEXT NOT NULL,
  `entity_id` INTEGER,
  `details` TEXT NOT NULL,
  `user_email` TEXT NOT NULL,
  `created_at` TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `scheduled_loads` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date` TEXT NOT NULL,
  `qty` INTEGER NOT NULL,
  `doc` TEXT NOT NULL,
  `vehicle` TEXT NOT NULL,
  `status` TEXT DEFAULT 'Programada' NOT NULL,
  `owner` TEXT NOT NULL,
  `created_at` TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `movements` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date` TEXT NOT NULL,
  `type` TEXT NOT NULL CHECK (`type` IN ('Entrada','Saída','Ajuste')),
  `qty` INTEGER NOT NULL,
  `doc` TEXT NOT NULL,
  `vehicle` TEXT NOT NULL,
  `owner` TEXT NOT NULL,
  `owner_email` TEXT NOT NULL,
  `reason` TEXT,
  `scheduled_load_id` INTEGER UNIQUE,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`scheduled_load_id`) REFERENCES `scheduled_loads`(`id`) ON DELETE RESTRICT
);
