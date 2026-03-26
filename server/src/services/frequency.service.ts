import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { habitLogs } from "../db/schema/habit-logs.js";
import dayjs from "dayjs";

type FrequencyRule = {
  type: "daily" | "rolling_window" | "per_week" | "per_month";
  target?: number;
  window?: number;
};

/**
 * Check if a habit's frequency goal is satisfied for the current period.
 *
 * Examples:
 *   { type: "daily" }                              → completed today?
 *   { type: "rolling_window", target: 3, window: 5 } → 3 completions in last 5 days?
 *   { type: "per_week", target: 2 }                → 2 completions this week?
 *   { type: "per_month", target: 10 }              → 10 completions this month?
 */
export async function isFrequencyGoalMet(
  habitId: string,
  userId: string,
  rule: FrequencyRule,
  referenceDate: string = dayjs.utc().format("YYYY-MM-DD")
): Promise<{ met: boolean; completedCount: number; requiredCount: number; periodStart: string; periodEnd: string }> {
  if (rule.type === "daily") {
    const logs = await db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, habitId),
          eq(habitLogs.date, referenceDate),
          eq(habitLogs.completed, true)
        )
      );
    return {
      met: logs.length > 0,
      completedCount: logs.length > 0 ? 1 : 0,
      requiredCount: 1,
      periodStart: referenceDate,
      periodEnd: referenceDate,
    };
  }

  if (rule.type === "rolling_window") {
    const target = rule.target ?? 1;
    const window = rule.window ?? 7;
    const periodStart = dayjs(referenceDate).subtract(window - 1, "day").format("YYYY-MM-DD");

    const logs = await db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, habitId),
          eq(habitLogs.completed, true),
          gte(habitLogs.date, periodStart),
          lte(habitLogs.date, referenceDate)
        )
      );

    return {
      met: logs.length >= target,
      completedCount: logs.length,
      requiredCount: target,
      periodStart,
      periodEnd: referenceDate,
    };
  }

  if (rule.type === "per_week") {
    const target = rule.target ?? 1;
    const ref = dayjs(referenceDate);
    const periodStart = ref.startOf("week").format("YYYY-MM-DD");
    const periodEnd = ref.endOf("week").format("YYYY-MM-DD");

    const logs = await db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, habitId),
          eq(habitLogs.completed, true),
          gte(habitLogs.date, periodStart),
          lte(habitLogs.date, periodEnd)
        )
      );

    return {
      met: logs.length >= target,
      completedCount: logs.length,
      requiredCount: target,
      periodStart,
      periodEnd,
    };
  }

  if (rule.type === "per_month") {
    const target = rule.target ?? 1;
    const ref = dayjs(referenceDate);
    const periodStart = ref.startOf("month").format("YYYY-MM-DD");
    const periodEnd = ref.endOf("month").format("YYYY-MM-DD");

    const logs = await db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, habitId),
          eq(habitLogs.completed, true),
          gte(habitLogs.date, periodStart),
          lte(habitLogs.date, periodEnd)
        )
      );

    return {
      met: logs.length >= target,
      completedCount: logs.length,
      requiredCount: target,
      periodStart,
      periodEnd,
    };
  }

  // Fallback: treat as daily
  return { met: false, completedCount: 0, requiredCount: 1, periodStart: referenceDate, periodEnd: referenceDate };
}

/**
 * Check if a habit needs to be done TODAY specifically.
 * For daily habits: yes always.
 * For non-daily habits: only if the goal isn't already met for the current period.
 * This is used for "perfect day" and group chain evaluation.
 */
export async function isHabitDueToday(
  habitId: string,
  userId: string,
  rule: FrequencyRule,
  referenceDate: string = dayjs.utc().format("YYYY-MM-DD")
): Promise<boolean> {
  if (rule.type === "daily") return true;

  // For non-daily: the habit is "due" if the goal isn't met yet for the current period
  const result = await isFrequencyGoalMet(habitId, userId, rule, referenceDate);
  return !result.met;
}

/**
 * Calculate streak for non-daily habits.
 * For rolling_window: how many consecutive windows met the target
 * For per_week: how many consecutive weeks met the target
 * For per_month: how many consecutive months met the target
 */
export async function calculateFrequencyStreak(
  habitId: string,
  userId: string,
  rule: FrequencyRule,
  referenceDate: string = dayjs.utc().format("YYYY-MM-DD")
): Promise<number> {
  if (rule.type === "daily") {
    // Daily streaks are handled by the existing streak service
    return 0;
  }

  let streak = 0;
  const ref = dayjs(referenceDate);

  if (rule.type === "rolling_window") {
    const window = rule.window ?? 7;
    // Check backwards in window-sized steps
    for (let i = 0; i < 365; i++) {
      const periodEnd = ref.subtract(i * window, "day").format("YYYY-MM-DD");
      const result = await isFrequencyGoalMet(habitId, userId, rule, periodEnd);
      if (result.met) {
        streak++;
      } else {
        break;
      }
    }
  }

  if (rule.type === "per_week") {
    for (let i = 0; i < 52; i++) {
      const weekRef = ref.subtract(i, "week").format("YYYY-MM-DD");
      const result = await isFrequencyGoalMet(habitId, userId, rule, weekRef);
      if (result.met) {
        streak++;
      } else {
        break;
      }
    }
  }

  if (rule.type === "per_month") {
    for (let i = 0; i < 12; i++) {
      const monthRef = ref.subtract(i, "month").format("YYYY-MM-DD");
      const result = await isFrequencyGoalMet(habitId, userId, rule, monthRef);
      if (result.met) {
        streak++;
      } else {
        break;
      }
    }
  }

  return streak;
}
