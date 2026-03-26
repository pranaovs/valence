import { Worker } from "bullmq";
import { eq, and } from "drizzle-orm";
import { redis } from "../lib/redis.js";
import { db } from "../db/client.js";
import {
  users,
  habits,
  habitLogs,
  missLogs,
  groupMembers,
  groups,
  notifications,
} from "../db/schema/index.js";
import { generateText } from "../lib/gemini.js";
import { messaging } from "../lib/firebase.js";
import { getMemeForContext } from "../lib/giphy.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TARGET_HOUR = 7; // 07:00 local time

export const morningActivationWorker = new Worker(
  "morning-activation",
  async () => {
    console.log("[morning-activation] Starting morning activation push...");

    const allUsers = await db.select().from(users);
    const eligibleUsers = allUsers.filter((user) => {
      const localHour = dayjs().tz(user.timezone).hour();
      return localHour === TARGET_HOUR;
    });

    for (const user of eligibleUsers) {
      try {
        // Check if user has morning notifications enabled
        const prefs = user.notificationPreferences as {
          morning: boolean;
          nudges: boolean;
          memes: boolean;
          reflection: boolean;
        };
        if (!prefs.morning) continue;

        // Load user's active habits
        const userHabits = await db
          .select()
          .from(habits)
          .where(eq(habits.userId, user.id));

        const activeHabits = userHabits.filter((h) => h.isActive);
        const totalStreak = activeHabits.reduce(
          (sum, h) => sum + h.currentStreak,
          0
        );
        const habitNames = activeHabits.map((h) => h.name).join(", ");

        // Check group membership
        const [membership] = await db
          .select()
          .from(groupMembers)
          .where(eq(groupMembers.userId, user.id))
          .limit(1);

        let groupName: string | null = null;
        let groupStreak = 0;
        if (membership) {
          const [group] = await db
            .select()
            .from(groups)
            .where(eq(groups.id, membership.groupId))
            .limit(1);
          if (group) {
            groupName = group.name;
            groupStreak = group.currentStreak;
          }
        }

        // Build persona-driven prompt
        const personaContext =
          user.personaType === "socialiser"
            ? "This user is a socialiser -- they are motivated by group dynamics, accountability partners, and social recognition."
            : user.personaType === "achiever"
              ? "This user is an achiever -- they are motivated by streaks, milestones, ranks, and personal records."
              : "This user responds to a balanced mix of social and achievement motivation.";

        const groupContext = groupName
          ? `They are in group "${groupName}" with a ${groupStreak}-day streak.`
          : "They are not currently in a group.";

        // Check if user missed yesterday — trigger recovery mode
        const yesterday = dayjs().tz(user.timezone).subtract(1, "day").format("YYYY-MM-DD");
        const yesterdayMisses = await db
          .select()
          .from(missLogs)
          .where(and(eq(missLogs.userId, user.id), eq(missLogs.date, yesterday)));

        const isRecoveryDay = yesterdayMisses.length > 0;
        const recoveryContext = isRecoveryDay
          ? `IMPORTANT: This user missed ${yesterdayMisses.length} habit(s) yesterday. This is a RECOVERY message. Be extra supportive. Frame it as "ready to get back on track?" not "you missed." Mention their overall progress to keep spirits up.`
          : "";

        const memeMode = (user.notificationPreferences as { memes: boolean }).memes;
        const toneInstruction = memeMode
          ? "Use humor, memes, internet culture references, or witty one-liners. Be funny but still motivating. Think group chat energy, not corporate wellness."
          : "Be warm and specific. No memes or jokes.";

        const message = await generateText(
          `You are a supportive, energizing habit coach for an app called Valance. Generate a brief morning motivational message (1-2 sentences). ${toneInstruction} ${personaContext}`,
          `User "${user.name}" has ${activeHabits.length} active habits: ${habitNames || "none yet"}. Their combined streak progress is ${totalStreak} days. ${groupContext} Today is ${dayjs().tz(user.timezone).format("dddd")}. ${recoveryContext} Give them a persona-appropriate morning boost.`
        );

        const title = "Good Morning!";

        // Fetch a meme GIF if meme mode is enabled
        let memeGif: { id: string; url: string; preview: string } | null = null;
        if (memeMode) {
          const memeContext = groupName ? "morning group" : "morning streak";
          memeGif = await getMemeForContext(memeContext);
        }

        // Create notification
        await db.insert(notifications).values({
          userId: user.id,
          type: "morning_activation",
          title,
          body: message,
          data: {
            personaType: user.personaType,
            activeHabitCount: activeHabits.length,
            totalStreak,
            groupName,
            memeGif: memeGif ? { url: memeGif.url, preview: memeGif.preview } : null,
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
                `[morning-activation] FCM send failed for user ${user.id}:`,
                err
              );
            });
        }
      } catch (err) {
        console.error(
          `[morning-activation] Error processing user ${user.id}:`,
          err
        );
      }
    }

    console.log("[morning-activation] Completed morning activation push.");
  },
  { connection: redis }
);

morningActivationWorker.on("failed", (job, err) => {
  console.error(`[morning-activation] Job ${job?.id} failed:`, err);
});
