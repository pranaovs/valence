import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { verificationSourceEnum } from "./enums";
import { habits } from "./habits";
import { users } from "./users";

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    completed: boolean("completed").notNull().default(false),
    verificationSource: verificationSourceEnum("verification_source")
      .notNull()
      .default("manual"),
    proofUrl: varchar("proof_url", { length: 500 }),
    pluginMetrics: jsonb("plugin_metrics").$type<Record<string, number | string>>(),
    reflectionDifficulty: integer("reflection_difficulty"), // 1-5
    reflectionText: text("reflection_text"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("habit_log_habit_date_uniq").on(table.habitId, table.date),
    index("habit_log_user_date_idx").on(table.userId, table.date),
  ]
);
