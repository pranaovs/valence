import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/index.js";
import { auth } from "../lib/firebase.js";
import { ok, error } from "../lib/response.js";
import { RANK_THRESHOLDS } from "../lib/helpers.js";

const authRoutes = new Hono();

const WELCOME_SPARKS = 50;
const WELCOME_XP = 50;

type Rank = keyof typeof RANK_THRESHOLDS;

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

// ---------- POST /auth/register ----------
authRoutes.post("/register", async (c) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return error(c, "UNAUTHORIZED", "Missing token", 401);
  }

  const token = header.slice(7);
  let decoded: { uid: string; email?: string; name?: string };

  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return error(c, "UNAUTHORIZED", "Invalid token", 401);
  }

  // Check if user already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, decoded.uid))
    .limit(1);

  if (existing) {
    return error(c, "ALREADY_EXISTS", "User already registered", 409);
  }

  // Pull profile info from Firebase
  let firebaseUser: { displayName?: string; email?: string };
  try {
    firebaseUser = await auth.getUser(decoded.uid);
  } catch {
    firebaseUser = { displayName: undefined, email: undefined };
  }

  const body = await c.req.json().catch(() => ({}));
  const name =
    body.name ||
    firebaseUser.displayName ||
    decoded.name ||
    "Valance User";
  const email =
    firebaseUser.email || decoded.email || "";

  const newXp = WELCOME_XP;
  const newRank = computeRank(newXp);

  const [user] = await db
    .insert(users)
    .values({
      firebaseUid: decoded.uid,
      email,
      name,
      xp: newXp,
      sparks: WELCOME_SPARKS,
      rank: newRank,
    })
    .returning();

  return ok(c, user, 201);
});

// ---------- POST /auth/login ----------
authRoutes.post("/login", async (c) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return error(c, "UNAUTHORIZED", "Missing token", 401);
  }

  const token = header.slice(7);
  let decoded: { uid: string };

  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return error(c, "UNAUTHORIZED", "Invalid token", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, decoded.uid))
    .limit(1);

  if (!user) {
    return error(c, "USER_NOT_FOUND", "User not registered", 404);
  }

  return ok(c, user);
});

// ---------- POST /auth/refresh ----------
authRoutes.post("/refresh", async (c) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return error(c, "UNAUTHORIZED", "Missing token", 401);
  }

  const token = header.slice(7);
  let decoded: { uid: string };

  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return error(c, "UNAUTHORIZED", "Invalid token", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, decoded.uid))
    .limit(1);

  if (!user) {
    return error(c, "USER_NOT_FOUND", "User not registered", 404);
  }

  return ok(c, user);
});

export { authRoutes };
