import { Hono } from "hono";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { shopItems, userItems, users } from "../db/schema/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, error } from "../lib/response.js";
import { RANK_THRESHOLDS } from "../lib/helpers.js";

const shopRoutes = new Hono();

// All shop routes are protected
shopRoutes.use("*", authMiddleware);

// ---------- Rank helpers ----------

type Rank = keyof typeof RANK_THRESHOLDS;

const RANK_ORDER: Rank[] = ["bronze", "silver", "gold", "platinum", "diamond"];

function rankIndex(rank: string): number {
  return RANK_ORDER.indexOf(rank as Rank);
}

function meetsRank(userRank: string, requiredRank: string): boolean {
  return rankIndex(userRank) >= rankIndex(requiredRank);
}

function computeRank(xp: number): Rank {
  const ranks: [Rank, number][] = [
    ["diamond", RANK_THRESHOLDS.diamond],
    ["platinum", RANK_THRESHOLDS.platinum],
    ["gold", RANK_THRESHOLDS.gold],
    ["silver", RANK_THRESHOLDS.silver],
    ["bronze", RANK_THRESHOLDS.bronze],
  ];
  for (const [rank, threshold] of ranks) {
    if (xp >= threshold) return rank;
  }
  return "bronze";
}

// ---------- GET /shop/items ----------
shopRoutes.get("/items", async (c) => {
  const user = c.get("user");
  const category = c.req.query("category");

  // Fetch all items (optionally filtered)
  let items;
  if (category) {
    items = await db
      .select()
      .from(shopItems)
      .where(eq(shopItems.category, category as any));
  } else {
    items = await db.select().from(shopItems);
  }

  // Fetch user's owned item IDs
  const ownedRows = await db
    .select({ itemId: userItems.itemId })
    .from(userItems)
    .where(eq(userItems.userId, user.id));

  const ownedSet = new Set(ownedRows.map((r) => r.itemId));

  const enriched = items.map((item) => ({
    ...item,
    owned: ownedSet.has(item.id),
    meets_rank: meetsRank(user.rank, item.minRank),
  }));

  return ok(c, enriched);
});

// ---------- POST /shop/purchase/:itemId ----------
shopRoutes.post("/purchase/:itemId", async (c) => {
  const user = c.get("user");
  const itemId = c.req.param("itemId");

  // Fetch the item
  const [item] = await db
    .select()
    .from(shopItems)
    .where(eq(shopItems.id, itemId))
    .limit(1);

  if (!item) {
    return error(c, "ITEM_NOT_FOUND", "Shop item not found", 404);
  }

  // Check if already owned
  const [alreadyOwned] = await db
    .select()
    .from(userItems)
    .where(and(eq(userItems.userId, user.id), eq(userItems.itemId, itemId)))
    .limit(1);

  if (alreadyOwned) {
    return error(c, "ALREADY_OWNED", "You already own this item", 409);
  }

  // Check rank requirement
  if (!meetsRank(user.rank, item.minRank)) {
    return error(
      c,
      "RANK_TOO_LOW",
      `Requires rank ${item.minRank}, you are ${user.rank}`,
      403
    );
  }

  // Check seasonal availability
  if (item.isSeasonal) {
    const now = new Date();
    if (item.availableFrom && now < item.availableFrom) {
      return error(c, "NOT_AVAILABLE", "This item is not yet available", 403);
    }
    if (item.availableUntil && now > item.availableUntil) {
      return error(c, "NOT_AVAILABLE", "This item is no longer available", 403);
    }
  }

  // Check Sparks balance
  if (user.sparks < item.sparksCost) {
    return error(
      c,
      "INSUFFICIENT_SPARKS",
      `Need ${item.sparksCost} Sparks, you have ${user.sparks}`,
      403
    );
  }

  // Deduct Sparks and insert user_item in a transaction
  const result = await db.transaction(async (tx) => {
    // Deduct Sparks
    const [updatedUser] = await tx
      .update(users)
      .set({
        sparks: sql`${users.sparks} - ${item.sparksCost}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    // Insert ownership record
    const [userItem] = await tx
      .insert(userItems)
      .values({
        userId: user.id,
        itemId: item.id,
      })
      .returning();

    return { user: updatedUser, userItem };
  });

  return ok(c, {
    item,
    remaining_sparks: result.user.sparks,
    purchased_at: result.userItem.purchasedAt,
  });
});

export { shopRoutes };
