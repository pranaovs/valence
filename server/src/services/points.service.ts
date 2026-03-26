import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import {
  INTENSITY_POINTS,
  STREAK_MILESTONES,
  PERFECT_DAY_BONUS,
  RANK_THRESHOLDS,
} from "../lib/helpers.js";

type Intensity = "light" | "moderate" | "intense";
type Rank = "bronze" | "silver" | "gold" | "platinum" | "diamond";

const RANK_ORDER: Rank[] = ["bronze", "silver", "gold", "platinum", "diamond"];

function resolveRank(xp: number): Rank {
  let resolved: Rank = "bronze";
  for (const rank of RANK_ORDER) {
    if (xp >= RANK_THRESHOLDS[rank]) {
      resolved = rank;
    }
  }
  return resolved;
}

async function addXpAndSparks(userId: string, amount: number) {
  const [updated] = await db
    .update(users)
    .set({
      xp: sql`${users.xp} + ${amount}`,
      sparks: sql`${users.sparks} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export async function awardCompletion(userId: string, intensity: Intensity) {
  const points = INTENSITY_POINTS[intensity];
  const user = await addXpAndSparks(userId, points);
  const newRank = await checkRankPromotion(userId);
  return { xpEarned: points, sparksEarned: points, newRank };
}

export async function awardPerfectDay(userId: string) {
  const user = await addXpAndSparks(userId, PERFECT_DAY_BONUS);
  return { xpEarned: PERFECT_DAY_BONUS, sparksEarned: PERFECT_DAY_BONUS };
}

export async function awardStreakMilestone(
  userId: string,
  streakLength: number
) {
  const bonus = STREAK_MILESTONES[streakLength];
  if (!bonus) return null;
  await addXpAndSparks(userId, bonus);
  return { xpEarned: bonus, sparksEarned: bonus, streakLength };
}

export async function awardGroupBonus(memberUserIds: string[]) {
  if (memberUserIds.length === 0) return;
  const perMember = Math.floor(15 / memberUserIds.length);
  if (perMember <= 0) return;

  for (const uid of memberUserIds) {
    await addXpAndSparks(uid, perMember);
  }
  return { perMember, totalMembers: memberUserIds.length };
}

export async function awardWelcomeBonus(userId: string) {
  await addXpAndSparks(userId, 50);
  return { xpEarned: 50, sparksEarned: 50 };
}

export async function spendSparks(
  userId: string,
  amount: number
): Promise<boolean> {
  const [user] = await db
    .select({ sparks: users.sparks })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.sparks < amount) {
    return false;
  }

  await db
    .update(users)
    .set({
      sparks: sql`${users.sparks} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return true;
}

export async function checkRankPromotion(
  userId: string
): Promise<Rank | null> {
  const [user] = await db
    .select({ xp: users.xp, rank: users.rank })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const newRank = resolveRank(user.xp);
  if (newRank !== user.rank) {
    await db
      .update(users)
      .set({ rank: newRank, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return newRank;
  }

  return null;
}
