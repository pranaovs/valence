import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import {
  intensityEnum,
  trackingMethodEnum,
  visibilityEnum,
  goalStageEnum,
} from "./enums";
import { users } from "./users";

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    intensity: intensityEnum("intensity").notNull().default("moderate"),
    trackingMethod: trackingMethodEnum("tracking_method")
      .notNull()
      .default("manual"),
    pluginId: varchar("plugin_id", { length: 50 }),
    pluginGoal: jsonb("plugin_goal")
      .$type<{
        metric: string;     // e.g., "steps", "games_today", "submissions_today", "totalMinutes"
        operator: "gte" | "lte" | "eq";
        value: number;      // e.g., 20000, 1, 3, 60
      }>(),
    redirectUrl: varchar("redirect_url", { length: 500 }),
    visibility: visibilityEnum("visibility").notNull().default("full"),
    frequencyRule: jsonb("frequency_rule")
      .notNull()
      .$type<{
        type: "daily" | "rolling_window" | "per_week" | "per_month";
        target?: number;  // how many times (e.g., 3)
        window?: number;  // window size in days (only for rolling_window, e.g., 5)
      }>()
      .default({ type: "daily" }),
    isActive: boolean("is_active").notNull().default(true),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    totalCompleted: integer("total_completed").notNull().default(0),
    goalStage: goalStageEnum("goal_stage").notNull().default("ignition"),
    lastCompletedDate: varchar("last_completed_date", { length: 10 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("habits_user_id_idx").on(table.userId),
    index("habits_user_active_idx").on(table.userId, table.isActive),
  ]
);
