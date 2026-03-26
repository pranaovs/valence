import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { rankEnum, personaTypeEnum } from "./enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: varchar("firebase_uid", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  avatar: varchar("avatar", { length: 500 }),
  xp: integer("xp").notNull().default(0),
  sparks: integer("sparks").notNull().default(0),
  rank: rankEnum("rank").notNull().default("bronze"),
  personaType: personaTypeEnum("persona_type").notNull().default("general"),
  equipped: jsonb("equipped")
    .notNull()
    .$type<{
      theme: string;
      flame: string;
      animation: string;
      card_style: string;
      font: string;
      pattern: string;
      icon: string;
      profile_frame: string | null;
      profile_banner: string | null;
      party_badge: string | null;
      celebration: string;
      milestone_card: string;
      sound: string;
      freeze_animation: string;
      summary_style: string;
      party_entrance: string;
      name_color: string | null;
    }>()
    .default({
      theme: "nocturnal",
      flame: "default",
      animation: "default",
      card_style: "default",
      font: "default",
      pattern: "none",
      icon: "default",
      profile_frame: null,
      profile_banner: null,
      party_badge: null,
      celebration: "default",
      milestone_card: "default",
      sound: "default",
      freeze_animation: "default",
      summary_style: "default",
      party_entrance: "default",
      name_color: null,
    }),
  notificationPreferences: jsonb("notification_preferences")
    .notNull()
    .$type<{
      morning: boolean;
      nudges: boolean;
      memes: boolean;
      reflection: boolean;
    }>()
    .default({
      morning: true,
      nudges: true,
      memes: true,
      reflection: true,
    }),
  timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
  fcmToken: varchar("fcm_token", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
