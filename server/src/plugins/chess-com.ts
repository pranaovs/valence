import type { Plugin } from "./interface.js";

const CHESS_COM_API = "https://api.chess.com/pub";
const USER_AGENT = "Valance-App/1.0";

interface ChessGame {
  url?: string;
  end_time?: number;
  time_class?: string;
  rated?: boolean;
  white?: { username?: string; result?: string };
  black?: { username?: string; result?: string };
}

interface MonthlyGamesResponse {
  games?: ChessGame[];
}

function formatDateAsYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getResultForUser(game: ChessGame, username: string): string | null {
  const lower = username.toLowerCase();
  if (game.white?.username?.toLowerCase() === lower) {
    return game.white.result ?? null;
  }
  if (game.black?.username?.toLowerCase() === lower) {
    return game.black.result ?? null;
  }
  return null;
}

async function fetchMonthlyGames(
  username: string,
  year: number,
  month: number
): Promise<ChessGame[]> {
  const mm = String(month).padStart(2, "0");
  const response = await fetch(
    `${CHESS_COM_API}/player/${encodeURIComponent(username.toLowerCase())}/games/${year}/${mm}`,
    {
      headers: { "User-Agent": USER_AGENT },
    }
  );

  if (!response.ok) return [];

  const data = (await response.json()) as MonthlyGamesResponse;
  return data.games ?? [];
}

export const chessComPlugin: Plugin = {
  name: "Chess.com",
  description: "Track daily chess games and puzzles",

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    const { username } = credentials;
    if (!username) return false;

    try {
      const response = await fetch(
        `${CHESS_COM_API}/player/${encodeURIComponent(username.toLowerCase())}`,
        {
          headers: { "User-Agent": USER_AGENT },
        }
      );

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
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const todayStr = formatDateAsYYYYMMDD(now);

      const games = await fetchMonthlyGames(username, year, month);

      // Filter games that ended today
      const todayGames = games.filter((game) => {
        if (!game.end_time) return false;
        const gameDate = new Date(game.end_time * 1000);
        return formatDateAsYYYYMMDD(gameDate) === todayStr;
      });

      const latestGame = todayGames[todayGames.length - 1];
      const latestResult = latestGame
        ? getResultForUser(latestGame, username)
        : null;

      return {
        completed: todayGames.length > 0,
        metadata: {
          games_today: todayGames.length,
          latest_game_type: latestGame?.time_class ?? null,
          latest_result: latestResult,
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
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Determine which months we need to fetch
      const monthsToFetch: Array<{ year: number; month: number }> = [];
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      while (cursor <= endMonth) {
        monthsToFetch.push({
          year: cursor.getFullYear(),
          month: cursor.getMonth() + 1,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      // Fetch all months in parallel
      const monthlyResults = await Promise.all(
        monthsToFetch.map(({ year, month }) =>
          fetchMonthlyGames(username, year, month)
        )
      );

      // Flatten all games and build a map of date -> game count
      const dateGameCount = new Map<string, number>();
      const dateGameTypes = new Map<string, string[]>();
      const dateResults = new Map<string, string[]>();

      for (const games of monthlyResults) {
        for (const game of games) {
          if (!game.end_time) continue;

          const gameDate = new Date(game.end_time * 1000);
          const dateStr = formatDateAsYYYYMMDD(gameDate);

          dateGameCount.set(dateStr, (dateGameCount.get(dateStr) ?? 0) + 1);

          if (game.time_class) {
            const types = dateGameTypes.get(dateStr) ?? [];
            types.push(game.time_class);
            dateGameTypes.set(dateStr, types);
          }

          const result = getResultForUser(game, username);
          if (result) {
            const results = dateResults.get(dateStr) ?? [];
            results.push(result);
            dateResults.set(dateStr, results);
          }
        }
      }

      // Build the results array for each day in the range
      const results: Array<{
        date: string;
        completed: boolean;
        metadata: Record<string, any>;
      }> = [];

      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = formatDateAsYYYYMMDD(d);
        const gameCount = dateGameCount.get(dateStr) ?? 0;
        const gameTypes = dateGameTypes.get(dateStr) ?? [];
        const gameResults = dateResults.get(dateStr) ?? [];

        const wins = gameResults.filter((r) => r === "win").length;
        const losses = gameResults.filter(
          (r) => r === "checkmated" || r === "resigned" || r === "timeout" || r === "abandoned"
        ).length;
        const draws = gameResults.filter(
          (r) =>
            r === "agreed" ||
            r === "stalemate" ||
            r === "repetition" ||
            r === "insufficient" ||
            r === "50move" ||
            r === "timevsinsufficient"
        ).length;

        results.push({
          date: dateStr,
          completed: gameCount > 0,
          metadata: {
            games: gameCount,
            game_types: [...new Set(gameTypes)],
            wins,
            losses,
            draws,
          },
        });
      }

      return results;
    } catch {
      return [];
    }
  },
};
