import { Worker } from "bullmq";
import { eq, and, inArray } from "drizzle-orm";
import { redis } from "../lib/redis.js";
import { db } from "../db/client.js";
import {
  users,
  habits,
  habitLogs,
  missLogs,
  groups,
  groupMembers,
  groupDayLinks,
} from "../db/schema/index.js";
import {
  yesterday,
  GROUP_TIER_THRESHOLDS,
  GROUP_COMPLETION_GOLD,
  GROUP_COMPLETION_SILVER,
} from "../lib/helpers.js";

type GroupTier = "spark" | "ember" | "flame" | "blaze";

function resolveGroupTier(streak: number): GroupTier {
  if (streak >= GROUP_TIER_THRESHOLDS.blaze) return "blaze";
  if (streak >= GROUP_TIER_THRESHOLDS.flame) return "flame";
  if (streak >= GROUP_TIER_THRESHOLDS.ember) return "ember";
  return "spark";
}

async function evaluateGroupDay(groupId: string, date: string): Promise<void> {
  // Load all group members
  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  if (members.length === 0) return;

  const memberIds = members.map((m) => m.userId);

  // Load all active habits for each member
  const memberHabits = await db
    .select()
    .from(habits)
    .where(and(inArray(habits.userId, memberIds), eq(habits.isActive, true)));

  // Load all habit logs for the date
  const logs = await db
    .select()
    .from(habitLogs)
    .where(
      and(
        inArray(habitLogs.userId, memberIds),
        eq(habitLogs.date, date),
        eq(habitLogs.completed, true)
      )
    );

  const completedHabitIds = new Set(logs.map((l) => l.habitId));

  // Calculate per-member completion
  let totalHabits = 0;
  let completedTotal = 0;

  for (const memberId of memberIds) {
    const memberActiveHabits = memberHabits.filter(
      (h) => h.userId === memberId
    );
    totalHabits += memberActiveHabits.length;

    const memberCompletedCount = memberActiveHabits.filter((h) =>
      completedHabitIds.has(h.id)
    ).length;
    completedTotal += memberCompletedCount;
  }

  const completionPercentage =
    totalHabits > 0 ? Math.round((completedTotal / totalHabits) * 100) : 0;

  // Determine link type
  let linkType: string;
  if (completionPercentage >= GROUP_COMPLETION_GOLD) {
    linkType = "gold";
  } else if (completionPercentage >= GROUP_COMPLETION_SILVER) {
    linkType = "silver";
  } else {
    linkType = "broken";
  }

  // Upsert group day link
  await db
    .insert(groupDayLinks)
    .values({
      groupId,
      date,
      completionPercentage,
      linkType,
    })
    .onConflictDoUpdate({
      target: [groupDayLinks.groupId, groupDayLinks.date],
      set: { completionPercentage, linkType },
    });

  // Update group streak
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) return;

  let newStreak = group.currentStreak;

  if (linkType === "gold" || linkType === "silver") {
    newStreak = group.currentStreak + 1;
  } else {
    // Broken link pauses the streak (does NOT reset)
    // Streak stays at current value
  }

  const newLongest = Math.max(group.longestStreak, newStreak);
  const newTier = resolveGroupTier(newStreak);

  await db
    .update(groups)
    .set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      totalLinks: group.totalLinks + 1,
      tier: newTier,
      updatedAt: new Date(),
    })
    .where(eq(groups.id, groupId));
}

export const dailyStreakWorker = new Worker(
  "daily-streak",
  async () => {
    console.log("[daily-streak] Starting daily streak calculation...");

    const date = yesterday();

    // --- Process groups ---
    const allGroups = await db.select().from(groups);

    for (const group of allGroups) {
      try {
        const members = await db
          .select()
          .from(groupMembers)
          .where(eq(groupMembers.groupId, group.id));

        const memberIds = members.map((m) => m.userId);

        // Load active habits for group members
        const memberHabits = await db
          .select()
          .from(habits)
          .where(
            and(inArray(habits.userId, memberIds), eq(habits.isActive, true))
          );

        // Load yesterday's logs
        const logs = await db
          .select()
          .from(habitLogs)
          .where(
            and(
              inArray(habitLogs.userId, memberIds),
              eq(habitLogs.date, date),
              eq(habitLogs.completed, true)
            )
          );

        const completedHabitIds = new Set(logs.map((l) => l.habitId));

        // For each member, check incomplete habits and create miss logs
        for (const memberId of memberIds) {
          const memberActiveHabits = memberHabits.filter(
            (h) => h.userId === memberId
          );

          for (const habit of memberActiveHabits) {
            if (!completedHabitIds.has(habit.id)) {
              // Check if miss log already exists
              const [existingMiss] = await db
                .select()
                .from(missLogs)
                .where(
                  and(
                    eq(missLogs.habitId, habit.id),
                    eq(missLogs.userId, memberId),
                    eq(missLogs.date, date)
                  )
                )
                .limit(1);

              if (!existingMiss) {
                await db.insert(missLogs).values({
                  habitId: habit.id,
                  userId: memberId,
                  date,
                  reasonCategory: "forgot",
                });
              }

              // Streak PAUSES -- no reset, no increment
              // (lastCompletedDate stays the same, currentStreak stays the same)
            }
          }
        }

        // Evaluate the group day
        await evaluateGroupDay(group.id, date);
      } catch (err) {
        console.error(
          `[daily-streak] Error processing group ${group.id}:`,
          err
        );
      }
    }

    // --- Process standalone users (not in any group) ---
    const allGroupMemberRows = await db.select().from(groupMembers);
    const groupedUserIds = new Set(allGroupMemberRows.map((m) => m.userId));

    const allUsers = await db.select().from(users);
    const standaloneUsers = allUsers.filter(
      (u) => !groupedUserIds.has(u.id)
    );

    for (const user of standaloneUsers) {
      try {
        const userHabits = await db
          .select()
          .from(habits)
          .where(
            and(eq(habits.userId, user.id), eq(habits.isActive, true))
          );

        const logs = await db
          .select()
          .from(habitLogs)
          .where(
            and(
              eq(habitLogs.userId, user.id),
              eq(habitLogs.date, date),
              eq(habitLogs.completed, true)
            )
          );

        const completedHabitIds = new Set(logs.map((l) => l.habitId));

        for (const habit of userHabits) {
          if (!completedHabitIds.has(habit.id)) {
            // Check if miss log already exists
            const [existingMiss] = await db
              .select()
              .from(missLogs)
              .where(
                and(
                  eq(missLogs.habitId, habit.id),
                  eq(missLogs.userId, user.id),
                  eq(missLogs.date, date)
                )
              )
              .limit(1);

            if (!existingMiss) {
              await db.insert(missLogs).values({
                habitId: habit.id,
                userId: user.id,
                date,
                reasonCategory: "forgot",
              });
            }

            // Streak PAUSES (stays at current value)
          }
        }
      } catch (err) {
        console.error(
          `[daily-streak] Error processing standalone user ${user.id}:`,
          err
        );
      }
    }

    console.log("[daily-streak] Completed daily streak calculation.");
  },
  { connection: redis }
);

dailyStreakWorker.on("failed", (job, err) => {
  console.error(`[daily-streak] Job ${job?.id} failed:`, err);
});
