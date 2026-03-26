import { Hono } from "hono";
import { z } from "zod";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { habits } from "../db/schema/habits.js";
import { habitLogs } from "../db/schema/habit-logs.js";
import { feedItems } from "../db/schema/feed.js";
import { groupMembers } from "../db/schema/groups.js";
import { weeklyScores } from "../db/schema/weekly-scores.js";
import { users } from "../db/schema/users.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, error } from "../lib/response.js";
import { today, getWeekStart, MAX_ACTIVE_HABITS } from "../lib/helpers.js";
import { completeHabit, missHabit } from "../services/streak.service.js";
import {
  awardCompletion,
  awardPerfectDay,
  awardStreakMilestone,
} from "../services/points.service.js";
import dayjs from "dayjs";
import { isFrequencyGoalMet, isHabitDueToday } from "../services/frequency.service.js";

export const habitsRoutes = new Hono();

habitsRoutes.use("*", authMiddleware);

// ── Schemas ──────────────────────────────────────────────────

const frequencyRuleSchema = z.object({
  type: z.enum(["daily", "rolling_window", "per_week", "per_month"]),
  target: z.number().int().min(1).optional(),
  window: z.number().int().min(1).optional(),
}).refine(
  (rule) => {
    if (rule.type === "rolling_window") return rule.target !== undefined && rule.window !== undefined;
    if (rule.type === "per_week" || rule.type === "per_month") return rule.target !== undefined;
    return true;
  },
  { message: "rolling_window requires target+window, per_week/per_month require target" }
);

const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
  intensity: z.enum(["light", "moderate", "intense"]).default("moderate"),
  tracking_method: z.enum(["plugin", "manual"]).default("manual"),
  plugin_id: z.string().max(50).optional(),
  plugin_goal: z.object({
    metric: z.string().min(1).max(50),
    operator: z.enum(["gte", "lte", "eq"]),
    value: z.number(),
  }).optional(),
  redirect_url: z.string().max(500).optional(),
  visibility: z.enum(["full", "minimal"]).default("full"),
  frequency_rule: frequencyRuleSchema.default({ type: "daily" }),
});

const updateHabitSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  intensity: z.enum(["light", "moderate", "intense"]).optional(),
  redirect_url: z.string().max(500).nullable().optional(),
  visibility: z.enum(["full", "minimal"]).optional(),
  frequency_rule: frequencyRuleSchema.optional(),
  plugin_goal: z.object({
    metric: z.string().min(1).max(50),
    operator: z.enum(["gte", "lte", "eq"]),
    value: z.number(),
  }).nullable().optional(),
});

const completeSchema = z.object({
  verification_source: z
    .enum([
      "manual",
      "photo",
      "leetcode",
      "github",
      "wakapi",
      "google_fit",
      "duolingo",
      "screen_time",
      "strava",
      "chess_com",
      "todoist",
    ])
    .default("manual"),
  proof_url: z.string().max(500).optional(),
});

const missSchema = z.object({
  reason_category: z.enum(["sick", "busy", "forgot", "no_energy", "other"]),
  reason_text: z.string().max(1000).optional(),
});

// ── POST /habits ─────────────────────────────────────────────

habitsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = createHabitSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, "VALIDATION_ERROR", parsed.error.message, 400);
  }

  // Enforce max 7 active habits
  const activeHabits = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, user.id), eq(habits.isActive, true)));

  if (activeHabits.length >= MAX_ACTIVE_HABITS) {
    return error(
      c,
      "MAX_HABITS_REACHED",
      `You can have at most ${MAX_ACTIVE_HABITS} active habits`,
      400
    );
  }

  const data = parsed.data;
  const [habit] = await db
    .insert(habits)
    .values({
      userId: user.id,
      name: data.name,
      intensity: data.intensity,
      trackingMethod: data.tracking_method,
      pluginId: data.plugin_id ?? null,
      pluginGoal: data.plugin_goal ?? null,
      redirectUrl: data.redirect_url ?? null,
      visibility: data.visibility,
      frequencyRule: data.frequency_rule,
    })
    .returning();

  return ok(c, habit, 201);
});

// ── GET /habits ──────────────────────────────────────────────

habitsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const todayStr = today();

  const activeHabits = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, user.id), eq(habits.isActive, true)));

  // Get today's logs for all habits
  const todayLogs = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.userId, user.id), eq(habitLogs.date, todayStr)));

  const completedMap = new Map(
    todayLogs.map((log) => [log.habitId, log.completed])
  );

  const result = await Promise.all(
    activeHabits.map(async (h) => {
      const rule = h.frequencyRule as { type: string; target?: number; window?: number };
      const completedToday = completedMap.get(h.id) ?? false;
      const frequencyStatus = await isFrequencyGoalMet(h.id, user.id, rule as any, todayStr);
      const dueToday = await isHabitDueToday(h.id, user.id, rule as any, todayStr);

      return {
        ...h,
        completedToday,
        frequencyStatus: {
          goalMet: frequencyStatus.met,
          completedCount: frequencyStatus.completedCount,
          requiredCount: frequencyStatus.requiredCount,
          periodStart: frequencyStatus.periodStart,
          periodEnd: frequencyStatus.periodEnd,
          dueToday,
        },
      };
    })
  );

  return ok(c, result);
});

// ── PATCH /habits/:id ────────────────────────────────────────

habitsRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  const habitId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateHabitSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, "VALIDATION_ERROR", parsed.error.message, 400);
  }

  // Verify ownership
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .limit(1);

  if (!habit) {
    return error(c, "HABIT_NOT_FOUND", "Habit not found", 404);
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.intensity !== undefined) updates.intensity = data.intensity;
  if (data.redirect_url !== undefined) updates.redirectUrl = data.redirect_url;
  if (data.visibility !== undefined) updates.visibility = data.visibility;
  if (data.frequency_rule !== undefined) updates.frequencyRule = data.frequency_rule;
  if (data.plugin_goal !== undefined) updates.pluginGoal = data.plugin_goal;

  const [updated] = await db
    .update(habits)
    .set(updates)
    .where(eq(habits.id, habitId))
    .returning();

  return ok(c, updated);
});

// ── DELETE /habits/:id ───────────────────────────────────────

habitsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const habitId = c.req.param("id");

  // Verify ownership
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .limit(1);

  if (!habit) {
    return error(c, "HABIT_NOT_FOUND", "Habit not found", 404);
  }

  const [archived] = await db
    .update(habits)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(habits.id, habitId))
    .returning();

  return ok(c, archived);
});

// ── POST /habits/:id/complete ────────────────────────────────

habitsRoutes.post("/:id/complete", async (c) => {
  const user = c.get("user");
  const habitId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = completeSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, "VALIDATION_ERROR", parsed.error.message, 400);
  }

  const data = parsed.data;

  try {
    // 1. Complete the habit (streak logic)
    const streakResult = await completeHabit(
      user.id,
      habitId,
      data.verification_source,
      data.proof_url
    );

    // 2. Award points
    const pointsResult = await awardCompletion(
      user.id,
      streakResult.habit.intensity
    );

    // 3. Check if ALL active habits are completed today
    const todayStr = today();
    const activeHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, user.id), eq(habits.isActive, true)));

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

    // Perfect day: all habits that are "due today" must be completed
    // For daily habits: must be completed today
    // For non-daily: frequency goal must be met for current period
    let perfectDay = false;
    if (activeHabits.length > 0) {
      const dueChecks = await Promise.all(
        activeHabits.map(async (h) => {
          const rule = h.frequencyRule as { type: string; target?: number; window?: number };
          const goalStatus = await isFrequencyGoalMet(h.id, user.id, rule as any, todayStr);
          return goalStatus.met;
        })
      );
      if (dueChecks.every((met) => met)) {
        await awardPerfectDay(user.id);
        perfectDay = true;
      }
    }

    // 4. Check streak milestones
    let milestoneReward = null;
    if (streakResult.isNewMilestone) {
      milestoneReward = await awardStreakMilestone(
        user.id,
        streakResult.habit.currentStreak
      );
    }

    // 5. Insert feed item if user is in a group
    const memberships = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, user.id));

    // BUG 7 helper: calculate group average completion rate for norm feed items
    const calcGroupAvgCompletion = async (groupId: string): Promise<number> => {
      const weekStart = getWeekStart();
      const weekStartDate = dayjs(weekStart);
      const daysElapsed = dayjs(todayStr).diff(weekStartDate, "day") + 1;

      const members = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));

      let totalExpected = 0;
      let totalCompleted = 0;

      for (const mem of members) {
        const memberHabits = await db
          .select({ id: habits.id })
          .from(habits)
          .where(and(eq(habits.userId, mem.userId), eq(habits.isActive, true)));

        totalExpected += memberHabits.length * daysElapsed;

        const completedLogs = await db
          .select({ id: habitLogs.id })
          .from(habitLogs)
          .where(
            and(
              eq(habitLogs.userId, mem.userId),
              gte(habitLogs.date, weekStart),
              eq(habitLogs.completed, true)
            )
          );

        totalCompleted += completedLogs.length;
      }

      return totalExpected > 0
        ? Math.round((totalCompleted / totalExpected) * 100)
        : 0;
    };

    for (const m of memberships) {
      await db.insert(feedItems).values({
        groupId: m.groupId,
        actorId: user.id,
        type: "completion",
        data: {
          habit_name: streakResult.habit.name,
          streak: streakResult.habit.currentStreak,
          intensity: streakResult.habit.intensity,
        },
      });

      if (perfectDay) {
        await db.insert(feedItems).values({
          groupId: m.groupId,
          actorId: user.id,
          type: "perfect_day",
          data: { habits_completed: activeHabits.length },
        });
      }

      if (streakResult.isNewMilestone) {
        // BUG 7: Status feed item for streak milestone
        await db.insert(feedItems).values({
          groupId: m.groupId,
          actorId: user.id,
          type: "streak_milestone",
          data: {
            habit_name: streakResult.habit.name,
            streak: streakResult.habit.currentStreak,
          },
        });

        // BUG 7: Norm feed item for streak milestone
        const avgCompletion = await calcGroupAvgCompletion(m.groupId);
        await db.insert(feedItems).values({
          groupId: m.groupId,
          actorId: user.id,
          type: "status_norm",
          data: {
            trigger: "streak_milestone",
            habit_name: streakResult.habit.name,
            streak: streakResult.habit.currentStreak,
            message:
              "Most people in your group are staying consistent this week",
            groupAvgCompletionPct: avgCompletion,
          },
        });
      }

      if (streakResult.goalStageChanged) {
        // BUG 7: Status feed item for goal stage change
        await db.insert(feedItems).values({
          groupId: m.groupId,
          actorId: user.id,
          type: "goal_milestone",
          data: {
            habit_name: streakResult.habit.name,
            goal_stage: streakResult.habit.goalStage,
          },
        });

        // BUG 7: Norm feed item for goal stage change
        const avgCompletion = await calcGroupAvgCompletion(m.groupId);
        await db.insert(feedItems).values({
          groupId: m.groupId,
          actorId: user.id,
          type: "status_norm",
          data: {
            trigger: "goal_milestone",
            habit_name: streakResult.habit.name,
            goal_stage: streakResult.habit.goalStage,
            message:
              "Most people in your group are staying consistent this week",
            groupAvgCompletionPct: avgCompletion,
          },
        });
      }

      // BUG 3: Rank promotion feed item
      if (pointsResult.newRank) {
        const [userData] = await db
          .select({ rank: users.rank })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        // newRank is the rank we just promoted to; the old rank is the one before
        // Since checkRankPromotion already updated the DB, we derive old rank
        const rankOrder = ["bronze", "silver", "gold", "platinum", "diamond"];
        const newRankIdx = rankOrder.indexOf(pointsResult.newRank);
        const oldRank = newRankIdx > 0 ? rankOrder[newRankIdx - 1] : "bronze";

        await db.insert(feedItems).values({
          groupId: m.groupId,
          actorId: user.id,
          type: "rank_promotion",
          data: {
            userName: user.name,
            oldRank,
            newRank: pointsResult.newRank,
          },
        });
      }

      // BUG 1: Update lastActiveDate for this group membership
      await db
        .update(groupMembers)
        .set({ lastActiveDate: todayStr })
        .where(
          and(
            eq(groupMembers.groupId, m.groupId),
            eq(groupMembers.userId, user.id)
          )
        );

      // BUG 2: Increment habitsCompleted in weeklyScores
      const weekStart = getWeekStart();
      await db
        .insert(weeklyScores)
        .values({
          userId: user.id,
          groupId: m.groupId,
          weekStartDate: weekStart,
          habitsCompleted: 1,
          contributionScore: 1,
        })
        .onConflictDoUpdate({
          target: [
            weeklyScores.userId,
            weeklyScores.groupId,
            weeklyScores.weekStartDate,
          ],
          set: {
            habitsCompleted: sql`${weeklyScores.habitsCompleted} + 1`,
            contributionScore: sql`${weeklyScores.contributionScore} + 1`,
            updatedAt: new Date(),
          },
        });
    }

    return ok(c, {
      habit: streakResult.habit,
      points: pointsResult,
      perfectDay,
      milestoneReward,
      goalStageChanged: streakResult.goalStageChanged,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "HABIT_NOT_FOUND") {
      return error(c, "HABIT_NOT_FOUND", "Habit not found", 404);
    }
    if (message === "HABIT_ARCHIVED") {
      return error(c, "HABIT_ARCHIVED", "Habit is archived", 400);
    }
    throw err;
  }
});

// ── POST /habits/:id/miss ───────────────────────────────────

habitsRoutes.post("/:id/miss", async (c) => {
  const user = c.get("user");
  const habitId = c.req.param("id");
  const body = await c.req.json();
  const parsed = missSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, "VALIDATION_ERROR", parsed.error.message, 400);
  }

  const data = parsed.data;

  try {
    const missLog = await missHabit(
      user.id,
      habitId,
      data.reason_category,
      data.reason_text
    );

    return ok(c, {
      missLog,
      message:
        "It's okay to miss sometimes. What matters is showing up again tomorrow.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "HABIT_NOT_FOUND") {
      return error(c, "HABIT_NOT_FOUND", "Habit not found", 404);
    }
    throw err;
  }
});

// ── GET /habits/:id/logs ────────────────────────────────────

habitsRoutes.get("/:id/logs", async (c) => {
  const user = c.get("user");
  const habitId = c.req.param("id");
  const range = c.req.query("range") || "week";

  // Verify ownership
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .limit(1);

  if (!habit) {
    return error(c, "HABIT_NOT_FOUND", "Habit not found", 404);
  }

  const days = range === "month" ? 30 : 7;
  const startDate = dayjs().subtract(days, "day").format("YYYY-MM-DD");

  const logs = await db
    .select()
    .from(habitLogs)
    .where(
      and(eq(habitLogs.habitId, habitId), gte(habitLogs.date, startDate))
    )
    .orderBy(desc(habitLogs.date));

  return ok(c, logs);
});
