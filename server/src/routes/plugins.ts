import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { integrationConnections } from "../db/schema/index.js";
import { ok, error } from "../lib/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { pluginRegistry } from "../plugins/registry.js";
import { leetcodePlugin } from "../plugins/leetcode.js";
import { githubPlugin } from "../plugins/github.js";
import type { Plugin } from "../plugins/interface.js";

const pluginRoutes = new Hono();

pluginRoutes.use("*", authMiddleware);

// Plugin executor map
const pluginExecutors: Record<string, Plugin> = {
  leetcode: leetcodePlugin,
  github: githubPlugin,
};

// ---------- GET /plugins ----------
// List all available plugins with connection status for current user
pluginRoutes.get("/", async (c) => {
  const user = c.get("user");

  // Load user's existing connections
  const connections = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.userId, user.id));

  const connectionMap = new Map(
    connections.map((conn) => [conn.pluginId, conn])
  );

  const plugins = Array.from(pluginRegistry.entries()).map(([id, info]) => {
    const conn = connectionMap.get(id);
    return {
      id: info.id,
      name: info.name,
      description: info.description,
      category: info.category,
      credentialFields: info.credentialFields,
      connected: conn ? true : false,
      status: conn?.status ?? null,
      lastSyncedAt: conn?.lastSyncedAt ?? null,
    };
  });

  return ok(c, plugins);
});

// ---------- POST /plugins/:id/connect ----------
// Connect a plugin with credentials
pluginRoutes.post("/:id/connect", async (c) => {
  const user = c.get("user");
  const pluginId = c.req.param("id");

  const info = pluginRegistry.get(pluginId);
  if (!info) {
    return error(c, "PLUGIN_NOT_FOUND", `Plugin "${pluginId}" not found`, 404);
  }

  const body = await c.req.json<{ credentials: Record<string, string> }>();
  const credentials = body.credentials;

  if (!credentials || typeof credentials !== "object") {
    return error(
      c,
      "INVALID_CREDENTIALS",
      "Credentials object is required",
      400
    );
  }

  // Validate required credential fields
  for (const field of info.credentialFields) {
    if (!credentials[field]) {
      return error(
        c,
        "MISSING_CREDENTIAL",
        `Missing required credential field: ${field}`,
        400
      );
    }
  }

  // Authenticate with the plugin
  const executor = pluginExecutors[pluginId];
  if (executor) {
    const isValid = await executor.authenticate(credentials);
    if (!isValid) {
      return error(
        c,
        "AUTHENTICATION_FAILED",
        `Could not authenticate with ${info.name}. Please check your credentials.`,
        400
      );
    }
  }

  // Check for existing connection
  const [existing] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.userId, user.id),
        eq(integrationConnections.pluginId, pluginId)
      )
    )
    .limit(1);

  let connection;

  if (existing) {
    // Update existing connection
    [connection] = await db
      .update(integrationConnections)
      .set({
        credentials,
        status: "active",
        lastError: null,
        lastSyncedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id))
      .returning();
  } else {
    // Create new connection
    [connection] = await db
      .insert(integrationConnections)
      .values({
        userId: user.id,
        pluginId,
        credentials,
        status: "active",
        lastSyncedAt: new Date(),
      })
      .returning();
  }

  return ok(c, {
    id: connection.id,
    pluginId: connection.pluginId,
    status: connection.status,
    lastSyncedAt: connection.lastSyncedAt,
    createdAt: connection.createdAt,
  }, 201);
});

// ---------- GET /plugins/:id/status ----------
// Get connection status, last synced, and errors
pluginRoutes.get("/:id/status", async (c) => {
  const user = c.get("user");
  const pluginId = c.req.param("id");

  const info = pluginRegistry.get(pluginId);
  if (!info) {
    return error(c, "PLUGIN_NOT_FOUND", `Plugin "${pluginId}" not found`, 404);
  }

  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.userId, user.id),
        eq(integrationConnections.pluginId, pluginId)
      )
    )
    .limit(1);

  if (!connection) {
    return ok(c, {
      pluginId,
      pluginName: info.name,
      connected: false,
      status: null,
      lastSyncedAt: null,
      lastError: null,
    });
  }

  return ok(c, {
    pluginId,
    pluginName: info.name,
    connected: true,
    status: connection.status,
    lastSyncedAt: connection.lastSyncedAt,
    lastError: connection.lastError,
    createdAt: connection.createdAt,
  });
});

// ---------- DELETE /plugins/:id ----------
// Disconnect a plugin — removes stored credentials
pluginRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const pluginId = c.req.param("id");

  const [deleted] = await db
    .delete(integrationConnections)
    .where(
      and(
        eq(integrationConnections.userId, user.id),
        eq(integrationConnections.pluginId, pluginId)
      )
    )
    .returning();

  if (!deleted) {
    return error(c, "NOT_CONNECTED", `Plugin "${pluginId}" is not connected`, 404);
  }

  return ok(c, { message: `${pluginId} disconnected`, pluginId });
});

// ---------- GET /plugins/:id/metrics ----------
// Show available metrics for a plugin (so frontend knows what goals to offer)
pluginRoutes.get("/:id/metrics", async (c) => {
  const pluginId = c.req.param("id");

  const metricsMap: Record<string, Array<{ metric: string; label: string; unit: string; example: number }>> = {
    leetcode: [
      { metric: "submissions_today", label: "Problems solved", unit: "count", example: 2 },
    ],
    github: [
      { metric: "events_today", label: "Contributions", unit: "count", example: 3 },
      { metric: "push_events", label: "Pushes", unit: "count", example: 1 },
    ],
    wakapi: [
      { metric: "totalMinutes", label: "Coding time", unit: "minutes", example: 120 },
    ],
    google_fit: [
      { metric: "steps", label: "Steps", unit: "count", example: 10000 },
      { metric: "activity_minutes", label: "Exercise", unit: "minutes", example: 30 },
    ],
    duolingo: [
      { metric: "streak", label: "Streak days", unit: "days", example: 30 },
      { metric: "totalXp", label: "Total XP", unit: "xp", example: 5000 },
    ],
    chess_com: [
      { metric: "games_today", label: "Games played", unit: "count", example: 3 },
    ],
    strava: [
      { metric: "total_distance_km", label: "Distance", unit: "km", example: 5 },
      { metric: "total_duration_minutes", label: "Duration", unit: "minutes", example: 30 },
      { metric: "activities_today", label: "Activities", unit: "count", example: 1 },
    ],
    todoist: [
      { metric: "tasks_completed_today", label: "Tasks done", unit: "count", example: 5 },
    ],
    screen_time: [
      { metric: "screen_minutes", label: "Screen time", unit: "minutes", example: 60 },
    ],
  };

  const metrics = metricsMap[pluginId];
  if (!metrics) {
    return error(c, "PLUGIN_NOT_FOUND", `No metrics for "${pluginId}"`, 404);
  }

  return ok(c, { pluginId, metrics });
});

// ---------- POST /plugins/screen_time/report ----------
// Flutter app reports screen time data — this is the only plugin where
// data comes FROM the client, not from an external API
pluginRoutes.post("/screen_time/report", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    screen_minutes: number;
    app_usage?: Record<string, number>; // { "Instagram": 45, "YouTube": 30 }
    date?: string; // defaults to today
  }>();

  if (body.screen_minutes === undefined || body.screen_minutes === null) {
    return error(c, "VALIDATION_ERROR", "screen_minutes is required");
  }

  const { today } = await import("../lib/helpers.js");
  const dateStr = body.date || today();

  // Find screen_time habits for this user
  const { habits } = await import("../db/schema/habits.js");
  const { habitLogs } = await import("../db/schema/habit-logs.js");

  const screenHabits = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.userId, user.id),
        eq(habits.pluginId, "screen_time"),
        eq(habits.isActive, true)
      )
    );

  if (screenHabits.length === 0) {
    return error(c, "NO_HABIT", "No active screen time habit found");
  }

  const metrics = {
    screen_minutes: body.screen_minutes,
    ...(body.app_usage ? { app_usage: body.app_usage } : {}),
  };

  // Upsert log with metrics for each screen time habit
  for (const habit of screenHabits) {
    const goal = habit.pluginGoal as { metric: string; operator: string; value: number } | null;

    let isGoalMet = false;
    if (goal && goal.metric === "screen_minutes") {
      if (goal.operator === "lte") isGoalMet = body.screen_minutes <= goal.value;
      else if (goal.operator === "gte") isGoalMet = body.screen_minutes >= goal.value;
      else if (goal.operator === "eq") isGoalMet = body.screen_minutes === goal.value;
    }

    await db
      .insert(habitLogs)
      .values({
        habitId: habit.id,
        userId: user.id,
        date: dateStr,
        completed: isGoalMet,
        verificationSource: "screen_time",
        pluginMetrics: metrics as any,
        completedAt: isGoalMet ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.date],
        set: {
          pluginMetrics: metrics as any,
          completed: isGoalMet,
          completedAt: isGoalMet ? new Date() : null,
        },
      });

    // If goal met and not already completed, run streak + points
    if (isGoalMet) {
      const { completeHabit } = await import("../services/streak.service.js");
      const { awardCompletion } = await import("../services/points.service.js");
      try {
        await completeHabit(user.id, habit.id, "screen_time", undefined, metrics as any);
        await awardCompletion(user.id, habit.intensity);
      } catch {
        // Already completed — ignore
      }
    }
  }

  return ok(c, {
    reported: true,
    date: dateStr,
    screen_minutes: body.screen_minutes,
    habits_evaluated: screenHabits.length,
  });
});

export { pluginRoutes };
