import type { Plugin } from "./interface.js";

// Google Fit uses OAuth2. The credentials contain access_token and refresh_token.
// Token refresh is handled externally (by the connect route or a refresh job).

const FITNESS_API = "https://www.googleapis.com/fitness/v1/users/me";

export const googleFitPlugin: Plugin = {
  name: "Google Fit",
  description: "Track steps, exercise, and sleep via Google Fit",

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    const { access_token } = credentials;
    if (!access_token) return false;

    try {
      const res = await fetch(`${FITNESS_API}/dataSources`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchTodayStatus(
    credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }> {
    const { access_token } = credentials;

    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const startTimeMillis = startOfDay.getTime();
      const endTimeMillis = now.getTime();

      // Aggregate step count and activity for today
      const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataTypeName: "com.google.step_count.delta" },
            {
              dataTypeName: "com.google.activity.segment",
            },
          ],
          bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
          startTimeMillis: startTimeMillis.toString(),
          endTimeMillis: endTimeMillis.toString(),
        }),
      });

      if (!res.ok) {
        return {
          completed: false,
          metadata: { error: `Google Fit API returned ${res.status}` },
        };
      }

      const data = (await res.json()) as {
        bucket: Array<{
          dataset: Array<{
            dataSourceId: string;
            point: Array<{
              value: Array<{ intVal?: number; fpVal?: number }>;
            }>;
          }>;
        }>;
      };

      let totalSteps = 0;
      let totalActivityMinutes = 0;

      for (const bucket of data.bucket || []) {
        for (const dataset of bucket.dataset || []) {
          for (const point of dataset.point || []) {
            if (dataset.dataSourceId.includes("step_count")) {
              totalSteps += point.value[0]?.intVal ?? 0;
            }
            if (dataset.dataSourceId.includes("activity.segment")) {
              // Activity duration in minutes
              const durationMs = point.value[0]?.intVal ?? 0;
              totalActivityMinutes += Math.round(durationMs / 60000);
            }
          }
        }
      }

      // Consider completed if user hit 5000+ steps OR 15+ min exercise
      const completed = totalSteps >= 5000 || totalActivityMinutes >= 15;

      return {
        completed,
        metadata: {
          steps: totalSteps,
          activity_minutes: totalActivityMinutes,
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
    const { access_token } = credentials;

    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: start.getTime().toString(),
          endTimeMillis: end.getTime().toString(),
        }),
      });

      if (!res.ok) return [];

      const data = (await res.json()) as {
        bucket: Array<{
          startTimeMillis: string;
          dataset: Array<{
            point: Array<{
              value: Array<{ intVal?: number }>;
            }>;
          }>;
        }>;
      };

      return (data.bucket || []).map((bucket) => {
        const date = new Date(parseInt(bucket.startTimeMillis))
          .toISOString()
          .slice(0, 10);
        let steps = 0;
        for (const ds of bucket.dataset || []) {
          for (const pt of ds.point || []) {
            steps += pt.value[0]?.intVal ?? 0;
          }
        }
        return {
          date,
          completed: steps >= 5000,
          metadata: { steps },
        };
      });
    } catch {
      return [];
    }
  },
};
