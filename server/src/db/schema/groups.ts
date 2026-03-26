import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { groupTierEnum, groupRoleEnum } from "./enums";
import { users } from "./users";

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  inviteCode: varchar("invite_code", { length: 16 }).notNull().unique(),
  tier: groupTierEnum("tier").notNull().default("spark"),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalLinks: integer("total_links").notNull().default(0),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: groupRoleEnum("role").notNull().default("member"),
    consistencyPoints: integer("consistency_points").notNull().default(0),
    lastActiveDate: varchar("last_active_date", { length: 10 }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("group_member_uniq").on(table.groupId, table.userId),
    index("group_member_group_idx").on(table.groupId),
    index("group_member_user_idx").on(table.userId),
  ]
);

export const groupDayLinks = pgTable(
  "group_day_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    completionPercentage: integer("completion_percentage").notNull(),
    linkType: varchar("link_type", { length: 10 }).notNull(), // gold, silver, broken
    freezeUsed: boolean("freeze_used").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("group_day_link_uniq").on(table.groupId, table.date),
    index("group_day_link_group_idx").on(table.groupId),
  ]
);
