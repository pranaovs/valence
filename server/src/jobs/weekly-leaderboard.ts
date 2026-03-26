import { Worker } from "bullmq";
import { eq, and, desc } from "drizzle-orm";
import { redis } from "../lib/redis.js";
import { db } from "../db/client.js";
import {
  groups,
  groupMembers,
  weeklyScores,
  feedItems,
  users,
} from "../db/schema/index.js";
import { getWeekStart } from "../lib/helpers.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

export const weeklyLeaderboardWorker = new Worker(
  "weekly-leaderboard",
  async () => {
    console.log("[weekly-leaderboard] Starting weekly leaderboard update...");

    // The week that just ended
    const previousWeekStart = dayjs
      .utc()
      .subtract(7, "day")
      .startOf("week")
      .format("YYYY-MM-DD");

    // The new week starting now
    const newWeekStart = getWeekStart();

    const allGroups = await db.select().from(groups);

    for (const group of allGroups) {
      try {
        // Load all weekly scores for the previous week
        const scores = await db
          .select()
          .from(weeklyScores)
          .where(
            and(
              eq(weeklyScores.groupId, group.id),
              eq(weeklyScores.weekStartDate, previousWeekStart)
            )
          )
          .orderBy(desc(weeklyScores.contributionScore));

        // Calculate final rank_in_group
        for (let i = 0; i < scores.length; i++) {
          const score = scores[i];
          await db
            .update(weeklyScores)
            .set({
              rankInGroup: i + 1,
              updatedAt: new Date(),
            })
            .where(eq(weeklyScores.id, score.id));
        }

        // Add feed item for weekly winner
        if (scores.length > 0) {
          const winner = scores[0];

          // Get winner's name
          const [winnerUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, winner.userId))
            .limit(1);

          await db.insert(feedItems).values({
            groupId: group.id,
            actorId: winner.userId,
            type: "streak_milestone",
            data: {
              event: "weekly_winner",
              weekStartDate: previousWeekStart,
              winnerName: winnerUser?.name ?? "Unknown",
              contributionScore: winner.contributionScore,
              habitsCompleted: winner.habitsCompleted,
              goldLinkContributions: winner.goldLinkContributions,
            },
          });
        }

        // Reset contribution scores for the new week (insert fresh rows)
        const members = await db
          .select()
          .from(groupMembers)
          .where(eq(groupMembers.groupId, group.id));

        for (const member of members) {
          // Check if a row already exists for the new week
          const [existing] = await db
            .select()
            .from(weeklyScores)
            .where(
              and(
                eq(weeklyScores.userId, member.userId),
                eq(weeklyScores.groupId, group.id),
                eq(weeklyScores.weekStartDate, newWeekStart)
              )
            )
            .limit(1);

          if (!existing) {
            await db.insert(weeklyScores).values({
              userId: member.userId,
              groupId: group.id,
              weekStartDate: newWeekStart,
              contributionScore: 0,
              habitsCompleted: 0,
              goldLinkContributions: 0,
              kudosReceived: 0,
              rankInGroup: null,
            });
          }
        }
      } catch (err) {
        console.error(
          `[weekly-leaderboard] Error processing group ${group.id}:`,
          err
        );
      }
    }

    console.log("[weekly-leaderboard] Completed weekly leaderboard update.");
  },
  { connection: redis }
);

weeklyLeaderboardWorker.on("failed", (job, err) => {
  console.error(`[weekly-leaderboard] Job ${job?.id} failed:`, err);
});
