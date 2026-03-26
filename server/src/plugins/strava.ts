import type { Plugin } from "./interface.js";

const STRAVA_API_URL = "https://www.strava.com/api/v3";

export const stravaPlugin: Plugin = {
  name: "Strava",
  description: "Track running, cycling, and other workouts",

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    const { access_token } = credentials;
    if (!access_token) return false;

    try {
      const response = await fetch(`${STRAVA_API_URL}/athlete`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  },

  async fetchTodayStatus(
    credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }> {
    const { access_token } = credentials;

    try {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEpoch = Math.floor(todayStart.getTime() / 1000);

      const response = await fetch(
        `${STRAVA_API_URL}/athlete/activities?after=${todayEpoch}&per_page=10`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      if (!response.ok) {
        return {
          completed: false,
          metadata: { error: `Strava API returned ${response.status}` },
        };
      }

      const activities = (await response.json()) as Array<{
        type: string;
        distance: number;
        moving_time: number;
        start_date: string;
      }>;

      const totalDistanceKm = activities.reduce(
        (sum, a) => sum + (a.distance ?? 0) / 1000,
        0
      );
      const totalDurationMinutes = activities.reduce(
        (sum, a) => sum + (a.moving_time ?? 0) / 60,
        0
      );
      const activityTypes = [...new Set(activities.map((a) => a.type))];

      return {
        completed: activities.length > 0,
        metadata: {
          activities_today: activities.length,
          total_distance_km: Math.round(totalDistanceKm * 100) / 100,
          total_duration_minutes: Math.round(totalDurationMinutes * 100) / 100,
          activity_types: activityTypes,
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
      const startEpoch = Math.floor(new Date(startDate).getTime() / 1000);
      const endObj = new Date(endDate);
      endObj.setUTCHours(23, 59, 59, 999);
      const endEpoch = Math.floor(endObj.getTime() / 1000);

      const response = await fetch(
        `${STRAVA_API_URL}/athlete/activities?after=${startEpoch}&before=${endEpoch}&per_page=200`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      if (!response.ok) return [];

      const activities = (await response.json()) as Array<{
        type: string;
        distance: number;
        moving_time: number;
        start_date: string;
      }>;

      // Group activities by date
      const dateMap = new Map<
        string,
        { count: number; distance: number; duration: number; types: Set<string> }
      >();

      for (const activity of activities) {
        const dateStr = activity.start_date.slice(0, 10);
        const existing = dateMap.get(dateStr) ?? {
          count: 0,
          distance: 0,
          duration: 0,
          types: new Set<string>(),
        };
        existing.count += 1;
        existing.distance += (activity.distance ?? 0) / 1000;
        existing.duration += (activity.moving_time ?? 0) / 60;
        existing.types.add(activity.type);
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
          completed: dayData !== undefined,
          metadata: dayData
            ? {
                activities: dayData.count,
                total_distance_km:
                  Math.round(dayData.distance * 100) / 100,
                total_duration_minutes:
                  Math.round(dayData.duration * 100) / 100,
                activity_types: [...dayData.types],
              }
            : { activities: 0 },
        });
      }

      return results;
    } catch {
      return [];
    }
  },
};
