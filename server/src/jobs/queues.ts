import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

const connection = redis;

export const dailyStreakQueue = new Queue("daily-streak", { connection });
export const pluginPollerQueue = new Queue("plugin-poller", { connection });
export const preemptiveNudgeQueue = new Queue("preemptive-nudge", { connection });
export const eveningReflectionQueue = new Queue("evening-reflection", { connection });
export const morningActivationQueue = new Queue("morning-activation", { connection });
export const weeklyLeaderboardQueue = new Queue("weekly-leaderboard", { connection });
