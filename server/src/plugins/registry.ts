export interface PluginInfo {
  id: string;
  name: string;
  description: string;
  credentialFields: string[];
  category: string;
}

export const pluginRegistry = new Map<string, PluginInfo>([
  [
    "leetcode",
    {
      id: "leetcode",
      name: "LeetCode",
      description: "Track daily LeetCode problem solving",
      credentialFields: ["username"],
      category: "coding",
    },
  ],
  [
    "github",
    {
      id: "github",
      name: "GitHub",
      description: "Track daily GitHub contributions",
      credentialFields: ["username"],
      category: "coding",
    },
  ],
  [
    "wakapi",
    {
      id: "wakapi",
      name: "Wakapi",
      description: "Track coding time via Wakapi/WakaTime",
      credentialFields: ["api_key", "base_url"],
      category: "coding",
    },
  ],
  [
    "google_fit",
    {
      id: "google_fit",
      name: "Google Fit",
      description: "Track fitness activity and step goals",
      credentialFields: ["access_token", "refresh_token"],
      category: "fitness",
    },
  ],
  [
    "duolingo",
    {
      id: "duolingo",
      name: "Duolingo",
      description: "Track daily language learning streaks",
      credentialFields: ["username"],
      category: "learning",
    },
  ],
  [
    "screen_time",
    {
      id: "screen_time",
      name: "Screen Time",
      description: "Automatically tracks screen time from your phone. No setup needed — the app reads it directly.",
      credentialFields: [],
      category: "wellbeing",
    },
  ],
  [
    "strava",
    {
      id: "strava",
      name: "Strava",
      description: "Track running, cycling, and other workouts",
      credentialFields: ["access_token", "refresh_token"],
      category: "fitness",
    },
  ],
  [
    "chess_com",
    {
      id: "chess_com",
      name: "Chess.com",
      description: "Track daily chess games and puzzles",
      credentialFields: ["username"],
      category: "learning",
    },
  ],
  [
    "todoist",
    {
      id: "todoist",
      name: "Todoist",
      description: "Track daily task completion in Todoist",
      credentialFields: ["api_key"],
      category: "productivity",
    },
  ],
]);
