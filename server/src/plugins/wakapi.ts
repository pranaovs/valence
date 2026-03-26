import type { Plugin } from "./interface.js";

export const wakapiPlugin: Plugin = {
  name: "Wakapi",
  description: "Track coding time via Wakapi/WakaTime",

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    const { api_key, server_url } = credentials;
    if (!api_key || !server_url) return false;

    try {
      const baseUrl = server_url.replace(/\/+$/, "");
      const encoded = btoa(api_key);

      const response = await fetch(
        `${baseUrl}/api/compat/wakatime/v1/users/current`,
        {
          headers: {
            Authorization: `Basic ${encoded}`,
          },
        }
      );

      if (!response.ok) return false;

      const data = (await response.json()) as {
        data?: { id?: string; username?: string };
      };

      return data.data?.id !== undefined || data.data?.username !== undefined;
    } catch {
      return false;
    }
  },

  async fetchTodayStatus(
    credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }> {
    const { api_key, server_url } = credentials;

    try {
      const baseUrl = server_url.replace(/\/+$/, "");
      const encoded = btoa(api_key);

      const response = await fetch(
        `${baseUrl}/api/compat/wakatime/v1/users/current/summaries?start=today&end=today`,
        {
          headers: {
            Authorization: `Basic ${encoded}`,
          },
        }
      );

      if (!response.ok) {
        return {
          completed: false,
          metadata: { error: `API returned status ${response.status}` },
        };
      }

      const data = (await response.json()) as {
        cumulative_total?: { seconds?: number };
        data?: Array<{
          grand_total?: { total_seconds?: number };
          projects?: Array<{ name: string; total_seconds: number }>;
          languages?: Array<{ name: string; total_seconds: number }>;
        }>;
      };

      const totalSeconds = data.cumulative_total?.seconds ?? 0;
      const totalMinutes = Math.round(totalSeconds / 60);
      const completed = totalSeconds >= 3600;

      const todaySummary = data.data?.[0];
      const projects =
        todaySummary?.projects?.map((p) => ({
          name: p.name,
          minutes: Math.round(p.total_seconds / 60),
        })) ?? [];
      const languages =
        todaySummary?.languages?.map((l) => ({
          name: l.name,
          minutes: Math.round(l.total_seconds / 60),
        })) ?? [];

      return {
        completed,
        metadata: {
          totalMinutes,
          projects,
          languages,
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
    const { api_key, server_url } = credentials;

    try {
      const baseUrl = server_url.replace(/\/+$/, "");
      const encoded = btoa(api_key);

      const response = await fetch(
        `${baseUrl}/api/compat/wakatime/v1/users/current/summaries?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
        {
          headers: {
            Authorization: `Basic ${encoded}`,
          },
        }
      );

      if (!response.ok) return [];

      const data = (await response.json()) as {
        data?: Array<{
          range?: { date?: string };
          grand_total?: { total_seconds?: number };
          projects?: Array<{ name: string; total_seconds: number }>;
          languages?: Array<{ name: string; total_seconds: number }>;
        }>;
      };

      const summaries = data.data ?? [];

      // Build a map of date -> summary for quick lookup
      const summaryMap = new Map<
        string,
        (typeof summaries)[number]
      >();
      for (const summary of summaries) {
        const date = summary.range?.date;
        if (date) {
          summaryMap.set(date, summary);
        }
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
        const summary = summaryMap.get(dateStr);
        const totalSeconds = summary?.grand_total?.total_seconds ?? 0;
        const totalMinutes = Math.round(totalSeconds / 60);

        results.push({
          date: dateStr,
          completed: totalSeconds >= 3600,
          metadata: {
            totalMinutes,
            projects:
              summary?.projects?.map((p) => ({
                name: p.name,
                minutes: Math.round(p.total_seconds / 60),
              })) ?? [],
            languages:
              summary?.languages?.map((l) => ({
                name: l.name,
                minutes: Math.round(l.total_seconds / 60),
              })) ?? [],
          },
        });
      }

      return results;
    } catch {
      return [];
    }
  },
};
