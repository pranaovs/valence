import { pgEnum } from "drizzle-orm/pg-core";

export const intensityEnum = pgEnum("intensity", [
  "light",
  "moderate",
  "intense",
]);

export const trackingMethodEnum = pgEnum("tracking_method", [
  "plugin",
  "manual",
]);

export const visibilityEnum = pgEnum("visibility", ["full", "minimal"]);

export const goalStageEnum = pgEnum("goal_stage", [
  "ignition",
  "foundation",
  "momentum",
  "formed",
]);

export const rankEnum = pgEnum("rank", [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);

export const personaTypeEnum = pgEnum("persona_type", [
  "socialiser",
  "achiever",
  "general",
]);

export const groupTierEnum = pgEnum("group_tier", [
  "spark",
  "ember",
  "flame",
  "blaze",
]);

export const groupRoleEnum = pgEnum("group_role", ["admin", "member"]);

export const linkTypeEnum = pgEnum("link_type", [
  "gold",
  "silver",
  "broken",
]);

export const missReasonEnum = pgEnum("miss_reason", [
  "sick",
  "busy",
  "forgot",
  "no_energy",
  "other",
]);

export const verificationSourceEnum = pgEnum("verification_source", [
  "manual",
  "photo",
  "leetcode",
  "github",
  "wakapi",
  "google_fit",
  "duolingo",
  "screen_time",
  "strava",
  "chess_com",
  "todoist",
]);

export const shopCategoryEnum = pgEnum("shop_category", [
  "theme",
  "flame",
  "animation",
  "card_style",
  "font",
  "pattern",
  "icon",
  "profile_frame",
  "profile_banner",
  "name_color",
  "celebration",
  "milestone_card",
  "party_badge",
  "sound",
  "freeze_animation",
  "summary_style",
  "party_entrance",
  "qol",
  "seasonal",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "active",
  "error",
  "expired",
  "revoked",
]);

export const feedItemTypeEnum = pgEnum("feed_item_type", [
  "completion",
  "perfect_day",
  "nudge",
  "kudos",
  "streak_milestone",
  "goal_milestone",
  "group_link_gold",
  "group_link_silver",
  "group_link_broken",
  "group_tier_change",
  "rank_promotion",
  "freeze_used",
  "status_norm",
  "member_joined",
  "member_left",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "morning_activation",
  "friend_nudge",
  "preemptive_warning",
  "reflection_prompt",
  "kudos_received",
  "streak_milestone",
  "goal_milestone",
  "group_link_forged",
  "rank_promotion",
  "weekly_summary",
]);
