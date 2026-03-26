import { Worker } from "bullmq";
import { eq, and } from "drizzle-orm";
import { redis } from "../lib/redis.js";
import { db } from "../db/client.js";
import {
  integrationConnections,
  habits,
  habitLogs,
  notifications,
  users,
} from "../db/schema/index.js";
import { today } from "../lib/helpers.js";
import { completeHabit } from "../services/streak.service.js";
import { awardCompletion } from "../services/points.service.js";
import { messaging } from "../lib/firebase.js";

// Plugin executor map
import { leetcodePlugin } from "../plugins/leetcode.js";
import { githubPlugin } from "../plugins/github.js";
import { wakapiPlugin } from "../plugins/wakapi.js";
import { duolingoPlugin } from "../plugins/duolingo.js";
import { chessComPlugin } from "../plugins/chess-com.js";
import { stravaPlugin } from "../plugins/strava.js";
import { todoistPlugin } from "../plugins/todoist.js";
import { screenTimePlugin } from "../plugins/screen-time.js";
import { googleFitPlugin } from "../plugins/google-fit.js";
import type { Plugin } from "../plugins/interface.js";

const pluginExecutors: Record<string, Plugin> = {
  leetcode: leetcodePlugin,
  github: githubPlugin,
  wakapi: wakapiPlugin,
  duolingo: duolingoPlugin,
  chess_com: chessComPlugin,
  strava: stravaPlugin,
  todoist: todoistPlugin,
  screen_time: screenTimePlugin,
  google_fit: googleFitPlugin,
};

export const pluginPollerWorker = new Worker(
  "plugin-poller",
  async () => {
    console.log("[plugin-poller] Starting plugin poll cycle...");

    const todayStr = today();

    // Load all active integration connections
    const connections = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.status, "active"));

    // Group connections by pluginId
    const grouped = new Map<
      string,
      Array<typeof connections[number]>
    >();
    for (const conn of connections) {
      const list = grouped.get(conn.pluginId) ?? [];
      list.push(conn);
      grouped.set(conn.pluginId, list);
    }

    for (const [pluginId, conns] of grouped) {
      const executor = pluginExecutors[pluginId];
      if (!executor) {
        console.warn(
          `[plugin-poller] No executor found for plugin: ${pluginId}`
        );
        continue;
      }

      for (const conn of conns) {
        try {
          const credentials = conn.credentials as Record<string, string>;
          const result = await executor.fetchTodayStatus(credentials);

          // Find ALL habits linked to this plugin for this user
          const userHabits = await db
            .select()
            .from(habits)
            .where(
              and(
                eq(habits.userId, conn.userId),
                eq(habits.pluginId, pluginId),
                eq(habits.isActive, true)
              )
            );

          if (userHabits.length === 0) {
            await db
              .update(integrationConnections)
              .set({ lastSyncedAt: new Date() })
              .where(eq(integrationConnections.id, conn.id));
            continue;
          }

          // For each habit linked to this plugin:
          // 1. Always store latest plugin metrics (even if goal not met — for heatmap partial progress)
          // 2. Auto-complete if goal is met
          for (const habit of userHabits) {
            const goal = habit.pluginGoal as { metric: string; operator: string; value: number } | null;

            // Always upsert a habitLog with the latest plugin metrics for heatmap
            const metrics = result.metadata as Record<string, number | string> | undefined;
            await db
              .insert(habitLogs)
              .values({
                habitId: habit.id,
                userId: conn.userId,
                date: todayStr,
                completed: false,
                verificationSource: pluginId as any,
                pluginMetrics: metrics ?? null,
              })
              .onConflictDoUpdate({
                target: [habitLogs.habitId, habitLogs.date],
                set: {
                  pluginMetrics: metrics ?? null,
                },
              });

            let isGoalMet = false;

            if (goal) {
              const metricValue = result.metadata?.[goal.metric];
              if (metricValue !== undefined && metricValue !== null) {
                const numValue = Number(metricValue);
                if (goal.operator === "gte") isGoalMet = numValue >= goal.value;
                else if (goal.operator === "lte") isGoalMet = numValue <= goal.value;
                else if (goal.operator === "eq") isGoalMet = numValue === goal.value;
              }
            } else {
              isGoalMet = result.completed;
            }

            if (!isGoalMet) continue;

            // Check if already completed today (not just logged — actually completed)
            const [existingLog] = await db
              .select()
              .from(habitLogs)
              .where(
                and(
                  eq(habitLogs.habitId, habit.id),
                  eq(habitLogs.date, todayStr),
                  eq(habitLogs.completed, true)
                )
              )
              .limit(1);

            if (existingLog) continue;

            // Auto-complete the habit
            const verificationSource = pluginId as
              | "leetcode"
              | "github"
              | "wakapi"
              | "google_fit"
              | "duolingo"
              | "screen_time"
              | "strava"
              | "chess_com"
              | "todoist";

            await completeHabit(conn.userId, habit.id, verificationSource, undefined, metrics);
            await awardCompletion(conn.userId, habit.intensity);

            // Send notification with raw plugin data for dashboard
            const title = "Habit Auto-Verified";
            const body = `Your "${habit.name}" was auto-verified via ${executor.name}!`;

            await db.insert(notifications).values({
              userId: conn.userId,
              type: "streak_milestone",
              title,
              body,
              data: {
                habitId: habit.id,
                pluginId,
                metadata: result.metadata,
                goalThreshold: goal,
              },
            });

            // Send FCM push if token exists
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.id, conn.userId))
              .limit(1);

            if (user?.fcmToken) {
              await messaging
                .send({
                  token: user.fcmToken,
                  notification: { title, body },
                })
                .catch((err: unknown) => {
                  console.error(
                    `[plugin-poller] FCM send failed for user ${conn.userId}:`,
                    err
                  );
                });
            }
          } // end for each habit

          // Update sync time for this connection
          await db
            .update(integrationConnections)
            .set({ lastSyncedAt: new Date(), lastError: null })
            .where(eq(integrationConnections.id, conn.id));
        } catch (err) {
          console.error(
            `[plugin-poller] Error polling ${pluginId} for connection ${conn.id}:`,
            err
          );

          // Mark connection as errored
          await db
            .update(integrationConnections)
            .set({
              status: "error",
              lastError:
                err instanceof Error ? err.message : "Unknown polling error",
              lastSyncedAt: new Date(),
            })
            .where(eq(integrationConnections.id, conn.id));
        }
      }
    }

    console.log("[plugin-poller] Completed plugin poll cycle.");
  },
  { connection: redis }
);

pluginPollerWorker.on("failed", (job, err) => {
  console.error(`[plugin-poller] Job ${job?.id} failed:`, err);
});
