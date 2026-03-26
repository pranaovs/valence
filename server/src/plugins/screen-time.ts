/**
 * Screen Time Plugin (client-reported)
 *
 * This is a client-reported plugin. The Flutter app reads iOS/Android screen time
 * data locally and POSTs it to the backend. The backend then marks the habit as
 * complete. There is no external API to poll — screen time data originates from the
 * mobile device and is pushed to POST /api/v1/plugins/screen_time/report.
 */
import type { Plugin } from "./interface.js";

export const screenTimePlugin: Plugin = {
  name: "Screen Time",
  description: "Track screen time limits and digital wellbeing",

  async authenticate(
    _credentials: Record<string, string>
  ): Promise<boolean> {
    // No external service to validate. The mobile app reports screen time
    // directly to the backend, so authentication always succeeds.
    return true;
  },

  async fetchTodayStatus(
    _credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }> {
    // This plugin does not poll an external API. Screen time data is reported
    // by the Flutter app via POST /api/v1/plugins/screen_time/report.
    // The backend updates the habit log when it receives that POST.
    return {
      completed: false,
      metadata: {
        note: "Screen time is reported by the mobile app via POST /api/v1/plugins/screen_time/report",
      },
    };
  },

  async getProgressData(
    _credentials: Record<string, string>,
    _startDate: string,
    _endDate: string
  ): Promise<
    Array<{ date: string; completed: boolean; metadata: Record<string, any> }>
  > {
    // Historical data comes from habitLogs, not the plugin. The backend stores
    // each daily report when the Flutter app POSTs screen time data.
    return [];
  },
};
