import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export function today(tz: string = "UTC"): string {
  return dayjs().tz(tz).format("YYYY-MM-DD");
}

export function yesterday(tz: string = "UTC"): string {
  return dayjs().tz(tz).subtract(1, "day").format("YYYY-MM-DD");
}

export function getWeekStart(tz: string = "UTC"): string {
  return dayjs().tz(tz).startOf("week").format("YYYY-MM-DD");
}

export function isConsecutiveDay(
  lastDate: string | null,
  currentDate: string
): boolean {
  if (!lastDate) return false;
  const last = dayjs(lastDate);
  const current = dayjs(currentDate);
  return current.diff(last, "day") === 1;
}

export function isSameDay(
  date1: string | null,
  date2: string
): boolean {
  if (!date1) return false;
  return date1 === date2;
}

export const INTENSITY_POINTS = {
  light: 5,
  moderate: 10,
  intense: 20,
} as const;

export const STREAK_MILESTONES: Record<number, number> = {
  7: 30,
  30: 100,
  100: 500,
};

export const PERFECT_DAY_BONUS = 25;

export const GOAL_STAGE_THRESHOLDS = {
  ignition: 3,
  foundation: 10,
  momentum: 21,
  formed: 66,
} as const;

export const RANK_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 15000,
} as const;

export const GROUP_TIER_THRESHOLDS = {
  spark: 0,
  ember: 7,
  flame: 21,
  blaze: 66,
} as const;

export const MAX_ACTIVE_HABITS = 7;
export const GROUP_MIN_SIZE = 3;
export const GROUP_MAX_SIZE = 7;
export const GROUP_COMPLETION_GOLD = 100;
export const GROUP_COMPLETION_SILVER = 75;
export const FREEZE_COST_SPARKS = 100;
export const MAX_FREEZE_PER_GROUP_PER_DAY = 1;
