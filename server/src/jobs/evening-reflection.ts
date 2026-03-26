import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { redis } from "../lib/redis.js";
import { db } from "../db/client.js";
import { users, notifications } from "../db/schema/index.js";
import { messaging } from "../lib/firebase.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TARGET_HOUR = 21; // 21:00 local time

export const eveningReflectionWorker = new Worker(
  "evening-reflection",
  async () => {
    console.log("[evening-reflection] Starting evening reflection push...");

    const allUsers = await db.select().from(users);
    const eligibleUsers = allUsers.filter((user) => {
      const localHour = dayjs().tz(user.timezone).hour();
      return localHour === TARGET_HOUR;
    });

    for (const user of eligibleUsers) {
      try {
        // Check if user has reflection notifications enabled
        const prefs = user.notificationPreferences as {
          morning: boolean;
          nudges: boolean;
          memes: boolean;
          reflection: boolean;
        };
        if (!prefs.reflection) continue;

        const title = "Evening Reflection";
        const body = "How did today go? Quick 1-tap reflection";

        // Create notification record
        await db.insert(notifications).values({
          userId: user.id,
          type: "reflection_prompt",
          title,
          body,
          data: { date: dayjs().tz(user.timezone).format("YYYY-MM-DD") },
        });

        // Send FCM push if token exists
        if (user.fcmToken) {
          await messaging
            .send({
              token: user.fcmToken,
              notification: { title, body },
            })
            .catch((err: unknown) => {
              console.error(
                `[evening-reflection] FCM send failed for user ${user.id}:`,
                err
              );
            });
        }
      } catch (err) {
        console.error(
          `[evening-reflection] Error processing user ${user.id}:`,
          err
        );
      }
    }

    console.log("[evening-reflection] Completed evening reflection push.");
  },
  { connection: redis }
);

eveningReflectionWorker.on("failed", (job, err) => {
  console.error(`[evening-reflection] Job ${job?.id} failed:`, err);
});
