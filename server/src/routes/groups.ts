import { Hono } from "hono";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/client.js";
import { groups, groupMembers, groupDayLinks } from "../db/schema/groups.js";
import { habits } from "../db/schema/habits.js";
import { habitLogs } from "../db/schema/habit-logs.js";
import { users } from "../db/schema/users.js";
import { weeklyScores } from "../db/schema/weekly-scores.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, error } from "../lib/response.js";
import {
  today,
  getWeekStart,
  GROUP_MIN_SIZE,
  GROUP_MAX_SIZE,
  FREEZE_COST_SPARKS,
  MAX_FREEZE_PER_GROUP_PER_DAY,
} from "../lib/helpers.js";
import { getGroupFeed, addFeedItem } from "../services/feed.service.js";
import dayjs from "dayjs";

export const groupRoutes = new Hono();

groupRoutes.use("*", authMiddleware);

// GET /groups — List user's groups
groupRoutes.get("/", async (c) => {
  const user = c.get("user");

  const memberships = await db
    .select({
      groupId: groupMembers.groupId,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id));

  if (memberships.length === 0) {
    return ok(c, []);
  }

  const result = await Promise.all(
    memberships.map(async (m) => {
      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, m.groupId))
        .limit(1);

      if (!group) return null;

      const memberCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, group.id));

      return {
        ...group,
        role: m.role,
        joinedAt: m.joinedAt,
        memberCount: memberCount[0]?.count ?? 0,
      };
    })
  );

  return ok(c, result.filter(Boolean));
});

// POST /groups — Create group
groupRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ name?: string }>();

  if (!body.name || body.name.trim().length === 0) {
    return error(c, "VALIDATION_ERROR", "Group name is required");
  }

  const inviteCode = nanoid(8);

  const [group] = await db
    .insert(groups)
    .values({
      name: body.name.trim(),
      inviteCode,
      createdBy: user.id,
    })
    .returning();

  // Creator becomes admin (first member)
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: user.id,
    role: "admin",
    lastActiveDate: today(),
  });

  await addFeedItem(group.id, user.id, "member_joined", {
    userName: user.name,
    isCreator: true,
  });

  return ok(c, { group, inviteCode }, 201);
});

// GET /groups/:id — Get group detail
groupRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");

  // Verify user is a member
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return error(c, "NOT_A_MEMBER", "You are not a member of this group", 403);
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    return error(c, "GROUP_NOT_FOUND", "Group not found", 404);
  }

  // Get member count
  const memberRows = await db
    .select({
      userId: groupMembers.userId,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const memberCount = memberRows.length;

  // Today's status: who completed, who hasn't
  const todayStr = today();
  const membersWithStatus = [];

  for (const member of memberRows) {
    const [memberUser] = await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.id, member.userId))
      .limit(1);

    // Get member's active habits
    const activeHabits = await db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.userId, member.userId), eq(habits.isActive, true)));

    // Get completed logs for today
    const completedLogs = await db
      .select({ habitId: habitLogs.habitId })
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.userId, member.userId),
          eq(habitLogs.date, todayStr),
          eq(habitLogs.completed, true)
        )
      );

    const completedHabitIds = new Set(completedLogs.map((l) => l.habitId));
    const allDone =
      activeHabits.length > 0 &&
      activeHabits.every((h) => completedHabitIds.has(h.id));

    // Check visibility — get the member's habit visibility settings
    const [memberHabitVisibility] = await db
      .select({ visibility: habits.visibility })
      .from(habits)
      .where(and(eq(habits.userId, member.userId), eq(habits.isActive, true)))
      .limit(1);

    const isMinimal =
      memberHabitVisibility?.visibility === "minimal" &&
      member.userId !== user.id;

    membersWithStatus.push({
      userId: memberUser?.id,
      name: isMinimal ? undefined : memberUser?.name,
      avatar: isMinimal ? undefined : memberUser?.avatar,
      role: member.role,
      completed: allDone,
      activeHabits: activeHabits.length,
      completedToday: completedLogs.length,
      isMinimal,
    });
  }

  return ok(c, {
    group: {
      id: group.id,
      name: group.name,
      tier: group.tier,
      currentStreak: group.currentStreak,
      longestStreak: group.longestStreak,
      totalLinks: group.totalLinks,
      createdAt: group.createdAt,
    },
    memberCount,
    todayStatus: membersWithStatus,
  });
});

// POST /groups/:id/join — Join via invite code
groupRoutes.post("/:id/join", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");
  const body = await c.req.json<{ invite_code?: string }>();

  if (!body.invite_code) {
    return error(c, "VALIDATION_ERROR", "Invite code is required");
  }

  // Verify group exists and invite code matches
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    return error(c, "GROUP_NOT_FOUND", "Group not found", 404);
  }

  if (group.inviteCode !== body.invite_code) {
    return error(c, "INVALID_INVITE_CODE", "Invalid invite code", 403);
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  if (existing) {
    return error(c, "ALREADY_MEMBER", "You are already a member of this group");
  }

  // Enforce max members
  const memberCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  if (memberCount[0].count >= GROUP_MAX_SIZE) {
    return error(
      c,
      "GROUP_FULL",
      `Group is full (max ${GROUP_MAX_SIZE} members)`
    );
  }

  // Join
  const [membership] = await db
    .insert(groupMembers)
    .values({
      groupId,
      userId: user.id,
      role: "member",
      lastActiveDate: today(),
    })
    .returning();

  await addFeedItem(groupId, user.id, "member_joined", {
    userName: user.name,
  });

  return ok(c, { membership }, 201);
});

// DELETE /groups/:id/leave — Leave group
groupRoutes.delete("/:id/leave", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");

  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return error(c, "NOT_A_MEMBER", "You are not a member of this group", 404);
  }

  // Remove the member
  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    );

  // If admin leaves and others remain, transfer admin to next oldest member
  if (membership.role === "admin") {
    const remainingMembers = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(groupMembers.joinedAt)
      .limit(1);

    if (remainingMembers.length > 0) {
      await db
        .update(groupMembers)
        .set({ role: "admin" })
        .where(eq(groupMembers.id, remainingMembers[0].id));
    }
  }

  await addFeedItem(groupId, user.id, "member_left", {
    userName: user.name,
  });

  return ok(c, { message: "Left group successfully" });
});

// GET /groups/:id/feed — Get group feed (paginated)
groupRoutes.get("/:id/feed", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");

  // Verify membership
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return error(c, "NOT_A_MEMBER", "You are not a member of this group", 403);
  }

  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  const feed = await getGroupFeed(groupId, limit, offset);

  return ok(c, { feed });
});

// GET /groups/:id/streak — Chain link history
groupRoutes.get("/:id/streak", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");

  // Verify membership
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return error(c, "NOT_A_MEMBER", "You are not a member of this group", 403);
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    return error(c, "GROUP_NOT_FOUND", "Group not found", 404);
  }

  // Last 30 days of chain links
  const thirtyDaysAgo = dayjs().subtract(30, "day").format("YYYY-MM-DD");
  const links = await db
    .select()
    .from(groupDayLinks)
    .where(
      and(
        eq(groupDayLinks.groupId, groupId),
        gte(groupDayLinks.date, thirtyDaysAgo)
      )
    )
    .orderBy(desc(groupDayLinks.date));

  return ok(c, {
    currentStreak: group.currentStreak,
    longestStreak: group.longestStreak,
    totalLinks: group.totalLinks,
    links,
  });
});

// GET /groups/:id/leaderboard — Intra-group leaderboard
groupRoutes.get("/:id/leaderboard", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");

  // Verify membership
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return error(c, "NOT_A_MEMBER", "You are not a member of this group", 403);
  }

  const period = c.req.query("period") || "week";

  let weekStart: string;
  if (period === "month") {
    weekStart = dayjs().startOf("month").format("YYYY-MM-DD");
  } else {
    weekStart = getWeekStart();
  }

  const scores = await db
    .select({
      userId: weeklyScores.userId,
      contributionScore: weeklyScores.contributionScore,
      habitsCompleted: weeklyScores.habitsCompleted,
      goldLinkContributions: weeklyScores.goldLinkContributions,
      kudosReceived: weeklyScores.kudosReceived,
      rankInGroup: weeklyScores.rankInGroup,
      userName: users.name,
      userAvatar: users.avatar,
    })
    .from(weeklyScores)
    .innerJoin(users, eq(weeklyScores.userId, users.id))
    .where(
      and(
        eq(weeklyScores.groupId, groupId),
        period === "month"
          ? gte(weeklyScores.weekStartDate, weekStart)
          : eq(weeklyScores.weekStartDate, weekStart)
      )
    )
    .orderBy(desc(weeklyScores.contributionScore));

  // For month period, aggregate across weeks
  if (period === "month") {
    const aggregated = new Map<
      string,
      {
        userId: string;
        userName: string | null;
        userAvatar: string | null;
        contributionScore: number;
        habitsCompleted: number;
        goldLinkContributions: number;
        kudosReceived: number;
      }
    >();

    for (const s of scores) {
      const existing = aggregated.get(s.userId);
      if (existing) {
        existing.contributionScore += s.contributionScore;
        existing.habitsCompleted += s.habitsCompleted;
        existing.goldLinkContributions += s.goldLinkContributions;
        existing.kudosReceived += s.kudosReceived;
      } else {
        aggregated.set(s.userId, {
          userId: s.userId,
          userName: s.userName,
          userAvatar: s.userAvatar,
          contributionScore: s.contributionScore,
          habitsCompleted: s.habitsCompleted,
          goldLinkContributions: s.goldLinkContributions,
          kudosReceived: s.kudosReceived,
        });
      }
    }

    const ranked = Array.from(aggregated.values()).sort(
      (a, b) => b.contributionScore - a.contributionScore
    );

    return ok(c, {
      period,
      weekStart,
      leaderboard: ranked.map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      })),
    });
  }

  return ok(c, {
    period,
    weekStart,
    leaderboard: scores.map((s, idx) => ({
      ...s,
      rank: idx + 1,
    })),
  });
});

// GET /groups/:id/members — List all members
groupRoutes.get("/:id/members", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");

  // Verify membership
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return error(c, "NOT_A_MEMBER", "You are not a member of this group", 403);
  }

  const todayStr = today();

  const members = await db
    .select({
      memberId: groupMembers.id,
      userId: groupMembers.userId,
      role: groupMembers.role,
      consistencyPoints: groupMembers.consistencyPoints,
      lastActiveDate: groupMembers.lastActiveDate,
      joinedAt: groupMembers.joinedAt,
      userName: users.name,
      userAvatar: users.avatar,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(groupMembers.joinedAt);

  const membersWithStatus = [];

  for (const member of members) {
    // Get active habits
    const activeHabits = await db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.userId, member.userId), eq(habits.isActive, true)));

    // Get completed logs today
    const completedLogs = await db
      .select({ habitId: habitLogs.habitId })
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.userId, member.userId),
          eq(habitLogs.date, todayStr),
          eq(habitLogs.completed, true)
        )
      );

    const completedHabitIds = new Set(completedLogs.map((l) => l.habitId));
    const allDone =
      activeHabits.length > 0 &&
      activeHabits.every((h) => completedHabitIds.has(h.id));

    membersWithStatus.push({
      userId: member.userId,
      name: member.userName,
      avatar: member.userAvatar,
      role: member.role,
      consistencyPoints: member.consistencyPoints,
      lastActiveDate: member.lastActiveDate,
      joinedAt: member.joinedAt,
      todayCompleted: allDone,
      activeHabits: activeHabits.length,
      completedToday: completedLogs.length,
    });
  }

  return ok(c, { members: membersWithStatus });
});

// POST /groups/:id/freeze — Altruistic streak freeze
groupRoutes.post("/:id/freeze", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("id");

  // Verify membership
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return error(c, "NOT_A_MEMBER", "You are not a member of this group", 403);
  }

  // Check user has enough sparks
  if (user.sparks < FREEZE_COST_SPARKS) {
    return error(
      c,
      "INSUFFICIENT_SPARKS",
      `You need ${FREEZE_COST_SPARKS} Sparks to use a freeze (you have ${user.sparks})`
    );
  }

  const todayStr = today();

  // Check if freeze already used today for this group
  const [existingLink] = await db
    .select()
    .from(groupDayLinks)
    .where(
      and(
        eq(groupDayLinks.groupId, groupId),
        eq(groupDayLinks.date, todayStr)
      )
    )
    .limit(1);

  if (existingLink?.freezeUsed) {
    return error(
      c,
      "FREEZE_ALREADY_USED",
      "A freeze has already been used for this group today"
    );
  }

  // Deduct sparks
  await db
    .update(users)
    .set({
      sparks: sql`${users.sparks} - ${FREEZE_COST_SPARKS}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Mark freeze on the day link (upsert)
  await db
    .insert(groupDayLinks)
    .values({
      groupId,
      date: todayStr,
      completionPercentage: 0, // Will be updated when day is evaluated
      linkType: "silver", // Placeholder, will be resolved by evaluation
      freezeUsed: true,
    })
    .onConflictDoUpdate({
      target: [groupDayLinks.groupId, groupDayLinks.date],
      set: {
        freezeUsed: true,
      },
    });

  // Add feed item
  await addFeedItem(groupId, user.id, "freeze_used", {
    userName: user.name,
    sparksCost: FREEZE_COST_SPARKS,
  });

  return ok(c, {
    message: "Freeze activated for today",
    sparksCost: FREEZE_COST_SPARKS,
    remainingSparks: user.sparks - FREEZE_COST_SPARKS,
  });
});
