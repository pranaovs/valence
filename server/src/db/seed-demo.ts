import { db } from "./client.js";
import { users } from "./schema/users.js";
import { habits } from "./schema/habits.js";
import { habitLogs } from "./schema/habit-logs.js";
import { missLogs } from "./schema/miss-logs.js";
import { groups, groupMembers, groupDayLinks } from "./schema/groups.js";
import { nudges, kudos } from "./schema/social.js";
import { feedItems } from "./schema/feed.js";
import { notifications } from "./schema/notifications.js";
import { weeklyScores } from "./schema/weekly-scores.js";
import { shopItems, userItems } from "./schema/shop.js";
import { integrationConnections } from "./schema/integrations.js";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";

async function seedDemo() {
  console.log("Seeding demo data for video recording...\n");

  // ============ USERS ============
  console.log("Creating 5 demo users...");

  const demoUsers = [
    {
      firebaseUid: "demo-deepan",
      email: "deepan@valance.app",
      name: "Deepan",
      xp: 2450,
      sparks: 1200,
      rank: "gold" as const,
      personaType: "achiever" as const,
      timezone: "Asia/Kolkata",
      equipped: {
        theme: "nocturnal", flame: "flame-blue", animation: "default",
        card_style: "default", font: "default", pattern: "none", icon: "default",
        profile_frame: null, profile_banner: null, party_badge: null,
        celebration: "default", milestone_card: "default", sound: "default",
        freeze_animation: "default", summary_style: "default", party_entrance: "default",
        name_color: null,
      },
    },
    {
      firebaseUid: "demo-pranaov",
      email: "pranaov@valance.app",
      name: "Pranaov",
      xp: 1800,
      sparks: 900,
      rank: "silver" as const,
      personaType: "socialiser" as const,
      timezone: "Asia/Kolkata",
      equipped: {
        theme: "nocturnal", flame: "default", animation: "default",
        card_style: "default", font: "default", pattern: "none", icon: "default",
        profile_frame: null, profile_banner: null, party_badge: null,
        celebration: "default", milestone_card: "default", sound: "default",
        freeze_animation: "default", summary_style: "default", party_entrance: "default",
        name_color: null,
      },
    },
    {
      firebaseUid: "demo-riya",
      email: "riya@valance.app",
      name: "Riya",
      xp: 3100,
      sparks: 1500,
      rank: "gold" as const,
      personaType: "achiever" as const,
      timezone: "Asia/Kolkata",
      equipped: {
        theme: "nocturnal", flame: "flame-golden", animation: "default",
        card_style: "default", font: "default", pattern: "none", icon: "default",
        profile_frame: null, profile_banner: null, party_badge: null,
        celebration: "default", milestone_card: "default", sound: "default",
        freeze_animation: "default", summary_style: "default", party_entrance: "default",
        name_color: null,
      },
    },
    {
      firebaseUid: "demo-arjun",
      email: "arjun@valance.app",
      name: "Arjun",
      xp: 950,
      sparks: 400,
      rank: "silver" as const,
      personaType: "general" as const,
      timezone: "Asia/Kolkata",
      equipped: {
        theme: "nocturnal", flame: "default", animation: "default",
        card_style: "default", font: "default", pattern: "none", icon: "default",
        profile_frame: null, profile_banner: null, party_badge: null,
        celebration: "default", milestone_card: "default", sound: "default",
        freeze_animation: "default", summary_style: "default", party_entrance: "default",
        name_color: null,
      },
    },
    {
      firebaseUid: "demo-nitil",
      email: "nitil@valance.app",
      name: "Nitil",
      xp: 5200,
      sparks: 2000,
      rank: "platinum" as const,
      personaType: "achiever" as const,
      timezone: "Asia/Kolkata",
      equipped: {
        theme: "neon-terminal", flame: "flame-lightning", animation: "default",
        card_style: "default", font: "default", pattern: "none", icon: "default",
        profile_frame: null, profile_banner: null, party_badge: null,
        celebration: "default", milestone_card: "default", sound: "default",
        freeze_animation: "default", summary_style: "default", party_entrance: "default",
        name_color: null,
      },
    },
  ];

  const insertedUsers = [];
  for (const u of demoUsers) {
    const [user] = await db.insert(users).values(u)
      .onConflictDoUpdate({ target: users.firebaseUid, set: { name: u.name, xp: u.xp, sparks: u.sparks, rank: u.rank } })
      .returning();
    insertedUsers.push(user);
    console.log(`  ${user.name} (${user.rank}, ${user.xp} XP)`);
  }

  const [deepan, pranaov, riya, arjun, nitil] = insertedUsers;

  // ============ HABITS ============
  console.log("\nCreating habits...");

  const habitData = [
    // Deepan — coding focused
    { userId: deepan.id, name: "Solve 1 LeetCode", intensity: "moderate" as const, trackingMethod: "plugin" as const, pluginId: "leetcode", currentStreak: 21, longestStreak: 21, totalCompleted: 24, goalStage: "momentum" as const, redirectUrl: "https://leetcode.com/problemset/" },
    { userId: deepan.id, name: "Code for 2 hours", intensity: "intense" as const, trackingMethod: "plugin" as const, pluginId: "wakapi", currentStreak: 14, longestStreak: 18, totalCompleted: 30, goalStage: "momentum" as const, pluginGoal: { metric: "totalMinutes", operator: "gte" as const, value: 120 } },
    { userId: deepan.id, name: "Morning run 5km", intensity: "intense" as const, trackingMethod: "plugin" as const, pluginId: "strava", currentStreak: 7, longestStreak: 12, totalCompleted: 15, goalStage: "foundation" as const, pluginGoal: { metric: "total_distance_km", operator: "gte" as const, value: 5 }, redirectUrl: "https://strava.com" },
    { userId: deepan.id, name: "Read 30 pages", intensity: "light" as const, trackingMethod: "manual" as const, currentStreak: 30, longestStreak: 30, totalCompleted: 35, goalStage: "momentum" as const },
    // Pranaov — balanced
    { userId: pranaov.id, name: "Gym workout", intensity: "intense" as const, trackingMethod: "manual" as const, currentStreak: 10, longestStreak: 14, totalCompleted: 18, goalStage: "foundation" as const, frequencyRule: { type: "per_week" as const, target: 4 } },
    { userId: pranaov.id, name: "Duolingo Spanish", intensity: "light" as const, trackingMethod: "plugin" as const, pluginId: "duolingo", currentStreak: 45, longestStreak: 45, totalCompleted: 48, goalStage: "momentum" as const },
    { userId: pranaov.id, name: "No doomscrolling", intensity: "moderate" as const, trackingMethod: "plugin" as const, pluginId: "screen_time", currentStreak: 5, longestStreak: 8, totalCompleted: 12, goalStage: "foundation" as const, pluginGoal: { metric: "screen_minutes", operator: "lte" as const, value: 120 } },
    // Riya — fitness + learning
    { userId: riya.id, name: "10k steps", intensity: "moderate" as const, trackingMethod: "plugin" as const, pluginId: "google_fit", currentStreak: 35, longestStreak: 35, totalCompleted: 40, goalStage: "momentum" as const, pluginGoal: { metric: "steps", operator: "gte" as const, value: 10000 } },
    { userId: riya.id, name: "Meditate 15 min", intensity: "light" as const, trackingMethod: "manual" as const, currentStreak: 66, longestStreak: 66, totalCompleted: 70, goalStage: "formed" as const },
    { userId: riya.id, name: "Chess puzzles", intensity: "light" as const, trackingMethod: "plugin" as const, pluginId: "chess_com", currentStreak: 12, longestStreak: 15, totalCompleted: 20, goalStage: "foundation" as const, pluginGoal: { metric: "games_today", operator: "gte" as const, value: 2 } },
    // Arjun — just starting
    { userId: arjun.id, name: "Push-ups", intensity: "light" as const, trackingMethod: "manual" as const, currentStreak: 3, longestStreak: 5, totalCompleted: 8, goalStage: "ignition" as const },
    { userId: arjun.id, name: "Journal", intensity: "light" as const, trackingMethod: "manual" as const, currentStreak: 7, longestStreak: 7, totalCompleted: 9, goalStage: "foundation" as const },
    // Nitil — power user
    { userId: nitil.id, name: "GitHub commit", intensity: "moderate" as const, trackingMethod: "plugin" as const, pluginId: "github", currentStreak: 66, longestStreak: 66, totalCompleted: 80, goalStage: "formed" as const },
    { userId: nitil.id, name: "LeetCode hard", intensity: "intense" as const, trackingMethod: "plugin" as const, pluginId: "leetcode", currentStreak: 45, longestStreak: 50, totalCompleted: 55, goalStage: "momentum" as const },
    { userId: nitil.id, name: "Run 10km", intensity: "intense" as const, trackingMethod: "plugin" as const, pluginId: "strava", currentStreak: 21, longestStreak: 25, totalCompleted: 30, goalStage: "momentum" as const, pluginGoal: { metric: "total_distance_km", operator: "gte" as const, value: 10 } },
    { userId: nitil.id, name: "Read 1 hour", intensity: "moderate" as const, trackingMethod: "manual" as const, currentStreak: 100, longestStreak: 100, totalCompleted: 110, goalStage: "formed" as const },
  ];

  const insertedHabits = [];
  for (const h of habitData) {
    const [habit] = await db.insert(habits).values({
      ...h,
      lastCompletedDate: dayjs().format("YYYY-MM-DD"),
      visibility: "full",
      isActive: true,
    } as any).returning();
    insertedHabits.push(habit);
    console.log(`  ${h.name} (${demoUsers.find(u => insertedUsers.find(iu => iu.id === h.userId)?.name)?.name || '?'}) — streak ${h.currentStreak}`);
  }

  // ============ HABIT LOGS (last 30 days) ============
  console.log("\nGenerating 30 days of habit logs...");

  for (const habit of insertedHabits) {
    const streak = (habit as any).currentStreak || 0;
    for (let i = 0; i < 30; i++) {
      const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      // Complete if within streak, or random 80% chance before streak
      const completed = i < streak || Math.random() > 0.2;
      const metrics: Record<string, any> = {};

      if ((habit as any).pluginId === "google_fit") {
        metrics.steps = completed ? 10000 + Math.floor(Math.random() * 5000) : Math.floor(Math.random() * 8000);
        metrics.activity_minutes = completed ? 30 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 15);
      } else if ((habit as any).pluginId === "chess_com") {
        metrics.games_today = completed ? 2 + Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2);
      } else if ((habit as any).pluginId === "leetcode") {
        metrics.submissions_today = completed ? 1 + Math.floor(Math.random() * 3) : 0;
      } else if ((habit as any).pluginId === "github") {
        metrics.total_events_today = completed ? 2 + Math.floor(Math.random() * 8) : 0;
        metrics.push_events_today = completed ? 1 + Math.floor(Math.random() * 3) : 0;
      } else if ((habit as any).pluginId === "duolingo") {
        metrics.streak = 45 - i;
        metrics.totalXp = 15000 + (30 - i) * 50;
      } else if ((habit as any).pluginId === "screen_time") {
        metrics.screen_minutes = completed ? 60 + Math.floor(Math.random() * 50) : 130 + Math.floor(Math.random() * 60);
      }

      await db.insert(habitLogs).values({
        habitId: habit.id,
        userId: (habit as any).userId,
        date,
        completed,
        verificationSource: (habit as any).pluginId || "manual",
        pluginMetrics: Object.keys(metrics).length > 0 ? metrics : null,
        completedAt: completed ? dayjs().subtract(i, "day").hour(10 + Math.floor(Math.random() * 8)).toDate() : null,
        reflectionDifficulty: completed ? 1 + Math.floor(Math.random() * 3) : Math.random() > 0.5 ? 4 + Math.floor(Math.random() * 2) : null,
      }).onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.date],
        set: { completed, pluginMetrics: Object.keys(metrics).length > 0 ? metrics : null },
      });
    }
  }
  console.log(`  Generated logs for ${insertedHabits.length} habits × 30 days`);

  // ============ GROUP ============
  console.log("\nCreating demo group...");

  const [group] = await db.insert(groups).values({
    name: "Antichrist.exe",
    inviteCode: "DEMO2026",
    tier: "flame",
    currentStreak: 21,
    longestStreak: 21,
    totalLinks: 25,
    createdBy: deepan.id,
  }).returning();

  for (const [i, u] of insertedUsers.entries()) {
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: u.id,
      role: i === 0 ? "admin" : "member",
      lastActiveDate: dayjs().format("YYYY-MM-DD"),
      consistencyPoints: 50 + Math.floor(Math.random() * 200),
    });
  }
  console.log(`  Group: ${group.name} (${group.tier}, streak ${group.currentStreak})`);

  // ============ GROUP CHAIN LINKS (last 30 days) ============
  console.log("  Generating chain links...");

  for (let i = 0; i < 30; i++) {
    const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    const pct = i < 21 ? (Math.random() > 0.3 ? 100 : 80) : (Math.random() > 0.5 ? 80 : 60);
    const linkType = pct === 100 ? "gold" : pct >= 75 ? "silver" : "broken";
    await db.insert(groupDayLinks).values({
      groupId: group.id,
      date,
      completionPercentage: pct,
      linkType,
    }).onConflictDoUpdate({
      target: [groupDayLinks.groupId, groupDayLinks.date],
      set: { completionPercentage: pct, linkType },
    });
  }

  // ============ FEED ITEMS ============
  console.log("  Generating feed items...");

  const feedData = [
    { actorId: nitil.id, type: "completion" as const, data: { habitName: "GitHub commit", streak: 66, verifiedVia: "GitHub" }, hoursAgo: 1 },
    { actorId: riya.id, type: "streak_milestone" as const, data: { habitName: "Meditate 15 min", milestone: 66, message: "Riya hit 66 days of meditation — Habit Formed!" }, hoursAgo: 2 },
    { actorId: deepan.id, type: "completion" as const, data: { habitName: "Solve 1 LeetCode", streak: 21, verifiedVia: "LeetCode" }, hoursAgo: 3 },
    { actorId: pranaov.id, type: "kudos" as const, data: { senderName: "Pranaov", receiverName: "Riya", message: "Kudos for the 66-day milestone!" }, hoursAgo: 3 },
    { actorId: null, type: "status_norm" as const, data: { message: "4/5 members completed all habits today — 80% group completion rate." }, hoursAgo: 4 },
    { actorId: deepan.id, type: "nudge" as const, data: { senderName: "Deepan", receiverName: "Arjun", message: "Arjun, it's almost 3pm — still time to knock out those push-ups before the evening fatigue hits." }, hoursAgo: 5 },
    { actorId: null, type: "group_link_gold" as const, data: { message: "Gold link forged! All 5 members completed yesterday.", streak: 21 }, hoursAgo: 10 },
    { actorId: arjun.id, type: "completion" as const, data: { habitName: "Push-ups", streak: 3 }, hoursAgo: 12 },
    { actorId: riya.id, type: "goal_milestone" as const, data: { habitName: "Meditate 15 min", goalStage: "formed", message: "Riya graduated 'Meditate 15 min' to Habit Formed after 66 days!" }, hoursAgo: 24 },
    { actorId: nitil.id, type: "rank_promotion" as const, data: { userName: "Nitil", oldRank: "gold", newRank: "platinum" }, hoursAgo: 48 },
  ];

  for (const f of feedData) {
    await db.insert(feedItems).values({
      groupId: group.id,
      actorId: f.actorId,
      type: f.type,
      data: f.data,
      createdAt: dayjs().subtract(f.hoursAgo, "hour").toDate(),
    });
  }

  // ============ NOTIFICATIONS ============
  console.log("  Generating notifications for Deepan...");

  const notifData = [
    { type: "morning_activation" as const, title: "Good Morning!", body: "Day 22 of LeetCode. You're in the top 5% of users who make it past 21 days. Let's extend that lead.", hoursAgo: 2 },
    { type: "friend_nudge" as const, title: "Pranaov nudged you", body: "Deepan, you mentioned Thursdays are tough — try knocking out the run before lunch while you've got energy.", hoursAgo: 5 },
    { type: "kudos_received" as const, title: "Riya gave you kudos!", body: "Riya gave you kudos for your 21-day LeetCode streak!", hoursAgo: 8 },
    { type: "streak_milestone" as const, title: "Streak Milestone!", body: "You hit 21 days on 'Solve 1 LeetCode' — Momentum milestone reached!", hoursAgo: 24 },
    { type: "reflection_prompt" as const, title: "Evening Reflection", body: "How did today go? Quick 1-tap reflection", hoursAgo: 28 },
  ];

  for (const n of notifData) {
    await db.insert(notifications).values({
      userId: deepan.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: {},
      sentAt: dayjs().subtract(n.hoursAgo, "hour").toDate(),
    });
  }

  // ============ WEEKLY SCORES ============
  console.log("  Generating weekly leaderboard...");

  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");
  const scores = [
    { userId: nitil.id, score: 48, habitsCompleted: 28, gold: 5, kudos: 3, rank: 1 },
    { userId: riya.id, score: 42, habitsCompleted: 21, gold: 5, kudos: 4, rank: 2 },
    { userId: deepan.id, score: 38, habitsCompleted: 20, gold: 5, kudos: 2, rank: 3 },
    { userId: pranaov.id, score: 30, habitsCompleted: 15, gold: 4, kudos: 3, rank: 4 },
    { userId: arjun.id, score: 18, habitsCompleted: 10, gold: 3, kudos: 1, rank: 5 },
  ];

  for (const s of scores) {
    await db.insert(weeklyScores).values({
      userId: s.userId,
      groupId: group.id,
      weekStartDate: weekStart,
      contributionScore: s.score,
      habitsCompleted: s.habitsCompleted,
      goldLinkContributions: s.gold,
      kudosReceived: s.kudos,
      rankInGroup: s.rank,
    }).onConflictDoUpdate({
      target: [weeklyScores.userId, weeklyScores.groupId, weeklyScores.weekStartDate],
      set: { contributionScore: s.score, rankInGroup: s.rank },
    });
  }

  // ============ PLUGIN CONNECTIONS ============
  console.log("  Connecting plugins...");

  const connections = [
    { userId: deepan.id, pluginId: "leetcode", credentials: { username: "tourist" } },
    { userId: deepan.id, pluginId: "github", credentials: { username: "torvalds" } },
    { userId: riya.id, pluginId: "google_fit", credentials: { access_token: "demo" } },
    { userId: riya.id, pluginId: "chess_com", credentials: { username: "deepanalve" } },
    { userId: pranaov.id, pluginId: "duolingo", credentials: { username: "chanderrrr" } },
    { userId: nitil.id, pluginId: "github", credentials: { username: "torvalds" } },
    { userId: nitil.id, pluginId: "leetcode", credentials: { username: "tourist" } },
  ];

  for (const c of connections) {
    await db.insert(integrationConnections).values({
      ...c,
      status: "active",
      lastSyncedAt: new Date(),
    }).onConflictDoUpdate({
      target: [integrationConnections.userId, integrationConnections.pluginId],
      set: { status: "active", lastSyncedAt: new Date() },
    });
  }

  // ============ PURCHASED ITEMS ============
  console.log("  Setting up purchased cosmetics...");

  const purchases = [
    { userId: deepan.id, items: ["flame-blue", "daybreak", "neon-terminal"] },
    { userId: nitil.id, items: ["flame-lightning", "neon-terminal", "ocean-depth", "frame-gold"] },
    { userId: riya.id, items: ["flame-golden", "sakura", "forest"] },
  ];

  for (const p of purchases) {
    for (const itemId of p.items) {
      await db.insert(userItems).values({ userId: p.userId, itemId })
        .onConflictDoNothing();
    }
  }

  console.log("\n========================================");
  console.log("  DEMO DATA SEEDED SUCCESSFULLY");
  console.log("========================================");
  console.log(`\n  Users: 5 (Deepan, Pranaov, Riya, Arjun, Nitil)`);
  console.log(`  Habits: ${insertedHabits.length} across all users`);
  console.log(`  Habit logs: ${insertedHabits.length} × 30 days`);
  console.log(`  Group: "Antichrist.exe" (flame tier, 21-day streak)`);
  console.log(`  Chain links: 30 days`);
  console.log(`  Feed items: ${feedData.length}`);
  console.log(`  Notifications: ${notifData.length}`);
  console.log(`  Plugin connections: ${connections.length}`);
  console.log(`\n  Demo user IDs:`);
  for (const u of insertedUsers) {
    console.log(`    ${u.name}: ${u.id}`);
  }
  console.log(`\n  Use X-Dev-User-Id header with any ID above to test.`);

  process.exit(0);
}

seedDemo().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
