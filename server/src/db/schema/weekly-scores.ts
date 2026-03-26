import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { groups } from "./groups";

export const weeklyScores = pgTable(
  "weekly_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    weekStartDate: varchar("week_start_date", { length: 10 }).notNull(),
    contributionScore: integer("contribution_score").notNull().default(0),
    habitsCompleted: integer("habits_completed").notNull().default(0),
    goldLinkContributions: integer("gold_link_contributions")
      .notNull()
      .default(0),
    kudosReceived: integer("kudos_received").notNull().default(0),
    rankInGroup: integer("rank_in_group"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("weekly_score_user_group_week_uniq").on(
      table.userId,
      table.groupId,
      table.weekStartDate
    ),
    index("weekly_score_group_week_idx").on(
      table.groupId,
      table.weekStartDate
    ),
  ]
);
