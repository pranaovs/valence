import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { groups, groupMembers, groupDayLinks } from "../db/schema/groups.js";
import { habits } from "../db/schema/habits.js";
import { habitLogs } from "../db/schema/habit-logs.js";
import { users } from "../db/schema/users.js";
import { weeklyScores } from "../db/schema/weekly-scores.js";
import { addFeedItem } from "./feed.service.js";
import {
  GROUP_COMPLETION_GOLD,
  GROUP_COMPLETION_SILVER,
  GROUP_TIER_THRESHOLDS,
  GROUP_MIN_SIZE,
  getWeekStart,
} from "../lib/helpers.js";
import dayjs from "dayjs";
import { isFrequencyGoalMet } from "./frequency.service.js";

type GroupTier = "spark" | "ember" | "flame" | "blaze";
type LinkType = "gold" | "silver" | "broken";

function resolveGroupTier(streak: number): GroupTier {
  if (streak >= GROUP_TIER_THRESHOLDS.blaze) return "blaze";
  if (streak >= GROUP_TIER_THRESHOLDS.flame) return "flame";
  if (streak >= GROUP_TIER_THRESHOLDS.ember) return "ember";
  return "spark";
}

export async function evaluateGroupDay(groupId: string, date: string) {
  // 1. Load all group members
  const members = await db
    .select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      lastActiveDate: groupMembers.lastActiveDate,
    })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  if (members.length === 0) {
    throw new Error("GROUP_NO_MEMBERS");
  }

  // 2. Exclude members inactive >= 3 days
  const threeDaysAgo = dayjs(date).subtract(3, "day").format("YYYY-MM-DD");
  const eligibleMembers = members.filter((m) => {
    if (!m.lastActiveDate) return false;
    return m.lastActiveDate >= threeDaysAgo;
  });

  if (eligibleMembers.length === 0) {
    // All members inactive — treat as broken with 0%
    const result = await insertDayLink(groupId, date, 0, "broken", false);
    return result;
  }

  // BUG 5: Skip evaluation if fewer than GROUP_MIN_SIZE eligible members
  if (eligibleMembers.length < GROUP_MIN_SIZE) {
    return {
      groupId,
      date,
      skipped: true,
      reason: `Not enough eligible members (${eligibleMembers.length}/${GROUP_MIN_SIZE})`,
      eligibleMembers: eligibleMembers.length,
    };
  }

  // 3. For each eligible member, check if ALL their active habits have a completed log
  const memberResults: Array<{
    userId: string;
    done: boolean;
    activeHabitCount: number;
    completedCount: number;
  }> = [];

  for (const member of eligibleMembers) {
    // Get active habits for this member
    const activeHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, member.userId), eq(habits.isActive, true)));

    if (activeHabits.length === 0) {
      // No active habits — consider them "done" (they can't fail)
      memberResults.push({
        userId: member.userId,
        done: true,
        activeHabitCount: 0,
        completedCount: 0,
      });
      continue;
    }

    // Get completed habit logs for this date
    const completedLogs = await db
      .select({ habitId: habitLogs.habitId })
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.userId, member.userId),
          eq(habitLogs.date, date),
          eq(habitLogs.completed, true)
        )
      );

    // Check each habit's frequency goal (not just "completed today")
    const habitGoalChecks = await Promise.all(
      activeHabits.map(async (h) => {
        const rule = h.frequencyRule as { type: string; target?: number; window?: number };
        const goalStatus = await isFrequencyGoalMet(h.id, member.userId, rule as any, date);
        return goalStatus.met;
      })
    );
    const allDone = habitGoalChecks.every((met) => met);

    memberResults.push({
      userId: member.userId,
      done: allDone,
      activeHabitCount: activeHabits.length,
      completedCount: habitGoalChecks.filter((m) => m).length,
    });
  }

  // 4. Calculate completion percentage
  const doneCount = memberResults.filter((m) => m.done).length;
  const completionPct = Math.round((doneCount / eligibleMembers.length) * 100);

  // 5. Determine link type
  let linkType: LinkType;
  if (completionPct >= GROUP_COMPLETION_GOLD) {
    linkType = "gold";
  } else if (completionPct >= GROUP_COMPLETION_SILVER) {
    linkType = "silver";
  } else {
    linkType = "broken";
  }

  // 6. Check if a freeze was already used today
  const [existingLink] = await db
    .select()
    .from(groupDayLinks)
    .where(
      and(eq(groupDayLinks.groupId, groupId), eq(groupDayLinks.date, date))
    )
    .limit(1);

  let freezeUsed = existingLink?.freezeUsed ?? false;

  // 7. If broken AND freeze available (not already used today), treat as silver
  if (linkType === "broken" && !freezeUsed) {
    // Check if there's a freeze available for today (set by POST /groups/:id/freeze)
    // A freeze is "available" if there's a groupDayLink with freeze_used=true for today
    // But since we're creating the link now, we check if a freeze was pre-purchased
    // The freeze is set via the freeze route which marks it on the day link
    // If the existing link already has freeze_used, use it
    if (existingLink?.freezeUsed) {
      linkType = "silver";
      freezeUsed = true;
    }
  }

  // 8. Insert/update the day link and update group streaks
  const result = await insertDayLink(
    groupId,
    date,
    completionPct,
    linkType,
    freezeUsed
  );

  // 11. If gold: award bonus points (15 split among all members)
  if (linkType === "gold") {
    const pointsPerMember = Math.floor(15 / members.length);
    if (pointsPerMember > 0) {
      const weekStart = getWeekStart();
      for (const member of members) {
        // Award sparks to user
        await db
          .update(users)
          .set({
            sparks: sql`${users.sparks} + ${pointsPerMember}`,
          })
          .where(eq(users.id, member.userId));

        // Update weekly score gold_link_contributions
        await db
          .insert(weeklyScores)
          .values({
            userId: member.userId,
            groupId,
            weekStartDate: weekStart,
            goldLinkContributions: 1,
            contributionScore: pointsPerMember,
          })
          .onConflictDoUpdate({
            target: [
              weeklyScores.userId,
              weeklyScores.groupId,
              weeklyScores.weekStartDate,
            ],
            set: {
              goldLinkContributions: sql`${weeklyScores.goldLinkContributions} + 1`,
              contributionScore: sql`${weeklyScores.contributionScore} + ${pointsPerMember}`,
              updatedAt: new Date(),
            },
          });
      }
    }
  }

  // 12. Add feed items for link type
  const feedType =
    linkType === "gold"
      ? "group_link_gold"
      : linkType === "silver"
        ? "group_link_silver"
        : "group_link_broken";

  await addFeedItem(groupId, null, feedType as any, {
    date,
    completionPercentage: completionPct,
    linkType,
    freezeUsed,
    eligibleMembers: eligibleMembers.length,
    completedMembers: doneCount,
  });

  // 13. Return result
  return {
    groupId,
    date,
    completionPercentage: completionPct,
    linkType,
    freezeUsed,
    eligibleMembers: eligibleMembers.length,
    completedMembers: doneCount,
    memberResults,
    ...result,
  };
}

async function insertDayLink(
  groupId: string,
  date: string,
  completionPct: number,
  linkType: LinkType,
  freezeUsed: boolean
) {
  // Upsert the day link
  const [dayLink] = await db
    .insert(groupDayLinks)
    .values({
      groupId,
      date,
      completionPercentage: completionPct,
      linkType,
      freezeUsed,
    })
    .onConflictDoUpdate({
      target: [groupDayLinks.groupId, groupDayLinks.date],
      set: {
        completionPercentage: completionPct,
        linkType,
        freezeUsed,
      },
    })
    .returning();

  // Fetch group for streak update
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) throw new Error("GROUP_NOT_FOUND");

  let newCurrentStreak = group.currentStreak;
  let newTotalLinks = group.totalLinks + 1;

  if (linkType === "gold" || linkType === "silver") {
    // Streak continues
    newCurrentStreak = group.currentStreak + 1;
  }
  // If broken (no freeze) → streak PAUSES (stays same, does NOT reset to 0)

  const newLongestStreak = Math.max(group.longestStreak, newCurrentStreak);

  // Update tier based on current streak
  const newTier = resolveGroupTier(newCurrentStreak);

  const oldTier = group.tier;

  const [updatedGroup] = await db
    .update(groups)
    .set({
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      totalLinks: newTotalLinks,
      tier: newTier,
      updatedAt: new Date(),
    })
    .where(eq(groups.id, groupId))
    .returning();

  // If tier changed, add feed item
  if (newTier !== oldTier) {
    await addFeedItem(groupId, null, "group_tier_change", {
      oldTier,
      newTier,
      streak: newCurrentStreak,
    });
  }

  return {
    dayLink,
    group: updatedGroup,
    streakIncremented: linkType !== "broken",
  };
}
