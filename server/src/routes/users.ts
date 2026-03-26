import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, userItems } from "../db/schema/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, error } from "../lib/response.js";

const userRoutes = new Hono();

// All user routes are protected
userRoutes.use("*", authMiddleware);

// ---------- Zod schemas ----------

const settingsSchema = z.object({
  notification_preferences: z
    .object({
      morning: z.boolean(),
      nudges: z.boolean(),
      memes: z.boolean(),
      reflection: z.boolean(),
    })
    .optional(),
  timezone: z.string().min(1).max(50).optional(),
  persona_type: z.enum(["socialiser", "achiever", "general"]).optional(),
});

const equipSchema = z.object({
  theme: z.string().optional(),
  flame: z.string().optional(),
  animation: z.string().optional(),
  card_style: z.string().optional(),
  font: z.string().optional(),
  pattern: z.string().optional(),
  icon: z.string().optional(),
  profile_frame: z.string().nullable().optional(),
  profile_banner: z.string().nullable().optional(),
  party_badge: z.string().nullable().optional(),
  celebration: z.string().optional(),
  milestone_card: z.string().optional(),
  sound: z.string().optional(),
  freeze_animation: z.string().optional(),
  summary_style: z.string().optional(),
  party_entrance: z.string().optional(),
  name_color: z.string().nullable().optional(),
});

// Default item IDs that every user can equip without owning
const DEFAULT_ITEMS = new Set([
  "default",
  "nocturnal",
  "none",
]);

// ---------- GET /users/me ----------
userRoutes.get("/me", async (c) => {
  const user = c.get("user");
  return ok(c, user);
});

// ---------- PATCH /users/me/settings ----------
userRoutes.patch("/me/settings", async (c) => {
  const user = c.get("user");

  const body = await c.req.json().catch(() => ({}));
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return error(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join("; ")
    );
  }

  const { notification_preferences, timezone, persona_type } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (notification_preferences !== undefined) {
    updates.notificationPreferences = notification_preferences;
  }
  if (timezone !== undefined) {
    updates.timezone = timezone;
  }
  if (persona_type !== undefined) {
    updates.personaType = persona_type;
  }

  if (Object.keys(updates).length === 0) {
    return error(c, "NO_CHANGES", "No valid fields to update");
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, user.id))
    .returning();

  return ok(c, updated);
});

// ---------- PATCH /users/me/equip ----------
userRoutes.patch("/me/equip", async (c) => {
  const user = c.get("user");

  const body = await c.req.json().catch(() => ({}));
  const parsed = equipSchema.safeParse(body);
  if (!parsed.success) {
    return error(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join("; ")
    );
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return error(c, "NO_CHANGES", "No valid fields to update");
  }

  // Verify user owns each non-default item
  for (const [_slot, itemId] of Object.entries(updates)) {
    if (itemId === undefined) continue;
    // null means "unequip this slot"
    if (itemId === null) continue;
    // Default items don't require ownership
    if (DEFAULT_ITEMS.has(itemId)) continue;

    const [owned] = await db
      .select()
      .from(userItems)
      .where(
        and(eq(userItems.userId, user.id), eq(userItems.itemId, itemId))
      )
      .limit(1);

    if (!owned) {
      return error(
        c,
        "ITEM_NOT_OWNED",
        `You do not own item "${itemId}"`,
        403
      );
    }
  }

  // Merge with current equipped
  const currentEquipped = user.equipped;
  const newEquipped = { ...currentEquipped };
  for (const [slot, value] of Object.entries(updates)) {
    if (value !== undefined) {
      (newEquipped as Record<string, string | null>)[slot] = value;
    }
  }

  const [updated] = await db
    .update(users)
    .set({
      equipped: newEquipped as typeof currentEquipped,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return ok(c, updated);
});

// ---------- GET /users/:id/profile ----------
userRoutes.get("/:id/profile", async (c) => {
  const id = c.req.param("id");

  const [target] = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      xp: users.xp,
      rank: users.rank,
      equipped: users.equipped,
      personaType: users.personaType,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!target) {
    return error(c, "USER_NOT_FOUND", "User not found", 404);
  }

  return ok(c, target);
});

export { userRoutes };
