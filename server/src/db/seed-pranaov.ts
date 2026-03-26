import { db } from "./client.js";
import { users } from "./schema/users.js";
import { habits } from "./schema/habits.js";
import { habitLogs } from "./schema/habit-logs.js";
import { groups, groupMembers, groupDayLinks } from "./schema/groups.js";
import { feedItems } from "./schema/feed.js";
import { notifications } from "./schema/notifications.js";
import { weeklyScores } from "./schema/weekly-scores.js";
import { userItems } from "./schema/shop.js";
import { integrationConnections } from "./schema/integrations.js";
import { nudges } from "./schema/social.js";
import { eq, sql } from "drizzle-orm";
import dayjs from "dayjs";

const USER_ID = "48c84a2d-698c-4fbb-8559-6c57cf8dd085";

async function seed() {
  console.log("Populating demo data for valence@pranaovs.me...\n");

  // ============ UPDATE USER PROFILE ============
  console.log("Updating user profile...");
  await db.update(users).set({
    xp: 2450,
    sparks: 1200,
    rank: "gold",
    personaType: "achiever",
    timezone: "Asia/Kolkata",
    equipped: {
      theme: "nocturnal", flame: "flame-blue", animation: "default",
      card_style: "default", font: "default", pattern: "none", icon: "default",
      profile_frame: null, profile_banner: null, party_badge: null,
      celebration: "default", milestone_card: "default", sound: "default",
      freeze_animation: "default", summary_style: "default", party_entrance: "default",
      name_color: null,
    },
    notificationPreferences: { morning: true, nudges: true, memes: true, reflection: true },
  }).where(eq(users.id, USER_ID));
  console.log("  Gold rank, 2450 XP, 1200 Sparks, achiever persona");

  // ============ CREATE DUMMY FRIENDS ============
  console.log("\nCreating group members...");

  const friendsData = [
    { firebaseUid: "demo-riya-2", email: "riya@demo.app", name: "Riya", xp: 3100, sparks: 1500, rank: "gold" as const, personaType: "achiever" as const },
    { firebaseUid: "demo-arjun-2", email: "arjun@demo.app", name: "Arjun", xp: 950, sparks: 400, rank: "silver" as const, personaType: "general" as const },
    { firebaseUid: "demo-nitil-2", email: "nitil@demo.app", name: "Nitil", xp: 5200, sparks: 2000, rank: "platinum" as const, personaType: "achiever" as const },
    { firebaseUid: "demo-deepan-2", email: "deepan@demo.app", name: "Deepan", xp: 1800, sparks: 900, rank: "silver" as const, personaType: "socialiser" as const },
  ];

  const friendIds: string[] = [];
  for (const f of friendsData) {
    const [user] = await db.insert(users).values({
      ...f,
      timezone: "Asia/Kolkata",
      equipped: {
        theme: "nocturnal", flame: "default", animation: "default",
        card_style: "default", font: "default", pattern: "none", icon: "default",
        profile_frame: null, profile_banner: null, party_badge: null,
        celebration: "default", milestone_card: "default", sound: "default",
        freeze_animation: "default", summary_style: "default", party_entrance: "default",
        name_color: null,
      },
      notificationPreferences: { morning: true, nudges: true, memes: true, reflection: true },
    }).onConflictDoUpdate({
      target: users.firebaseUid,
      set: { name: f.name, xp: f.xp, sparks: f.sparks, rank: f.rank },
    }).returning();
    friendIds.push(user.id);
    console.log(`  ${f.name} (${f.rank}, ${f.xp} XP)`);
  }

  const [riyaId, arjunId, nitilId, deepanId] = friendIds;

  // ============ HABITS FOR MAIN USER ============
  console.log("\nCreating habits for pranaov s...");

  const myHabits = [
    { name: "Solve 1 LeetCode", intensity: "moderate" as const, trackingMethod: "plugin" as const, pluginId: "leetcode", currentStreak: 21, longestStreak: 21, totalCompleted: 24, goalStage: "momentum" as const, redirectUrl: "https://leetcode.com/problemset/" },
    { name: "Morning run 5km", intensity: "intense" as const, trackingMethod: "plugin" as const, pluginId: "strava", currentStreak: 7, longestStreak: 12, totalCompleted: 15, goalStage: "foundation" as const, pluginGoal: { metric: "total_distance_km", operator: "gte" as const, value: 5 } },
    { name: "Duolingo Spanish", intensity: "light" as const, trackingMethod: "plugin" as const, pluginId: "duolingo", currentStreak: 45, longestStreak: 45, totalCompleted: 48, goalStage: "momentum" as const },
    { name: "Read 30 pages", intensity: "light" as const, trackingMethod: "manual" as const, currentStreak: 30, longestStreak: 30, totalCompleted: 35, goalStage: "momentum" as const },
    { name: "No doomscrolling", intensity: "moderate" as const, trackingMethod: "plugin" as const, pluginId: "screen_time", currentStreak: 5, longestStreak: 8, totalCompleted: 12, goalStage: "foundation" as const, pluginGoal: { metric: "screen_minutes", operator: "lte" as const, value: 120 } },
  ];

  const habitIds: string[] = [];
  for (const h of myHabits) {
    const [habit] = await db.insert(habits).values({
      userId: USER_ID,
      ...h,
      lastCompletedDate: dayjs().format("YYYY-MM-DD"),
      visibility: "full",
      isActive: true,
    } as any).returning();
    habitIds.push(habit.id);
    console.log(`  ${h.name} — streak ${h.currentStreak}, ${h.goalStage}`);
  }

  // ============ HABITS FOR FRIENDS ============
  console.log("\nCreating habits for friends...");

  const friendHabits: Array<{ userId: string; name: string; streak: number; pluginId?: string }> = [
    { userId: riyaId, name: "10k steps", streak: 35, pluginId: "google_fit" },
    { userId: riyaId, name: "Meditate 15 min", streak: 66 },
    { userId: riyaId, name: "Chess puzzles", streak: 12, pluginId: "chess_com" },
    { userId: arjunId, name: "Push-ups", streak: 3 },
    { userId: arjunId, name: "Journal", streak: 7 },
    { userId: nitilId, name: "GitHub commit", streak: 66, pluginId: "github" },
    { userId: nitilId, name: "LeetCode hard", streak: 45, pluginId: "leetcode" },
    { userId: nitilId, name: "Run 10km", streak: 21, pluginId: "strava" },
    { userId: deepanId, name: "Code 2 hours", streak: 14, pluginId: "wakapi" },
    { userId: deepanId, name: "Gym workout", streak: 10 },
  ];

  const allHabitIds: Array<{ id: string; userId: string; pluginId?: string | null }> = habitIds.map((id, i) => ({
    id, userId: USER_ID, pluginId: myHabits[i].pluginId || null,
  }));

  for (const fh of friendHabits) {
    const [h] = await db.insert(habits).values({
      userId: fh.userId,
      name: fh.name,
      intensity: "moderate",
      trackingMethod: fh.pluginId ? "plugin" : "manual",
      pluginId: fh.pluginId || null,
      currentStreak: fh.streak,
      longestStreak: fh.streak,
      totalCompleted: fh.streak + 3,
      goalStage: fh.streak >= 66 ? "formed" : fh.streak >= 21 ? "momentum" : fh.streak >= 10 ? "foundation" : "ignition",
      lastCompletedDate: dayjs().format("YYYY-MM-DD"),
      visibility: "full",
      isActive: true,
    } as any).returning();
    allHabitIds.push({ id: h.id, userId: fh.userId, pluginId: fh.pluginId || null });
  }
  console.log(`  Created ${friendHabits.length} habits for friends`);

  // ============ HABIT LOGS (30 days for all habits) ============
  console.log("\nGenerating 30 days of habit logs...");

  for (const h of allHabitIds) {
    const habit = await db.select().from(habits).where(eq(habits.id, h.id)).limit(1);
    const streak = habit[0]?.currentStreak || 0;

    for (let i = 0; i < 30; i++) {
      const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      const completed = i < streak || Math.random() > 0.15;
      const metrics: Record<string, any> = {};

      if (h.pluginId === "google_fit") metrics.steps = completed ? 10000 + Math.floor(Math.random() * 5000) : Math.floor(Math.random() * 8000);
      if (h.pluginId === "chess_com") metrics.games_today = completed ? 2 + Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2);
      if (h.pluginId === "leetcode") metrics.submissions_today = completed ? 1 + Math.floor(Math.random() * 3) : 0;
      if (h.pluginId === "github") metrics.total_events_today = completed ? 2 + Math.floor(Math.random() * 8) : 0;
      if (h.pluginId === "duolingo") metrics.streak = 45 - i;
      if (h.pluginId === "screen_time") metrics.screen_minutes = completed ? 60 + Math.floor(Math.random() * 50) : 130 + Math.floor(Math.random() * 60);
      if (h.pluginId === "strava") metrics.total_distance_km = completed ? 5 + Math.random() * 5 : Math.random() * 3;
      if (h.pluginId === "wakapi") metrics.totalMinutes = completed ? 120 + Math.floor(Math.random() * 60) : Math.floor(Math.random() * 60);

      await db.insert(habitLogs).values({
        habitId: h.id,
        userId: h.userId,
        date,
        completed,
        verificationSource: (h.pluginId as any) || "manual",
        pluginMetrics: Object.keys(metrics).length > 0 ? metrics : null,
        completedAt: completed ? dayjs().subtract(i, "day").hour(8 + Math.floor(Math.random() * 10)).toDate() : null,
        reflectionDifficulty: Math.random() > 0.5 ? 1 + Math.floor(Math.random() * 4) : null,
      }).onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.date],
        set: { completed, pluginMetrics: Object.keys(metrics).length > 0 ? metrics : null },
      });
    }
  }
  console.log(`  Generated logs for ${allHabitIds.length} habits × 30 days`);

  // ============ GROUP ============
  console.log("\nCreating group...");

  const [group] = await db.insert(groups).values({
    name: "Antichrist.exe 🔥",
    inviteCode: "VALENCE1",
    tier: "flame",
    currentStreak: 21,
    longestStreak: 21,
    totalLinks: 25,
    createdBy: USER_ID,
  }).returning();

  const allMembers = [USER_ID, ...friendIds];
  for (const [i, uid] of allMembers.entries()) {
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: uid,
      role: i === 0 ? "admin" : "member",
      lastActiveDate: dayjs().format("YYYY-MM-DD"),
      consistencyPoints: 50 + Math.floor(Math.random() * 200),
    });
  }
  console.log(`  Group: ${group.name} | flame tier | 21-day streak | 5 members`);

  // Chain links
  for (let i = 0; i < 30; i++) {
    const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    const pct = i < 21 ? (Math.random() > 0.25 ? 100 : 80) : (Math.random() > 0.4 ? 80 : 60);
    await db.insert(groupDayLinks).values({
      groupId: group.id, date,
      completionPercentage: pct,
      linkType: pct === 100 ? "gold" : pct >= 75 ? "silver" : "broken",
    }).onConflictDoUpdate({
      target: [groupDayLinks.groupId, groupDayLinks.date],
      set: { completionPercentage: pct },
    });
  }
  console.log("  30 days of chain links generated");

  // ============ FEED ============
  console.log("\nCreating feed items...");

  const feedData = [
    { actorId: nitilId, type: "completion" as const, data: { habitName: "GitHub commit", streak: 66, verifiedVia: "GitHub API" }, h: 1 },
    { actorId: riyaId, type: "goal_milestone" as const, data: { habitName: "Meditate 15 min", goalStage: "formed", message: "Riya graduated Meditation to Habit Formed — 66 days! 🧘" }, h: 2 },
    { actorId: USER_ID, type: "completion" as const, data: { habitName: "Solve 1 LeetCode", streak: 21, verifiedVia: "LeetCode API" }, h: 3 },
    { actorId: deepanId, type: "kudos" as const, data: { senderName: "Deepan", receiverName: "pranaov s", message: "Kudos for the 21-day LeetCode streak!" }, h: 3 },
    { actorId: null, type: "status_norm" as const, data: { message: "4/5 members completed all habits today — 80% group rate. Most of your group is staying consistent." }, h: 4 },
    { actorId: USER_ID, type: "nudge" as const, data: { senderName: "pranaov s", receiverName: "Arjun", message: "Arjun, it's 3pm — still time for push-ups before the evening fatigue hits 💪" }, h: 5 },
    { actorId: null, type: "group_link_gold" as const, data: { message: "Gold link forged! All 5 members completed yesterday. 21-day chain! 🔗", streak: 21 }, h: 10 },
    { actorId: riyaId, type: "completion" as const, data: { habitName: "10k steps", streak: 35, verifiedVia: "Google Fit", pluginMetrics: { steps: 12453 } }, h: 12 },
    { actorId: arjunId, type: "completion" as const, data: { habitName: "Push-ups", streak: 3 }, h: 14 },
    { actorId: nitilId, type: "rank_promotion" as const, data: { userName: "Nitil", oldRank: "gold", newRank: "platinum", message: "Nitil reached Platinum rank! 🏆" }, h: 48 },
    { actorId: null, type: "group_tier_change" as const, data: { oldTier: "ember", newTier: "flame", message: "Group reached Flame tier! 21-day streak unlocked group milestones 🔥" }, h: 72 },
  ];

  for (const f of feedData) {
    await db.insert(feedItems).values({
      groupId: group.id, actorId: f.actorId, type: f.type, data: f.data,
      createdAt: dayjs().subtract(f.h, "hour").toDate(),
    });
  }
  console.log(`  ${feedData.length} feed items`);

  // ============ NOTIFICATIONS ============
  console.log("\nCreating notifications...");

  const notifs = [
    { type: "morning_activation" as const, title: "Good Morning! ☀️", body: "Day 22 of LeetCode. You're in the top 5% of users who make it past 21 days. The streak is calling.", h: 2 },
    { type: "friend_nudge" as const, title: "Deepan nudged you", body: "Hey, you mentioned Thursdays are tough — try knocking out the run before lunch while you've got energy. 4 of us already done today 🏃", h: 5 },
    { type: "kudos_received" as const, title: "Riya gave you kudos! 🎉", body: "Riya gave you kudos for your 21-day LeetCode streak!", h: 8 },
    { type: "streak_milestone" as const, title: "Momentum Milestone! 🔥", body: "You hit 21 days on 'Solve 1 LeetCode' — research says 21 days builds the neural pathway. You're past the hard part.", h: 24 },
    { type: "preemptive_warning" as const, title: "Heads up! ⚡", body: "You usually miss your run on Fridays (60% miss rate). Want to knock it out before lunch today?", h: 30 },
    { type: "reflection_prompt" as const, title: "Evening Reflection 🌙", body: "How did today go? Quick 1-tap reflection", h: 28 },
    { type: "kudos_received" as const, title: "Nitil gave you kudos!", body: "Nitil gave you kudos for completing Morning run 5km!", h: 48 },
  ];

  for (const n of notifs) {
    await db.insert(notifications).values({
      userId: USER_ID, type: n.type, title: n.title, body: n.body, data: {},
      sentAt: dayjs().subtract(n.h, "hour").toDate(),
    });
  }
  console.log(`  ${notifs.length} notifications`);

  // ============ WEEKLY LEADERBOARD ============
  console.log("\nCreating leaderboard...");

  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");
  const scores = [
    { userId: nitilId, name: "Nitil", score: 48, rank: 1 },
    { userId: riyaId, name: "Riya", score: 42, rank: 2 },
    { userId: USER_ID, name: "pranaov s", score: 38, rank: 3 },
    { userId: deepanId, name: "Deepan", score: 30, rank: 4 },
    { userId: arjunId, name: "Arjun", score: 18, rank: 5 },
  ];

  for (const s of scores) {
    await db.insert(weeklyScores).values({
      userId: s.userId, groupId: group.id, weekStartDate: weekStart,
      contributionScore: s.score, habitsCompleted: Math.floor(s.score * 0.6),
      goldLinkContributions: 5, kudosReceived: Math.floor(Math.random() * 5),
      rankInGroup: s.rank,
    }).onConflictDoUpdate({
      target: [weeklyScores.userId, weeklyScores.groupId, weeklyScores.weekStartDate],
      set: { contributionScore: s.score, rankInGroup: s.rank },
    });
    console.log(`  #${s.rank} ${s.name} — score ${s.score}`);
  }

  // ============ PLUGIN CONNECTIONS ============
  console.log("\nConnecting plugins...");

  const plugins = [
    { pluginId: "leetcode", credentials: { username: "tourist" } },
    { pluginId: "duolingo", credentials: { username: "chanderrrr" } },
    { pluginId: "screen_time", credentials: {} },
  ];

  for (const p of plugins) {
    await db.insert(integrationConnections).values({
      userId: USER_ID, pluginId: p.pluginId, credentials: p.credentials,
      status: "active", lastSyncedAt: new Date(),
    }).onConflictDoUpdate({
      target: [integrationConnections.userId, integrationConnections.pluginId],
      set: { status: "active", lastSyncedAt: new Date() },
    });
    console.log(`  ${p.pluginId} connected`);
  }

  // ============ PURCHASED ITEMS ============
  console.log("\nPurchasing cosmetics...");
  for (const item of ["flame-blue", "daybreak", "neon-terminal"]) {
    await db.insert(userItems).values({ userId: USER_ID, itemId: item }).onConflictDoNothing();
    console.log(`  Bought: ${item}`);
  }

  console.log("\n========================================");
  console.log("  DEMO DATA READY FOR valence@pranaovs.me");
  console.log("========================================");
  console.log(`  User ID: ${USER_ID}`);
  console.log(`  Profile: Gold rank, 2450 XP, 1200 Sparks`);
  console.log(`  Habits: 5 (LeetCode 21d, Run 7d, Duolingo 45d, Reading 30d, Screen Time 5d)`);
  console.log(`  Group: "Antichrist.exe 🔥" — Flame tier, 21-day streak, 5 members`);
  console.log(`  Feed: 11 items (completions, milestones, nudges, gold links)`);
  console.log(`  Notifications: 7 (morning, nudge, kudos, milestone, preemptive, reflection)`);
  console.log(`  Leaderboard: #3 this week`);
  console.log(`  Plugins: LeetCode, Duolingo, Screen Time connected`);

  process.exit(0);
}

seed().catch((err) => { console.error("Failed:", err); process.exit(1); });
