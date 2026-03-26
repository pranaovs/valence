import { db } from "./client.js";
import { users } from "./schema/users.js";
import { habits } from "./schema/habits.js";
import { habitLogs } from "./schema/habit-logs.js";
import { groups, groupMembers, groupDayLinks } from "./schema/groups.js";
import { feedItems } from "./schema/feed.js";
import { notifications } from "./schema/notifications.js";
import { weeklyScores } from "./schema/weekly-scores.js";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";

const GROUP_ID = "7eedf0b2-2b50-4961-975a-d284cfa677f9";
const PRANAOV_ID = "48c84a2d-698c-4fbb-8559-6c57cf8dd085";
const NITIL_ID = "7273147d-d2b4-4f7b-a59e-57680060ec3b";

async function seed() {
  console.log("Populating SNUC group with demo data...\n");

  // ============ UPDATE GROUP ============
  console.log("Updating group stats...");
  await db.update(groups).set({
    tier: "flame",
    currentStreak: 21,
    longestStreak: 21,
    totalLinks: 28,
  }).where(eq(groups.id, GROUP_ID));
  console.log("  SNUC → Flame tier, 21-day streak");

  // ============ ADD PRANAOV TO GROUP ============
  console.log("\nAdding pranaov s to group...");
  await db.insert(groupMembers).values({
    groupId: GROUP_ID,
    userId: PRANAOV_ID,
    role: "member",
    lastActiveDate: dayjs().format("YYYY-MM-DD"),
    consistencyPoints: 150,
  }).onConflictDoNothing();

  // ============ CREATE MORE MEMBERS ============
  console.log("Adding demo friends...");

  // Find or create demo friends
  const friends = [
    { firebaseUid: "snuc-riya", email: "riya@snuc.app", name: "Riya", xp: 3100, rank: "gold" as const },
    { firebaseUid: "snuc-arjun", email: "arjun@snuc.app", name: "Arjun", xp: 950, rank: "silver" as const },
    { firebaseUid: "snuc-deepan", email: "deepan@snuc.app", name: "Deepan", xp: 1800, rank: "silver" as const },
  ];

  const friendIds: string[] = [];
  for (const f of friends) {
    const [user] = await db.insert(users).values({
      ...f,
      sparks: Math.floor(f.xp * 0.5),
      personaType: "general",
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
      set: { name: f.name, xp: f.xp, rank: f.rank },
    }).returning();
    friendIds.push(user.id);

    await db.insert(groupMembers).values({
      groupId: GROUP_ID,
      userId: user.id,
      role: "member",
      lastActiveDate: dayjs().format("YYYY-MM-DD"),
      consistencyPoints: 50 + Math.floor(Math.random() * 150),
    }).onConflictDoNothing();

    console.log(`  ${f.name} added`);
  }

  // Update Nitil's lastActiveDate
  await db.update(groupMembers).set({
    lastActiveDate: dayjs().format("YYYY-MM-DD"),
    consistencyPoints: 200,
  }).where(eq(groupMembers.userId, NITIL_ID));

  const allMemberIds = [NITIL_ID, PRANAOV_ID, ...friendIds];
  console.log(`  Total members: ${allMemberIds.length}`);

  // ============ HABITS FOR FRIENDS (if they don't have any) ============
  console.log("\nCreating habits for friends...");

  const friendHabitsMap: Record<string, Array<{ name: string; streak: number; pluginId?: string }>> = {};
  friendHabitsMap[friendIds[0]] = [ // Riya
    { name: "10k steps", streak: 35, pluginId: "google_fit" },
    { name: "Meditate", streak: 66 },
  ];
  friendHabitsMap[friendIds[1]] = [ // Arjun
    { name: "Push-ups", streak: 3 },
    { name: "Journal", streak: 7 },
  ];
  friendHabitsMap[friendIds[2]] = [ // Deepan
    { name: "Code 2 hours", streak: 14, pluginId: "wakapi" },
    { name: "Gym", streak: 10 },
  ];

  for (const [userId, habitList] of Object.entries(friendHabitsMap)) {
    for (const h of habitList) {
      const [habit] = await db.insert(habits).values({
        userId,
        name: h.name,
        intensity: "moderate",
        trackingMethod: h.pluginId ? "plugin" : "manual",
        pluginId: h.pluginId || null,
        currentStreak: h.streak,
        longestStreak: h.streak,
        totalCompleted: h.streak + 5,
        goalStage: h.streak >= 66 ? "formed" : h.streak >= 21 ? "momentum" : h.streak >= 10 ? "foundation" : "ignition",
        lastCompletedDate: dayjs().format("YYYY-MM-DD"),
        visibility: "full",
        isActive: true,
      } as any).returning();

      // Generate 30 days of logs
      for (let i = 0; i < 30; i++) {
        const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
        const completed = i < h.streak || Math.random() > 0.15;
        await db.insert(habitLogs).values({
          habitId: habit.id, userId, date, completed,
          verificationSource: (h.pluginId as any) || "manual",
          completedAt: completed ? dayjs().subtract(i, "day").hour(9 + Math.floor(Math.random() * 8)).toDate() : null,
        }).onConflictDoUpdate({
          target: [habitLogs.habitId, habitLogs.date],
          set: { completed },
        });
      }
    }
  }

  // ============ CHAIN LINKS ============
  console.log("\nGenerating 30 days of chain links...");

  for (let i = 0; i < 30; i++) {
    const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    const pct = i < 21 ? (Math.random() > 0.2 ? 100 : 80) : (Math.random() > 0.4 ? 80 : 60);
    await db.insert(groupDayLinks).values({
      groupId: GROUP_ID, date,
      completionPercentage: pct,
      linkType: pct === 100 ? "gold" : pct >= 75 ? "silver" : "broken",
    }).onConflictDoUpdate({
      target: [groupDayLinks.groupId, groupDayLinks.date],
      set: { completionPercentage: pct, linkType: pct === 100 ? "gold" : pct >= 75 ? "silver" : "broken" },
    });
  }

  // ============ FEED ============
  console.log("Creating feed items...");

  const [riyaId, arjunId, deepanId] = friendIds;

  const feedData = [
    { actorId: NITIL_ID, type: "completion" as const, data: { habitName: "GitHub commit", streak: 66, verifiedVia: "GitHub API" }, h: 1 },
    { actorId: riyaId, type: "goal_milestone" as const, data: { habitName: "Meditate", goalStage: "formed", message: "Riya graduated Meditation to Habit Formed — 66 days! 🧘" }, h: 2 },
    { actorId: PRANAOV_ID, type: "completion" as const, data: { habitName: "Solve 1 LeetCode", streak: 21, verifiedVia: "LeetCode API" }, h: 3 },
    { actorId: deepanId, type: "kudos" as const, data: { senderName: "Deepan", receiverName: "pranaov s", message: "Kudos for the 21-day streak!" }, h: 4 },
    { actorId: null, type: "status_norm" as const, data: { message: "4/5 members completed all habits today — 80% group completion." }, h: 5 },
    { actorId: PRANAOV_ID, type: "nudge" as const, data: { senderName: "pranaov s", receiverName: "Arjun", message: "Arjun, still time for push-ups before evening 💪" }, h: 6 },
    { actorId: null, type: "group_link_gold" as const, data: { message: "Gold link forged! All 5 members completed. Chain: 21 days 🔗" }, h: 10 },
    { actorId: riyaId, type: "completion" as const, data: { habitName: "10k steps", streak: 35, verifiedVia: "Google Fit", pluginMetrics: { steps: 12453 } }, h: 14 },
    { actorId: arjunId, type: "completion" as const, data: { habitName: "Push-ups", streak: 3 }, h: 16 },
    { actorId: null, type: "group_tier_change" as const, data: { oldTier: "ember", newTier: "flame", message: "SNUC reached Flame tier! 🔥" }, h: 72 },
    { actorId: PRANAOV_ID, type: "perfect_day" as const, data: { userName: "pranaov s", message: "pranaov s completed all habits — Perfect Day! ⭐" }, h: 24 },
  ];

  for (const f of feedData) {
    await db.insert(feedItems).values({
      groupId: GROUP_ID, actorId: f.actorId, type: f.type, data: f.data,
      createdAt: dayjs().subtract(f.h, "hour").toDate(),
    });
  }
  console.log(`  ${feedData.length} feed items`);

  // ============ WEEKLY LEADERBOARD ============
  console.log("\nCreating leaderboard...");

  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");
  const scores = [
    { userId: NITIL_ID, score: 52, rank: 1 },
    { userId: riyaId, score: 44, rank: 2 },
    { userId: PRANAOV_ID, score: 38, rank: 3 },
    { userId: deepanId, score: 28, rank: 4 },
    { userId: arjunId, score: 15, rank: 5 },
  ];

  for (const s of scores) {
    await db.insert(weeklyScores).values({
      userId: s.userId, groupId: GROUP_ID, weekStartDate: weekStart,
      contributionScore: s.score, habitsCompleted: Math.floor(s.score * 0.6),
      goldLinkContributions: 4, kudosReceived: Math.floor(Math.random() * 5),
      rankInGroup: s.rank,
    }).onConflictDoUpdate({
      target: [weeklyScores.userId, weeklyScores.groupId, weeklyScores.weekStartDate],
      set: { contributionScore: s.score, rankInGroup: s.rank },
    });
  }

  console.log("\n========================================");
  console.log("  SNUC GROUP DEMO DATA READY");
  console.log("========================================");
  console.log("  Group: SNUC | Flame tier | 21-day streak");
  console.log("  Members: Nitil (#1), Riya (#2), pranaov s (#3), Deepan (#4), Arjun (#5)");
  console.log("  Feed: 11 items");
  console.log("  Chain links: 30 days (gold/silver/broken mix)");

  process.exit(0);
}

seed().catch((err) => { console.error("Failed:", err); process.exit(1); });
