import { createMiddleware } from "hono/factory";
import { auth } from "../lib/firebase.js";
import { db } from "../db/client.js";
import { users } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

type AuthUser = typeof users.$inferSelect;

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    firebaseUid: string;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  // Dev bypass for testing without Flutter
  if (process.env.NODE_ENV === "development") {
    const devUserId = c.req.header("X-Dev-User-Id");
    if (devUserId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, devUserId))
        .limit(1);
      if (user) {
        c.set("user", user);
        c.set("firebaseUid", user.firebaseUid);
        await next();
        return;
      }
    }
  }

  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json(
      {
        status: "error",
        error: { code: "UNAUTHORIZED", message: "Missing token" },
      },
      401
    );
  }

  const token = header.slice(7);
  try {
    const decoded = await auth.verifyIdToken(token);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (!user) {
      return c.json(
        {
          status: "error",
          error: { code: "USER_NOT_FOUND", message: "Register first" },
        },
        404
      );
    }

    c.set("user", user);
    c.set("firebaseUid", decoded.uid);
  } catch {
    return c.json(
      {
        status: "error",
        error: { code: "UNAUTHORIZED", message: "Invalid token" },
      },
      401
    );
  }

  await next();
});
