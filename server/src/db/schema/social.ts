import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { groups } from "./groups";
import { habitLogs } from "./habit-logs";

export const nudges = pgTable(
  "nudges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    llmGeneratedMessage: text("llm_generated_message").notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (table) => [
    index("nudge_receiver_idx").on(table.receiverId),
    index("nudge_group_idx").on(table.groupId),
  ]
);

export const kudos = pgTable(
  "kudos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    habitLogId: uuid("habit_log_id").references(() => habitLogs.id),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (table) => [
    index("kudos_receiver_idx").on(table.receiverId),
    index("kudos_group_idx").on(table.groupId),
  ]
);
