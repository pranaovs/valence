import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { habits } from "../db/schema/habits.js";
import { habitLogs } from "../db/schema/habit-logs.js";
import { missLogs } from "../db/schema/miss-logs.js";
import { groupMembers } from "../db/schema/groups.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, error } from "../lib/response.js";
import { today } from "../lib/helpers.js";
import { generateText } from "../lib/gemini.js";

export const insightsRoutes = new Hono();

insightsRoutes.use("*", authMiddleware);

// ── Schemas ──────────────────────────────────────────────────

const reflectionItemSchema = z.object({
  habit_id: z.string().uuid(),
  difficulty: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional(),
});

const reflectionsSchema = z.array(reflectionItemSchema).min(1);

// ── POST /reflections ────────────────────────────────────────

insightsRoutes.post("/reflections", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = reflectionsSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, "VALIDATION_ERROR", parsed.error.message, 400);
  }

  const todayStr = today();
  const reflections = parsed.data;
  const updated: string[] = [];

  for (const ref of reflections) {
    // Verify user owns the habit
    const [habit] = await db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.id, ref.habit_id), eq(habits.userId, user.id)))
      .limit(1);

    if (!habit) continue;

    // Upsert today's habitLog with reflection data
    await db
      .insert(habitLogs)
      .values({
        habitId: ref.habit_id,
        userId: user.id,
        date: todayStr,
        completed: false,
        reflectionDifficulty: ref.difficulty,
        reflectionText: ref.text ?? null,
      })
      .onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.date],
        set: {
          reflectionDifficulty: ref.difficulty,
          reflectionText: ref.text ?? null,
        },
      });

    updated.push(ref.habit_id);
  }

  return ok(c, { updated });
});

// ── GET /insights ────────────────────────────────────────────

insightsRoutes.get("/", async (c) => {
  const user = c.get("user");

  // Load user's miss logs
  const userMissLogs = await db
    .select()
    .from(missLogs)
    .where(eq(missLogs.userId, user.id))
    .orderBy(desc(missLogs.createdAt));

  if (userMissLogs.length === 0) {
    return ok(c, {
      insights:
        "You haven't logged any misses yet. Keep up the great work, and remember -- it's okay to miss sometimes. When you do, logging the reason helps us spot patterns for you.",
      patterns: [],
    });
  }

  // Group by reason category
  const categoryCount: Record<string, number> = {};
  const dayOfWeekCount: Record<string, number> = {};
  const llmPatterns: string[] = [];

  for (const log of userMissLogs) {
    // Category distribution
    categoryCount[log.reasonCategory] =
      (categoryCount[log.reasonCategory] || 0) + 1;

    // Day of week pattern
    if (log.date) {
      const dayName = new Date(log.date).toLocaleDateString("en-US", {
        weekday: "long",
      });
      dayOfWeekCount[dayName] = (dayOfWeekCount[dayName] || 0) + 1;
    }

    // LLM-parsed signals
    if (log.llmPatternSignal && log.llmPatternSignal !== "none") {
      llmPatterns.push(log.llmPatternSignal);
    }
  }

  const prompt = `Analyze this user's habit-miss data and provide supportive, actionable insights:

Miss reason breakdown: ${JSON.stringify(categoryCount)}
Day-of-week distribution: ${JSON.stringify(dayOfWeekCount)}
AI-detected pattern signals: ${JSON.stringify(llmPatterns)}
Total misses recorded: ${userMissLogs.length}

Provide 2-3 short, specific insights. Be warm and supportive. Focus on patterns and gentle suggestions. No generic advice.`;

  try {
    const insightsText = await generateText(
      "You are a supportive habit coach AI. Be concise, specific, and empathetic. Never shame. Use data patterns to give actionable advice.",
      prompt
    );

    return ok(c, {
      insights: insightsText,
      patterns: {
        by_category: categoryCount,
        by_day: dayOfWeekCount,
        signals: llmPatterns,
      },
    });
  } catch {
    // Fallback if LLM fails
    return ok(c, {
      insights:
        "We're still analyzing your patterns. Check back soon for personalized insights.",
      patterns: {
        by_category: categoryCount,
        by_day: dayOfWeekCount,
        signals: llmPatterns,
      },
    });
  }
});

// ── GET /insights/motivation ─────────────────────────────────

insightsRoutes.get("/motivation", async (c) => {
  const user = c.get("user");

  // Load streak data
  const activeHabits = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, user.id), eq(habits.isActive, true)));

  // Load group info
  const memberships = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id));

  const streakSummary = activeHabits.map((h) => ({
    name: h.name,
    streak: h.currentStreak,
    stage: h.goalStage,
    longest: h.longestStreak,
  }));

  const prompt = `Generate a short, personalized motivational message for this user:

Persona type: ${user.personaType}
Rank: ${user.rank}
XP: ${user.xp}
Active habits: ${JSON.stringify(streakSummary)}
Number of groups: ${memberships.length}
Current time context: morning launch screen

Keep it to 1-2 sentences. Match the persona:
- "socialiser" → emphasize group connections, friends waiting
- "achiever" → emphasize stats, milestones, progress
- "general" → balanced, warm encouragement

Be specific to their actual data. No generic platitudes.`;

  try {
    const message = await generateText(
      "You are the motivational voice of Valance, a social habit-tracking app. Be authentic, concise, and persona-aware. Never use cheesy cliches.",
      prompt
    );

    return ok(c, {
      message,
      persona: user.personaType,
      rank: user.rank,
      xp: user.xp,
    });
  } catch {
    // Deterministic fallback
    const fallbacks: Record<string, string> = {
      socialiser: "Your group is counting on you today. Let's show up together.",
      achiever: `${user.xp} XP and climbing. Every habit you complete today pushes you higher.`,
      general: "A new day, a new chance to build the version of yourself you're proud of.",
    };

    return ok(c, {
      message: fallbacks[user.personaType] || fallbacks.general,
      persona: user.personaType,
      rank: user.rank,
      xp: user.xp,
    });
  }
});
