import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { notifications } from "../db/schema/notifications.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, error } from "../lib/response.js";

export const notificationRoutes = new Hono();

notificationRoutes.use("*", authMiddleware);

// GET /notifications — List user's notifications
notificationRoutes.get("/", async (c) => {
  const user = c.get("user");
  const unreadOnly = c.req.query("unread_only") === "true";

  const conditions = [eq(notifications.userId, user.id)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const items = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.sentAt))
    .limit(100);

  return ok(c, { notifications: items });
});

// POST /notifications/:id/read — Mark notification as read
notificationRoutes.post("/:id/read", async (c) => {
  const user = c.get("user");
  const notificationId = c.req.param("id");

  const [notification] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id)
      )
    )
    .limit(1);

  if (!notification) {
    return error(
      c,
      "NOTIFICATION_NOT_FOUND",
      "Notification not found",
      404
    );
  }

  if (notification.isRead) {
    return ok(c, { notification });
  }

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId))
    .returning();

  return ok(c, { notification: updated });
});
