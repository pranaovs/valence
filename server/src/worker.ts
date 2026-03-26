import "dotenv/config";

// Import all job workers (they self-register with BullMQ on import)
import { dailyStreakWorker } from "./jobs/daily-streak.js";
import { pluginPollerWorker } from "./jobs/plugin-poller.js";
import { preemptiveNudgeWorker } from "./jobs/preemptive-nudge.js";
import { eveningReflectionWorker } from "./jobs/evening-reflection.js";
import { morningActivationWorker } from "./jobs/morning-activation.js";
import { weeklyLeaderboardWorker } from "./jobs/weekly-leaderboard.js";

// Import queues to set up repeatable jobs
import {
  dailyStreakQueue,
  pluginPollerQueue,
  preemptiveNudgeQueue,
  eveningReflectionQueue,
  morningActivationQueue,
  weeklyLeaderboardQueue,
} from "./jobs/queues.js";

async function setupRepeatableJobs(): Promise<void> {
  // Daily streak calculation at 00:05 UTC
  await dailyStreakQueue.upsertJobScheduler(
    "daily-streak-scheduler",
    { pattern: "5 0 * * *" },
    { name: "daily-streak-run" }
  );

  // Plugin poller every 2 hours
  await pluginPollerQueue.upsertJobScheduler(
    "plugin-poller-scheduler",
    { pattern: "0 */2 * * *" },
    { name: "plugin-poller-run" }
  );

  // Weekly leaderboard at Monday 00:00 UTC
  await weeklyLeaderboardQueue.upsertJobScheduler(
    "weekly-leaderboard-scheduler",
    { pattern: "0 0 * * 1" },
    { name: "weekly-leaderboard-run" }
  );

  // Morning activation: every hour (workers filter by user timezone at 07:00)
  await morningActivationQueue.upsertJobScheduler(
    "morning-activation-scheduler",
    { pattern: "0 * * * *" },
    { name: "morning-activation-run" }
  );

  // Preemptive nudge: every hour (workers filter by user timezone at 14:00)
  await preemptiveNudgeQueue.upsertJobScheduler(
    "preemptive-nudge-scheduler",
    { pattern: "0 * * * *" },
    { name: "preemptive-nudge-run" }
  );

  // Evening reflection: every hour (workers filter by user timezone at 21:00)
  await eveningReflectionQueue.upsertJobScheduler(
    "evening-reflection-scheduler",
    { pattern: "0 * * * *" },
    { name: "evening-reflection-run" }
  );
}

async function main(): Promise<void> {
  console.log("[valance-worker] Starting BullMQ workers...");

  await setupRepeatableJobs();

  console.log("[valance-worker] Repeatable job schedules registered:");
  console.log("  - daily-streak:        cron '5 0 * * *'     (00:05 UTC daily)");
  console.log("  - plugin-poller:       cron '0 */2 * * *'   (every 2 hours)");
  console.log("  - weekly-leaderboard:  cron '0 0 * * 1'     (Monday 00:00 UTC)");
  console.log("  - morning-activation:  cron '0 * * * *'     (hourly, filters tz=07:00)");
  console.log("  - preemptive-nudge:    cron '0 * * * *'     (hourly, filters tz=14:00)");
  console.log("  - evening-reflection:  cron '0 * * * *'     (hourly, filters tz=21:00)");
  console.log("[valance-worker] All workers active. Waiting for jobs...");

  // Keep process alive
  const workers = [
    dailyStreakWorker,
    pluginPollerWorker,
    preemptiveNudgeWorker,
    eveningReflectionWorker,
    morningActivationWorker,
    weeklyLeaderboardWorker,
  ];

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[valance-worker] Shutting down workers...");
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[valance-worker] Fatal error:", err);
  process.exit(1);
});
