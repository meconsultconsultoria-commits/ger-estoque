import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "operator"] }).notNull().default("operator"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("sessions_token_idx").on(table.tokenHash),
  index("sessions_user_idx").on(table.userId),
]);

export const audits = sqliteTable("audits", {
  id: integer("id").primaryKey({ autoIncrement:true }), action:text("action").notNull(), entity:text("entity").notNull(),
  entityId:integer("entity_id"), details:text("details").notNull(), userEmail:text("user_email").notNull(), createdAt:text("created_at").notNull(),
});

export const scheduledLoads = sqliteTable("scheduled_loads", {
  id:integer("id").primaryKey({autoIncrement:true}), date:text("date").notNull(), qty:integer("qty").notNull(),
  doc:text("doc").notNull(), vehicle:text("vehicle").notNull(), status:text("status").notNull().default("Programada"),
  owner:text("owner").notNull(), createdAt:text("created_at").notNull(),
});

export const movements = sqliteTable("movements", {
  id: integer("id").primaryKey({ autoIncrement: true }), date: text("date").notNull(),
  type: text("type", { enum:["Entrada","Saída","Ajuste"] }).notNull(), qty: integer("qty").notNull(),
  doc: text("doc").notNull(), vehicle: text("vehicle").notNull(), owner: text("owner").notNull(),
  ownerEmail: text("owner_email").notNull(), reason: text("reason"), adjustmentDelta: integer("adjustment_delta"),
  scheduledLoadId: integer("scheduled_load_id").unique().references(() => scheduledLoads.id, { onDelete: "restrict" }),
  createdAt: text("created_at").notNull(),
});
