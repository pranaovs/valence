import type { Plugin } from "./interface.js";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export const githubPlugin: Plugin = {
  name: "GitHub",
  description: "Track daily GitHub contributions",

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    const { username } = credentials;
    if (!username) return false;

    try {
      const response = await fetch(`${GITHUB_API_URL}/users/${encodeURIComponent(username)}`, {
        headers: { "User-Agent": "Valance-App" },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async fetchTodayStatus(
    credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }> {
    const { username } = credentials;

    try {
      // Use the events API to check for today's activity
      const response = await fetch(
        `${GITHUB_API_URL}/users/${encodeURIComponent(username)}/events?per_page=100`,
        { headers: { "User-Agent": "Valance-App" } }
      );

      if (!response.ok) {
        return { completed: false, metadata: { error: "Failed to fetch events" } };
      }

      const events = (await response.json()) as Array<{
        type: string;
        created_at: string;
        repo?: { name: string };
      }>;

      const todayStr = new Date().toISOString().slice(0, 10);

      const todayEvents = events.filter(
        (e) => e.created_at.slice(0, 10) === todayStr
      );

      const pushEvents = todayEvents.filter(
        (e) => e.type === "PushEvent"
      );

      return {
        completed: todayEvents.length > 0,
        metadata: {
          total_events_today: todayEvents.length,
          push_events_today: pushEvents.length,
          latest_repo: todayEvents[0]?.repo?.name ?? null,
          event_types: [...new Set(todayEvents.map((e) => e.type))],
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
      // Use the events API (limited to last 90 days / 300 events)
      const response = await fetch(
        `${GITHUB_API_URL}/users/${encodeURIComponent(username)}/events?per_page=100`,
        { headers: { "User-Agent": "Valance-App" } }
      );

      if (!response.ok) return [];

      const events = (await response.json()) as Array<{
        type: string;
        created_at: string;
      }>;

      // Build a map of date -> event count
      const dateMap = new Map<string, number>();
      for (const event of events) {
        const date = event.created_at.slice(0, 10);
        dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
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
        const count = dateMap.get(dateStr) ?? 0;
        results.push({
          date: dateStr,
          completed: count > 0,
          metadata: { events: count },
        });
      }

      return results;
    } catch {
      return [];
    }
  },
};
