import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { feedItemTypeEnum } from "./enums";
import { users } from "./users";
import { groups } from "./groups";

export const feedItems = pgTable(
  "feed_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id),
    type: feedItemTypeEnum("type").notNull(),
    data: jsonb("data").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("feed_items_group_created_idx").on(
      table.groupId,
      table.createdAt
    ),
  ]
);
