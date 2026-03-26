import type { Plugin } from "./interface.js";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

export const leetcodePlugin: Plugin = {
  name: "LeetCode",
  description: "Track daily LeetCode problem solving",

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    const { username } = credentials;
    if (!username) return false;

    try {
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query getUserProfile($username: String!) {
              matchedUser(username: $username) {
                username
              }
            }
          `,
          variables: { username },
        }),
      });

      const data = (await response.json()) as {
        data?: { matchedUser?: { username: string } | null };
      };
      return data.data?.matchedUser !== null &&
        data.data?.matchedUser !== undefined;
    } catch {
      return false;
    }
  },

  async fetchTodayStatus(
    credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }> {
    const { username } = credentials;

    try {
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query getRecentSubmissions($username: String!, $limit: Int!) {
              recentAcSubmissionList(username: $username, limit: $limit) {
                title
                titleSlug
                timestamp
                lang
              }
            }
          `,
          variables: { username, limit: 20 },
        }),
      });

      const data = (await response.json()) as {
        data?: {
          recentAcSubmissionList?: Array<{
            title: string;
            titleSlug: string;
            timestamp: string;
            lang: string;
          }>;
        };
      };

      const submissions = data.data?.recentAcSubmissionList ?? [];
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayTimestamp = Math.floor(todayStart.getTime() / 1000);

      const todaySubmissions = submissions.filter(
        (s) => parseInt(s.timestamp, 10) >= todayTimestamp
      );

      return {
        completed: todaySubmissions.length > 0,
        metadata: {
          submissions_today: todaySubmissions.length,
          latest_problem: todaySubmissions[0]?.title ?? null,
          latest_language: todaySubmissions[0]?.lang ?? null,
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
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query userProfileCalendar($username: String!) {
              matchedUser(username: $username) {
                userCalendar {
                  submissionCalendar
                }
              }
            }
          `,
          variables: { username },
        }),
      });

      const data = (await response.json()) as {
        data?: {
          matchedUser?: {
            userCalendar?: { submissionCalendar: string };
          } | null;
        };
      };

      const calendarStr =
        data.data?.matchedUser?.userCalendar?.submissionCalendar ?? "{}";
      const calendar = JSON.parse(calendarStr) as Record<string, number>;

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
        const dayStart = new Date(d);
        dayStart.setUTCHours(0, 0, 0, 0);
        const timestamp = Math.floor(dayStart.getTime() / 1000).toString();
        const count = calendar[timestamp] ?? 0;

        results.push({
          date: d.toISOString().slice(0, 10),
          completed: count > 0,
          metadata: { submissions: count },
        });
      }

      return results;
    } catch {
      return [];
    }
  },
};
