import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { missReasonEnum } from "./enums";
import { habits } from "./habits";
import { users } from "./users";

export const missLogs = pgTable(
  "miss_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    reasonCategory: missReasonEnum("reason_category").notNull().default("other"),
    reasonText: text("reason_text"),
    graceFreezeUsed: boolean("grace_freeze_used").notNull().default(false),
    llmParsedCategory: varchar("llm_parsed_category", { length: 50 }),
    llmPatternSignal: varchar("llm_pattern_signal", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("miss_log_user_date_idx").on(table.userId, table.date),
    index("miss_log_habit_idx").on(table.habitId),
  ]
);
