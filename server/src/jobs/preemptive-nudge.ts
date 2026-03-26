import { Worker } from "bullmq";
import { eq, and, sql } from "drizzle-orm";
import { redis } from "../lib/redis.js";
import { db } from "../db/client.js";
import {
  users,
  habits,
  habitLogs,
  missLogs,
  notifications,
} from "../db/schema/index.js";
import { today } from "../lib/helpers.js";
import { generateText } from "../lib/gemini.js";
import { messaging } from "../lib/firebase.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TARGET_HOUR = 14; // 14:00 local time

export const preemptiveNudgeWorker = new Worker(
  "preemptive-nudge",
  async () => {
    console.log("[preemptive-nudge] Starting preemptive nudge generation...");

    // Load all users and filter to those whose local time is ~14:00
    const allUsers = await db.select().from(users);
    const eligibleUsers = allUsers.filter((user) => {
      const localHour = dayjs().tz(user.timezone).hour();
      return localHour === TARGET_HOUR;
    });

    const todayStr = today();

    for (const user of eligibleUsers) {
      try {
        // Check if user has nudges enabled
        const prefs = user.notificationPreferences as {
          morning: boolean;
          nudges: boolean;
          memes: boolean;
          reflection: boolean;
        };
        if (!prefs.nudges) continue;

        // Load active habits
        const activeHabits = await db
          .select()
          .from(habits)
          .where(
            and(eq(habits.userId, user.id), eq(habits.isActive, true))
          );

        if (activeHabits.length === 0) continue;

        // Check which habits are already completed today
        const todayLogs = await db
          .select()
          .from(habitLogs)
          .where(
            and(
              eq(habitLogs.userId, user.id),
              eq(habitLogs.date, todayStr),
              eq(habitLogs.completed, true)
            )
          );

        const completedHabitIds = new Set(todayLogs.map((l) => l.habitId));
        const incompleteHabits = activeHabits.filter(
          (h) => !completedHabitIds.has(h.id)
        );

        if (incompleteHabits.length === 0) continue;

        // Load miss log patterns: group by reason_category and day_of_week
        const userMissLogs = await db
          .select()
          .from(missLogs)
          .where(eq(missLogs.userId, user.id));

        // Analyze patterns by day of week
        const todayDayOfWeek = dayjs().tz(user.timezone).day(); // 0=Sun, 6=Sat
        const totalMisses = userMissLogs.length;
        const missesOnThisDay = userMissLogs.filter((m) => {
          return dayjs(m.date).day() === todayDayOfWeek;
        }).length;

        // Count total occurrences of this day of week in the user's history
        const totalWeeks = Math.max(
          1,
          Math.ceil(totalMisses / 7)
        );
        const missRateThisDay =
          totalWeeks > 0 ? missesOnThisDay / Math.max(totalWeeks, 1) : 0;

        // Also check reason patterns
        const reasonCounts = new Map<string, number>();
        for (const m of userMissLogs) {
          const count = reasonCounts.get(m.reasonCategory) ?? 0;
          reasonCounts.set(m.reasonCategory, count + 1);
        }

        const topReason =
          [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
          "forgot";

        // If high-risk pattern detected (50%+ miss rate on this day)
        const isHighRisk = missRateThisDay >= 0.5 && totalMisses >= 3;

        if (!isHighRisk) continue;

        // Generate preemptive warning via Gemini
        const dayName = dayjs().tz(user.timezone).format("dddd");
        const habitNames = incompleteHabits.map((h) => h.name).join(", ");

        const message = await generateText(
          "You are a supportive habit coach. Generate a brief, encouraging preemptive warning message. Be warm but direct. Keep it under 2 sentences.",
          `User "${user.name}" tends to miss habits on ${dayName}s (miss rate: ${Math.round(missRateThisDay * 100)}%). Their most common reason is "${topReason}". They still haven't completed: ${habitNames}. Generate a personalized nudge to help them stay on track today.`
        );

        // Create notification
        const title = "Heads up!";
        await db.insert(notifications).values({
          userId: user.id,
          type: "preemptive_warning",
          title,
          body: message,
          data: {
            dayOfWeek: dayName,
            missRate: missRateThisDay,
            topReason,
            incompleteHabits: incompleteHabits.map((h) => h.id),
          },
        });

        // Send FCM push if token exists
        if (user.fcmToken) {
          await messaging
            .send({
              token: user.fcmToken,
              notification: { title, body: message },
            })
            .catch((err: unknown) => {
              console.error(
                `[preemptive-nudge] FCM send failed for user ${user.id}:`,
                err
              );
            });
        }
      } catch (err) {
        console.error(
          `[preemptive-nudge] Error processing user ${user.id}:`,
          err
        );
      }
    }

    console.log("[preemptive-nudge] Completed preemptive nudge generation.");
  },
  { connection: redis }
);

preemptiveNudgeWorker.on("failed", (job, err) => {
  console.error(`[preemptive-nudge] Job ${job?.id} failed:`, err);
});
