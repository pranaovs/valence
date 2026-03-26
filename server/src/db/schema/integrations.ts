import {
  pgTable,
  uuid,
  varchar,
  real,
  boolean,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { integrationStatusEnum } from "./enums";
import { users } from "./users";
import { habits } from "./habits";

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pluginId: varchar("plugin_id", { length: 50 }).notNull(),
    credentials: jsonb("credentials").notNull(),
    status: integrationStatusEnum("status").notNull().default("active"),
    lastSyncedAt: timestamp("last_synced_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("integration_user_plugin_uniq").on(
      table.userId,
      table.pluginId
    ),
    index("integration_plugin_status_idx").on(table.pluginId, table.status),
  ]
);

export const webhookTokens = pgTable("webhook_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
