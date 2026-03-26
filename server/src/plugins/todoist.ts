import type { Plugin } from "./interface.js";

const TODOIST_REST_URL = "https://api.todoist.com/rest/v2";
const TODOIST_SYNC_URL = "https://api.todoist.com/sync/v9";

export const todoistPlugin: Plugin = {
  name: "Todoist",
  description: "Track daily task completion in Todoist",

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    const { api_token } = credentials;
    if (!api_token) return false;

    try {
      const response = await fetch(`${TODOIST_REST_URL}/projects`, {
        headers: { Authorization: `Bearer ${api_token}` },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async fetchTodayStatus(
    credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }> {
    const { api_token } = credentials;

    try {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const sinceISO = todayStart.toISOString();
      const untilISO = tomorrowStart.toISOString();

      const response = await fetch(
        `${TODOIST_SYNC_URL}/completed/get_all?since=${encodeURIComponent(sinceISO)}&until=${encodeURIComponent(untilISO)}`,
        {
          headers: { Authorization: `Bearer ${api_token}` },
        }
      );

      if (!response.ok) {
        return {
          completed: false,
          metadata: { error: `Todoist API returned ${response.status}` },
        };
      }

      const data = (await response.json()) as {
        items?: Array<{
          content: string;
          completed_at: string;
          task_id: string;
        }>;
      };

      const completedItems = data.items ?? [];

      return {
        completed: completedItems.length >= 1,
        metadata: {
          tasks_completed_today: completedItems.length,
          latest_task_content: completedItems[0]?.content ?? null,
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
    const { api_token } = credentials;

    try {
      const sinceISO = new Date(startDate).toISOString();
      const endObj = new Date(endDate);
      endObj.setDate(endObj.getDate() + 1);
      const untilISO = endObj.toISOString();

      const response = await fetch(
        `${TODOIST_SYNC_URL}/completed/get_all?since=${encodeURIComponent(sinceISO)}&until=${encodeURIComponent(untilISO)}`,
        {
          headers: { Authorization: `Bearer ${api_token}` },
        }
      );

      if (!response.ok) return [];

      const data = (await response.json()) as {
        items?: Array<{
          content: string;
          completed_at: string;
          task_id: string;
        }>;
      };

      const completedItems = data.items ?? [];

      // Group completed tasks by date
      const dateMap = new Map<string, { count: number; latest: string | null }>();

      for (const item of completedItems) {
        const dateStr = item.completed_at.slice(0, 10);
        const existing = dateMap.get(dateStr) ?? { count: 0, latest: null };
        existing.count += 1;
        if (!existing.latest) {
          existing.latest = item.content;
        }
        dateMap.set(dateStr, existing);
      }

      const results: Array<{
        date: string;
        completed: boolean;
        metadata: Record<string, any>;
      }> = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().slice(0, 10);
        const dayData = dateMap.get(dateStr);

        results.push({
          date: dateStr,
          completed: dayData !== undefined && dayData.count >= 1,
          metadata: dayData
            ? {
                tasks_completed: dayData.count,
                latest_task_content: dayData.latest,
              }
            : { tasks_completed: 0 },
        });
      }

      return results;
    } catch {
      return [];
    }
  },
};
