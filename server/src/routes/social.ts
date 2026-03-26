import { Hono } from "hono";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { nudges, kudos } from "../db/schema/social.js";
import { groupMembers } from "../db/schema/groups.js";
import { habits } from "../db/schema/habits.js";
import { habitLogs } from "../db/schema/habit-logs.js";
import { missLogs } from "../db/schema/miss-logs.js";
import { users } from "../db/schema/users.js";
import { notifications } from "../db/schema/notifications.js";
import { weeklyScores } from "../db/schema/weekly-scores.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, error } from "../lib/response.js";
import { today, getWeekStart } from "../lib/helpers.js";
import { generateText } from "../lib/gemini.js";
import { addFeedItem } from "../services/feed.service.js";
import { messaging } from "../lib/firebase.js";
import { getMemeForContext } from "../lib/giphy.js";
import { sanitizeForLLM } from "../lib/sanitize.js";

export const socialRoutes = new Hono();

socialRoutes.use("*", authMiddleware);

// POST /nudge — Send AI-personalized nudge
socialRoutes.post("/nudge", async (c) => {
  const sender = c.get("user");
  const body = await c.req.json<{
    receiver_id?: string;
    group_id?: string;
  }>();

  if (!body.receiver_id || !body.group_id) {
    return error(
      c,
      "VALIDATION_ERROR",
      "receiver_id and group_id are required"
    );
  }

  const { receiver_id, group_id } = body;

  if (sender.id === receiver_id) {
    return error(c, "VALIDATION_ERROR", "You cannot nudge yourself");
  }

  // ENFORCE: sender and receiver must be in the same group
  const [senderMembership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group_id),
        eq(groupMembers.userId, sender.id)
      )
    )
    .limit(1);

  if (!senderMembership) {
    return error(
      c,
      "NOT_A_MEMBER",
      "You are not a member of this group",
      403
    );
  }

  const [receiverMembership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group_id),
        eq(groupMembers.userId, receiver_id)
      )
    )
    .limit(1);

  if (!receiverMembership) {
    return error(
      c,
      "RECEIVER_NOT_IN_GROUP",
      "Receiver is not a member of this group"
    );
  }

  // ENFORCE: sender must have completed ALL their active habits today
  const todayStr = today();

  const senderActiveHabits = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, sender.id), eq(habits.isActive, true)));

  if (senderActiveHabits.length === 0) {
    return error(
      c,
      "NO_ACTIVE_HABITS",
      "You must have active habits to send a nudge"
    );
  }

  const senderCompletedLogs = await db
    .select({ habitId: habitLogs.habitId })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.userId, sender.id),
        eq(habitLogs.date, todayStr),
        eq(habitLogs.completed, true)
      )
    );

  const senderCompletedIds = new Set(
    senderCompletedLogs.map((l) => l.habitId)
  );
  const senderAllDone = senderActiveHabits.every((h) =>
    senderCompletedIds.has(h.id)
  );

  if (!senderAllDone) {
    return error(
      c,
      "INCOMPLETE_HABITS",
      "You must complete all your active habits today before nudging others"
    );
  }

  // BUG 4: Nudge rate limiting
  const todayStart = new Date(todayStr + "T00:00:00.000Z");
  const nudgesToday = await db
    .select({ id: nudges.id })
    .from(nudges)
    .where(
      and(
        eq(nudges.senderId, sender.id),
        gte(nudges.sentAt, todayStart)
      )
    );

  if (nudgesToday.length >= 5) {
    return error(
      c,
      "NUDGE_LIMIT_REACHED",
      "You can send at most 5 nudges per day",
      429
    );
  }

  // Check 1 nudge per sender→receiver pair per day
  const nudgesToReceiverToday = await db
    .select({ id: nudges.id })
    .from(nudges)
    .where(
      and(
        eq(nudges.senderId, sender.id),
        eq(nudges.receiverId, receiver_id),
        gte(nudges.sentAt, todayStart)
      )
    );

  if (nudgesToReceiverToday.length >= 1) {
    return error(
      c,
      "NUDGE_PAIR_LIMIT_REACHED",
      "You can only nudge this person once per day",
      429
    );
  }

  // Load receiver context
  const [receiver] = await db
    .select()
    .from(users)
    .where(eq(users.id, receiver_id))
    .limit(1);

  if (!receiver) {
    return error(c, "USER_NOT_FOUND", "Receiver not found", 404);
  }

  // Receiver's incomplete habits today
  const receiverActiveHabits = await db
    .select({ id: habits.id, name: habits.name, intensity: habits.intensity })
    .from(habits)
    .where(and(eq(habits.userId, receiver_id), eq(habits.isActive, true)));

  const receiverCompletedLogs = await db
    .select({ habitId: habitLogs.habitId })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.userId, receiver_id),
        eq(habitLogs.date, todayStr),
        eq(habitLogs.completed, true)
      )
    );

  const receiverCompletedIds = new Set(
    receiverCompletedLogs.map((l) => l.habitId)
  );
  const incompleteHabits = receiverActiveHabits.filter(
    (h) => !receiverCompletedIds.has(h.id)
  );

  // Receiver's recent streaks
  const receiverHabitsWithStreaks = await db
    .select({
      name: habits.name,
      currentStreak: habits.currentStreak,
      longestStreak: habits.longestStreak,
    })
    .from(habits)
    .where(and(eq(habits.userId, receiver_id), eq(habits.isActive, true)));

  // Receiver's recent miss logs (last 7 days)
  const recentMissLogs = await db
    .select({
      date: missLogs.date,
      reasonCategory: missLogs.reasonCategory,
      reasonText: missLogs.reasonText,
      llmPatternSignal: missLogs.llmPatternSignal,
    })
    .from(missLogs)
    .where(eq(missLogs.userId, receiver_id))
    .orderBy(desc(missLogs.createdAt))
    .limit(10);

  // Receiver's recent reflections
  const recentReflections = await db
    .select({
      date: habitLogs.date,
      reflectionText: habitLogs.reflectionText,
      reflectionDifficulty: habitLogs.reflectionDifficulty,
    })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.userId, receiver_id),
        eq(habitLogs.completed, true)
      )
    )
    .orderBy(desc(habitLogs.completedAt))
    .limit(5);

  const currentHour = new Date().getHours();
  const timeOfDay =
    currentHour < 12 ? "morning" : currentHour < 17 ? "afternoon" : "evening";

  // Call Gemini to generate personalized nudge message
  const systemPrompt = `You are a supportive friend in a habit-tracking group app called Valance.
Your job is to write a short, warm, personalized nudge message (2-3 sentences max) to motivate someone to complete their habits today.
Be encouraging, not guilt-tripping. Use their context to make it personal. Keep it casual and friendly.
Do NOT use emojis excessively. One or two max. Do not be preachy.`;

  const userPrompt = `Sender: ${sender.name}
Receiver: ${receiver.name}
Time of day: ${timeOfDay}

Receiver's incomplete habits today: ${incompleteHabits.map((h) => h.name).join(", ") || "none"}

Receiver's habit streaks: ${receiverHabitsWithStreaks.map((h) => `${h.name}: ${h.currentStreak} days`).join(", ")}

Recent miss patterns: ${recentMissLogs.map((m) => `${m.date}: ${m.reasonCategory}${m.llmPatternSignal ? ` (${m.llmPatternSignal})` : ""}`).join("; ") || "none"}

Recent reflections: ${recentReflections.map((r) => `${r.date}: difficulty ${r.reflectionDifficulty}/5 - "${sanitizeForLLM(r.reflectionText) || "no text"}"`).join("; ") || "none"}

Write a nudge message from ${sender.name} to ${receiver.name}.`;

  const nudgeMessage = await generateText(systemPrompt, userPrompt);

  // Fetch meme GIF if receiver has memes enabled
  const receiverPrefs = receiver.notificationPreferences as { memes: boolean };
  let memeGif: { url: string; preview: string } | null = null;
  if (receiverPrefs.memes) {
    const habitContext = incompleteHabits.map((h) => h.name).join(" ");
    const gif = await getMemeForContext(habitContext.includes("code") || habitContext.includes("LeetCode") ? "coding nudge" : "nudge");
    if (gif) memeGif = { url: gif.url, preview: gif.preview };
  }

  // Insert nudge record
  const [nudge] = await db
    .insert(nudges)
    .values({
      senderId: sender.id,
      receiverId: receiver_id,
      groupId: group_id,
      llmGeneratedMessage: nudgeMessage,
    })
    .returning();

  // Insert feed item
  await addFeedItem(group_id, sender.id, "nudge", {
    senderName: sender.name,
    receiverName: receiver.name,
    receiverId: receiver_id,
    memeGif,
  });

  // Status+Norm: calculate group completion rate and add norm feed item
  const allGroupMembers = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group_id));

  let membersCompleted = 0;
  for (const m of allGroupMembers) {
    const memberHabits = await db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.userId, m.userId), eq(habits.isActive, true)));
    if (memberHabits.length === 0) continue;
    const memberLogs = await db
      .select({ habitId: habitLogs.habitId })
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.userId, m.userId),
          eq(habitLogs.date, todayStr),
          eq(habitLogs.completed, true)
        )
      );
    const memberCompletedIds = new Set(memberLogs.map((l) => l.habitId));
    if (memberHabits.every((h) => memberCompletedIds.has(h.id))) {
      membersCompleted++;
    }
  }
  const groupCompletionRate = Math.round(
    (membersCompleted / allGroupMembers.length) * 100
  );

  if (groupCompletionRate > 0) {
    await addFeedItem(group_id, null, "status_norm", {
      message: `${membersCompleted}/${allGroupMembers.length} members are done for today — ${groupCompletionRate}% completion rate.`,
      completionRate: groupCompletionRate,
    });
  }

  // Insert notification for receiver
  const nudgeTitle = `${sender.name} nudged you`;
  await db.insert(notifications).values({
    userId: receiver_id,
    type: "friend_nudge",
    title: nudgeTitle,
    body: nudgeMessage,
    data: {
      nudgeId: nudge.id,
      senderId: sender.id,
      senderName: sender.name,
      groupId: group_id,
      memeGif,
    },
  });

  // Send FCM push to receiver
  if (receiver.fcmToken) {
    await messaging
      .send({
        token: receiver.fcmToken,
        notification: { title: nudgeTitle, body: nudgeMessage },
      })
      .catch((err: unknown) => {
        console.error(`[nudge] FCM send failed for user ${receiver_id}:`, err);
      });
  }

  return ok(c, {
    nudge,
    message: nudgeMessage,
  });
});

// POST /kudos — Send kudos
socialRoutes.post("/kudos", async (c) => {
  const sender = c.get("user");
  const body = await c.req.json<{
    receiver_id?: string;
    group_id?: string;
    habit_log_id?: string;
  }>();

  if (!body.receiver_id || !body.group_id) {
    return error(
      c,
      "VALIDATION_ERROR",
      "receiver_id and group_id are required"
    );
  }

  const { receiver_id, group_id, habit_log_id } = body;

  if (sender.id === receiver_id) {
    return error(c, "VALIDATION_ERROR", "You cannot give kudos to yourself");
  }

  // Verify sender in group
  const [senderMembership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group_id),
        eq(groupMembers.userId, sender.id)
      )
    )
    .limit(1);

  if (!senderMembership) {
    return error(
      c,
      "NOT_A_MEMBER",
      "You are not a member of this group",
      403
    );
  }

  // Verify receiver in group
  const [receiverMembership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group_id),
        eq(groupMembers.userId, receiver_id)
      )
    )
    .limit(1);

  if (!receiverMembership) {
    return error(
      c,
      "RECEIVER_NOT_IN_GROUP",
      "Receiver is not a member of this group"
    );
  }

  // Get receiver details
  const [receiver] = await db
    .select({ name: users.name, fcmToken: users.fcmToken })
    .from(users)
    .where(eq(users.id, receiver_id))
    .limit(1);

  // Insert kudos
  const [kudo] = await db
    .insert(kudos)
    .values({
      senderId: sender.id,
      receiverId: receiver_id,
      groupId: group_id,
      habitLogId: habit_log_id ?? null,
    })
    .returning();

  // Insert feed item
  await addFeedItem(group_id, sender.id, "kudos", {
    senderName: sender.name,
    receiverName: receiver?.name,
    receiverId: receiver_id,
    habitLogId: habit_log_id,
  });

  // Update receiver's weekly contribution score (kudos_received++)
  const weekStart = getWeekStart();
  await db
    .insert(weeklyScores)
    .values({
      userId: receiver_id,
      groupId: group_id,
      weekStartDate: weekStart,
      kudosReceived: 1,
      contributionScore: 1,
    })
    .onConflictDoUpdate({
      target: [
        weeklyScores.userId,
        weeklyScores.groupId,
        weeklyScores.weekStartDate,
      ],
      set: {
        kudosReceived: sql`${weeklyScores.kudosReceived} + 1`,
        contributionScore: sql`${weeklyScores.contributionScore} + 1`,
        updatedAt: new Date(),
      },
    });

  // Insert notification for receiver
  const kudosTitle = `${sender.name} gave you kudos!`;
  const kudosBody = habit_log_id
    ? `${sender.name} gave you kudos for completing a habit!`
    : `${sender.name} sent you kudos in the group!`;

  await db.insert(notifications).values({
    userId: receiver_id,
    type: "kudos_received",
    title: kudosTitle,
    body: kudosBody,
    data: {
      kudosId: kudo.id,
      senderId: sender.id,
      senderName: sender.name,
      groupId: group_id,
      habitLogId: habit_log_id,
    },
  });

  // Send FCM push to receiver
  if (receiver?.fcmToken) {
    await messaging
      .send({
        token: receiver.fcmToken,
        notification: { title: kudosTitle, body: kudosBody },
      })
      .catch((err: unknown) => {
        console.error(`[kudos] FCM send failed for user ${receiver_id}:`, err);
      });
  }

  return ok(c, { kudos: kudo });
});
