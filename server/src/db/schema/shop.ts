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
import { shopCategoryEnum, rankEnum } from "./enums";
import { users } from "./users";

export const shopItems = pgTable(
  "shop_items",
  {
    id: varchar("id", { length: 50 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }),
    category: shopCategoryEnum("category").notNull(),
    sparksCost: integer("sparks_cost").notNull(),
    minRank: rankEnum("min_rank").notNull().default("bronze"),
    assetKey: varchar("asset_key", { length: 200 }),
    metadata: jsonb("metadata"),
    isSeasonal: boolean("is_seasonal").notNull().default(false),
    availableFrom: timestamp("available_from"),
    availableUntil: timestamp("available_until"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("shop_items_category_idx").on(table.category)]
);

export const userItems = pgTable(
  "user_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: varchar("item_id", { length: 50 })
      .notNull()
      .references(() => shopItems.id),
    purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  },
  (table) => [
    index("user_items_user_idx").on(table.userId),
  ]
);
