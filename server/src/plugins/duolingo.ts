import type { Plugin } from "./interface.js";

const DUOLINGO_API_URL = "https://www.duolingo.com/2017-06-30/users";

interface DuolingoUser {
  users?: Array<{
    id?: number;
    username?: string;
    streak?: number;
    totalXp?: number;
    currentCourseId?: string;
    currentCourse?: {
      title?: string;
      learningLanguage?: string;
    };
    streakData?: {
      currentStreak?: {
        startDate?: string;
        endDate?: string;
        length?: number;
      };
      previousStreak?: {
        startDate?: string;
        endDate?: string;
        length?: number;
      };
    };
  }>;
}

function formatDateAsYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const duolingoPlugin: Plugin = {
  name: "Duolingo",
  description: "Track daily language learning streaks",

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    const { username } = credentials;
    if (!username) return false;

    try {
      const response = await fetch(
        `${DUOLINGO_API_URL}?username=${encodeURIComponent(username)}`,
        {
          headers: {
            "User-Agent": "Valance-App/1.0",
          },
        }
      );

      if (!response.ok) return false;

      const data = (await response.json()) as DuolingoUser;
      const users = data.users ?? [];

      return users.length > 0 && users[0].id !== undefined;
    } catch {
      return false;
    }
  },

  async fetchTodayStatus(
    credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }> {
    const { username } = credentials;

    try {
      const response = await fetch(
        `${DUOLINGO_API_URL}?username=${encodeURIComponent(username)}`,
        {
          headers: {
            "User-Agent": "Valance-App/1.0",
          },
        }
      );

      if (!response.ok) {
        return {
          completed: false,
          metadata: { error: `API returned status ${response.status}` },
        };
      }

      const data = (await response.json()) as DuolingoUser;
      const user = data.users?.[0];

      if (!user) {
        return {
          completed: false,
          metadata: { error: "User not found" },
        };
      }

      const streak = user.streak ?? 0;
      const streakEndDate = user.streakData?.currentStreak?.endDate;
      const todayStr = formatDateAsYYYYMMDD(new Date());

      // The user practiced today if their streak is active and the
      // current streak's endDate matches today's date.
      const completed = streak > 0 && streakEndDate === todayStr;

      return {
        completed,
        metadata: {
          streak,
          currentCourse: user.currentCourse?.title ?? user.currentCourseId ?? null,
          learningLanguage: user.currentCourse?.learningLanguage ?? null,
          totalXp: user.totalXp ?? 0,
          streakStartDate: user.streakData?.currentStreak?.startDate ?? null,
          streakEndDate: streakEndDate ?? null,
        },
      };
    } catch (err) {
      return {
        completed: false,
        metadata: {
          error: err instanceof Error ? err.message : "Unknown error",
        },
      };
    }
  },

  async getProgressData(
    credentials: Record<string, string>,
    startDate: string,
    endDate: string
  ): Promise<
    Array<{ date: string; completed: boolean; metadata: Record<string, any> }>
  > {
    const { username } = credentials;

    try {
      const response = await fetch(
        `${DUOLINGO_API_URL}?username=${encodeURIComponent(username)}&fields=streak,streakData`,
        {
          headers: {
            "User-Agent": "Valance-App/1.0",
          },
        }
      );

      if (!response.ok) return [];

      const data = (await response.json()) as DuolingoUser;
      const user = data.users?.[0];

      if (!user) return [];

      const currentStreak = user.streakData?.currentStreak;
      const streakLength = currentStreak?.length ?? user.streak ?? 0;
      const streakEndDate = currentStreak?.endDate;

      // Build a set of dates covered by the current streak.
      // If we have an endDate, the streak covers [endDate - length + 1, endDate].
      // If we don't have an endDate, we can't determine which days were active.
      const streakDates = new Set<string>();

      if (streakEndDate && streakLength > 0) {
        const end = new Date(streakEndDate);
        for (let i = 0; i < streakLength; i++) {
          const d = new Date(end);
          d.setDate(d.getDate() - i);
          streakDates.add(formatDateAsYYYYMMDD(d));
        }
      }

      // Also account for the previous streak if it falls within the range
      const prevStreak = user.streakData?.previousStreak;
      if (prevStreak?.endDate && prevStreak?.length) {
        const prevEnd = new Date(prevStreak.endDate);
        for (let i = 0; i < prevStreak.length; i++) {
          const d = new Date(prevEnd);
          d.setDate(d.getDate() - i);
          streakDates.add(formatDateAsYYYYMMDD(d));
        }
      }

      const results: Array<{
        date: string;
        completed: boolean;
        metadata: Record<string, any>;
      }> = [];
      const start = new Date(startDate);
      const rangeEnd = new Date(endDate);

      for (
        let d = new Date(start);
        d <= rangeEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = formatDateAsYYYYMMDD(d);
        const completed = streakDates.has(dateStr);

        results.push({
          date: dateStr,
          completed,
          metadata: {
            inStreak: completed,
          },
        });
      }

      return results;
    } catch {
      return [];
    }
  },
};
