import { db } from "./client.js";
import { shopItems, users, userItems } from "./schema/index.js";
import { sql } from "drizzle-orm";

// ─── Full Shop Catalog ────────────────────────────────────────────────────────

type ShopItem = typeof shopItems.$inferInsert;

const catalog: ShopItem[] = [
  // ─── Themes ───────────────────────────────────────────────────────────────
  {
    id: "nocturnal",
    name: "Nocturnal Sanctuary",
    description: "Default. Warm amber on deep dark. Cozy lamp-in-a-dark-room.",
    category: "theme",
    sparksCost: 0,
    minRank: "bronze",
    assetKey: "themes/nocturnal",
  },
  {
    id: "daybreak",
    name: "Daybreak",
    description: "Light mode. Warm whites, soft peach, golden hour.",
    category: "theme",
    sparksCost: 100,
    minRank: "bronze",
    assetKey: "themes/daybreak",
  },
  {
    id: "deep-focus",
    name: "Deep Focus",
    description: "Near-monochrome. Muted everything. Just habits and numbers.",
    category: "theme",
    sparksCost: 100,
    minRank: "bronze",
    assetKey: "themes/deep-focus",
  },
  {
    id: "neon-terminal",
    name: "Neon Terminal",
    description: "Black background, green/cyan monospace. Hacker aesthetic.",
    category: "theme",
    sparksCost: 200,
    minRank: "silver",
    assetKey: "themes/neon-terminal",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep greens, earth tones, organic shapes.",
    category: "theme",
    sparksCost: 200,
    minRank: "silver",
    assetKey: "themes/forest",
  },
  {
    id: "sakura",
    name: "Sakura",
    description: "Soft pinks, lavender, cherry blossom.",
    category: "theme",
    sparksCost: 200,
    minRank: "silver",
    assetKey: "themes/sakura",
  },
  {
    id: "ocean-depth",
    name: "Ocean Depth",
    description: "Deep blues, bioluminescent accents.",
    category: "theme",
    sparksCost: 300,
    minRank: "gold",
    assetKey: "themes/ocean-depth",
  },
  {
    id: "platinum-noir",
    name: "Platinum Noir",
    description: "Dark silver, metallic, premium.",
    category: "theme",
    sparksCost: 300,
    minRank: "platinum",
    assetKey: "themes/platinum-noir",
  },
  {
    id: "diamond-aurora",
    name: "Diamond Aurora",
    description: "Northern lights gradient, animated shimmer.",
    category: "theme",
    sparksCost: 300,
    minRank: "diamond",
    assetKey: "themes/diamond-aurora",
  },

  // ─── App Icons ────────────────────────────────────────────────────────────
  {
    id: "icon-minimal",
    name: "Minimal",
    description: "Monochrome app icon.",
    category: "icon",
    sparksCost: 200,
    minRank: "silver",
    assetKey: "icons/minimal",
  },
  {
    id: "icon-neon",
    name: "Neon",
    description: "Glowing app icon.",
    category: "icon",
    sparksCost: 200,
    minRank: "silver",
    assetKey: "icons/neon",
  },
  {
    id: "icon-gold",
    name: "Gold",
    description: "Gold-accented app icon.",
    category: "icon",
    sparksCost: 200,
    minRank: "gold",
    assetKey: "icons/gold",
  },

  // ─── Streak Flames ────────────────────────────────────────────────────────
  {
    id: "flame-blue",
    name: "Blue Flame",
    description: "Blue streak flame icon.",
    category: "flame",
    sparksCost: 50,
    minRank: "bronze",
    assetKey: "flames/blue",
  },
  {
    id: "flame-purple",
    name: "Purple Flame",
    description: "Purple streak flame icon.",
    category: "flame",
    sparksCost: 50,
    minRank: "bronze",
    assetKey: "flames/purple",
  },
  {
    id: "flame-golden",
    name: "Golden Flame",
    description: "Golden streak flame icon.",
    category: "flame",
    sparksCost: 50,
    minRank: "silver",
    assetKey: "flames/golden",
  },
  {
    id: "flame-pixel",
    name: "Pixel Fire",
    description: "Pixel-art fire streak icon.",
    category: "flame",
    sparksCost: 50,
    minRank: "silver",
    assetKey: "flames/pixel",
  },
  {
    id: "flame-lightning",
    name: "Lightning Bolt",
    description: "Lightning bolt streak icon.",
    category: "flame",
    sparksCost: 50,
    minRank: "gold",
    assetKey: "flames/lightning",
  },

  // ─── Check Animations ─────────────────────────────────────────────────────
  {
    id: "anim-confetti",
    name: "Confetti Burst",
    description: "Confetti burst on habit completion.",
    category: "animation",
    sparksCost: 75,
    minRank: "bronze",
    assetKey: "animations/confetti",
  },
  {
    id: "anim-sakura",
    name: "Sakura Petals",
    description: "Sakura petals on habit completion.",
    category: "animation",
    sparksCost: 75,
    minRank: "silver",
    assetKey: "animations/sakura",
  },
  {
    id: "anim-pixel",
    name: "Pixel Explosion",
    description: "Pixel explosion on habit completion.",
    category: "animation",
    sparksCost: 75,
    minRank: "silver",
    assetKey: "animations/pixel",
  },
  {
    id: "anim-lightning",
    name: "Lightning Strike",
    description: "Lightning strike on habit completion.",
    category: "animation",
    sparksCost: 75,
    minRank: "gold",
    assetKey: "animations/lightning",
  },
  {
    id: "anim-water",
    name: "Water Splash",
    description: "Water splash on habit completion.",
    category: "animation",
    sparksCost: 75,
    minRank: "bronze",
    assetKey: "animations/water",
  },

  // ─── Habit Card Styles ────────────────────────────────────────────────────
  {
    id: "card-glass",
    name: "Glassmorphic",
    description: "Glassmorphic habit card style.",
    category: "card_style",
    sparksCost: 100,
    minRank: "silver",
    assetKey: "cards/glass",
  },
  {
    id: "card-neon",
    name: "Neon Glow Border",
    description: "Neon glow border habit card style.",
    category: "card_style",
    sparksCost: 100,
    minRank: "gold",
    assetKey: "cards/neon",
  },
  {
    id: "card-paper",
    name: "Textured Paper",
    description: "Textured paper habit card style.",
    category: "card_style",
    sparksCost: 100,
    minRank: "silver",
    assetKey: "cards/paper",
  },

  // ─── Font Packs ───────────────────────────────────────────────────────────
  {
    id: "font-mono",
    name: "Monospace",
    description: "Monospace font pack.",
    category: "font",
    sparksCost: 150,
    minRank: "silver",
    assetKey: "fonts/mono",
  },
  {
    id: "font-handwritten",
    name: "Handwritten",
    description: "Handwritten font pack.",
    category: "font",
    sparksCost: 150,
    minRank: "silver",
    assetKey: "fonts/handwritten",
  },
  {
    id: "font-serif",
    name: "Serif",
    description: "Serif font pack.",
    category: "font",
    sparksCost: 150,
    minRank: "gold",
    assetKey: "fonts/serif",
  },

  // ─── Background Patterns ──────────────────────────────────────────────────
  {
    id: "pattern-dots",
    name: "Dots",
    description: "Subtle dot pattern background.",
    category: "pattern",
    sparksCost: 50,
    minRank: "bronze",
    assetKey: "patterns/dots",
  },
  {
    id: "pattern-grid",
    name: "Grid",
    description: "Subtle grid pattern background.",
    category: "pattern",
    sparksCost: 50,
    minRank: "bronze",
    assetKey: "patterns/grid",
  },
  {
    id: "pattern-waves",
    name: "Waves",
    description: "Subtle wave pattern background.",
    category: "pattern",
    sparksCost: 50,
    minRank: "silver",
    assetKey: "patterns/waves",
  },
  {
    id: "pattern-topo",
    name: "Topographic",
    description: "Topographic map pattern background.",
    category: "pattern",
    sparksCost: 50,
    minRank: "silver",
    assetKey: "patterns/topo",
  },

  // ─── Profile Frames ───────────────────────────────────────────────────────
  {
    id: "frame-bronze",
    name: "Bronze Ring",
    description: "Bronze ring around your avatar.",
    category: "profile_frame",
    sparksCost: 150,
    minRank: "bronze",
    assetKey: "frames/bronze",
  },
  {
    id: "frame-gold",
    name: "Gold Ring",
    description: "Gold ring around your avatar.",
    category: "profile_frame",
    sparksCost: 300,
    minRank: "gold",
    assetKey: "frames/gold",
  },
  {
    id: "frame-flame",
    name: "Flame Ring",
    description: "Animated flame ring around your avatar.",
    category: "profile_frame",
    sparksCost: 400,
    minRank: "gold",
    assetKey: "frames/flame",
  },
  {
    id: "frame-diamond",
    name: "Diamond Ring",
    description: "Diamond ring around your avatar.",
    category: "profile_frame",
    sparksCost: 500,
    minRank: "diamond",
    assetKey: "frames/diamond",
  },

  // ─── Profile Banners ──────────────────────────────────────────────────────
  {
    id: "banner-mountain",
    name: "Mountain",
    description: "Mountain landscape profile banner.",
    category: "profile_banner",
    sparksCost: 200,
    minRank: "silver",
    assetKey: "banners/mountain",
  },
  {
    id: "banner-ocean",
    name: "Ocean",
    description: "Ocean landscape profile banner.",
    category: "profile_banner",
    sparksCost: 200,
    minRank: "silver",
    assetKey: "banners/ocean",
  },
  {
    id: "banner-cityscape",
    name: "Cityscape",
    description: "Cityscape profile banner.",
    category: "profile_banner",
    sparksCost: 200,
    minRank: "gold",
    assetKey: "banners/cityscape",
  },
  {
    id: "banner-space",
    name: "Space",
    description: "Space profile banner.",
    category: "profile_banner",
    sparksCost: 200,
    minRank: "platinum",
    assetKey: "banners/space",
  },

  // ─── Social: Name Color ───────────────────────────────────────────────────
  {
    id: "name-color",
    name: "Name Color in Party Chat",
    description: "Custom color for your name in group chat.",
    category: "name_color",
    sparksCost: 250,
    minRank: "gold",
    assetKey: "social/name-color",
  },

  // ─── Celebrations ─────────────────────────────────────────────────────────
  {
    id: "celebration-fireworks",
    name: "Fireworks",
    description: "Fireworks celebration style for milestones.",
    category: "celebration",
    sparksCost: 100,
    minRank: "bronze",
    assetKey: "celebrations/fireworks",
  },
  {
    id: "celebration-sparkles",
    name: "Sparkles",
    description: "Sparkles celebration style for milestones.",
    category: "celebration",
    sparksCost: 100,
    minRank: "silver",
    assetKey: "celebrations/sparkles",
  },
  {
    id: "celebration-aurora",
    name: "Aurora",
    description: "Aurora celebration style for milestones.",
    category: "celebration",
    sparksCost: 100,
    minRank: "gold",
    assetKey: "celebrations/aurora",
  },

  // ─── Milestone Cards ──────────────────────────────────────────────────────
  {
    id: "milestone-minimalist",
    name: "Minimalist",
    description: "Minimalist streak milestone card design.",
    category: "milestone_card",
    sparksCost: 150,
    minRank: "silver",
    assetKey: "milestones/minimalist",
  },
  {
    id: "milestone-retro",
    name: "Retro",
    description: "Retro streak milestone card design.",
    category: "milestone_card",
    sparksCost: 150,
    minRank: "silver",
    assetKey: "milestones/retro",
  },
  {
    id: "milestone-neon",
    name: "Neon",
    description: "Neon streak milestone card design.",
    category: "milestone_card",
    sparksCost: 150,
    minRank: "gold",
    assetKey: "milestones/neon",
  },
  {
    id: "milestone-watercolor",
    name: "Watercolor",
    description: "Watercolor streak milestone card design.",
    category: "milestone_card",
    sparksCost: 150,
    minRank: "gold",
    assetKey: "milestones/watercolor",
  },

  // ─── Party Badges ─────────────────────────────────────────────────────────
  {
    id: "badge-coffee",
    name: "Coffee",
    description: "Coffee badge next to your name in party.",
    category: "party_badge",
    sparksCost: 75,
    minRank: "bronze",
    assetKey: "badges/coffee",
  },
  {
    id: "badge-crown",
    name: "Crown",
    description: "Crown badge next to your name in party.",
    category: "party_badge",
    sparksCost: 75,
    minRank: "silver",
    assetKey: "badges/crown",
  },
  {
    id: "badge-sword",
    name: "Sword",
    description: "Sword badge next to your name in party.",
    category: "party_badge",
    sparksCost: 75,
    minRank: "silver",
    assetKey: "badges/sword",
  },
  {
    id: "badge-rocket",
    name: "Rocket",
    description: "Rocket badge next to your name in party.",
    category: "party_badge",
    sparksCost: 75,
    minRank: "gold",
    assetKey: "badges/rocket",
  },

  // ─── Completion Sounds ────────────────────────────────────────────────────
  {
    id: "sound-coin",
    name: "Coin Collect",
    description: "Coin collect sound on habit check-off.",
    category: "sound",
    sparksCost: 50,
    minRank: "bronze",
    assetKey: "sounds/coin",
  },
  {
    id: "sound-levelup",
    name: "Level Up",
    description: "Level up sound on habit check-off.",
    category: "sound",
    sparksCost: 50,
    minRank: "bronze",
    assetKey: "sounds/levelup",
  },
  {
    id: "sound-typewriter",
    name: "Typewriter Click",
    description: "Typewriter click sound on habit check-off.",
    category: "sound",
    sparksCost: 50,
    minRank: "silver",
    assetKey: "sounds/typewriter",
  },
  {
    id: "sound-sword",
    name: "Sword Slash",
    description: "Sword slash sound on habit check-off.",
    category: "sound",
    sparksCost: 50,
    minRank: "silver",
    assetKey: "sounds/sword",
  },
  {
    id: "sound-zen",
    name: "Zen Bell",
    description: "Zen bell sound on habit check-off.",
    category: "sound",
    sparksCost: 50,
    minRank: "bronze",
    assetKey: "sounds/zen",
  },
  {
    id: "sound-custom-tone",
    name: "Custom Notification Tone",
    description: "Custom notification tone sound.",
    category: "sound",
    sparksCost: 75,
    minRank: "silver",
    assetKey: "sounds/custom-tone",
  },

  // ─── Freeze Animations ────────────────────────────────────────────────────
  {
    id: "freeze-ice",
    name: "Ice Crystal",
    description: "Ice crystal animation when a freeze saves your streak.",
    category: "freeze_animation",
    sparksCost: 100,
    minRank: "silver",
    assetKey: "freeze/ice",
  },
  {
    id: "freeze-shield",
    name: "Shield Bubble",
    description: "Shield bubble animation when a freeze saves your streak.",
    category: "freeze_animation",
    sparksCost: 100,
    minRank: "silver",
    assetKey: "freeze/shield",
  },
  {
    id: "freeze-rewind",
    name: "Time Rewind",
    description: "Time rewind animation when a freeze saves your streak.",
    category: "freeze_animation",
    sparksCost: 100,
    minRank: "gold",
    assetKey: "freeze/rewind",
  },
  {
    id: "freeze-angel",
    name: "Angel Wings",
    description: "Angel wings animation when a freeze saves your streak.",
    category: "freeze_animation",
    sparksCost: 100,
    minRank: "gold",
    assetKey: "freeze/angel",
  },

  // ─── Summary Styles ───────────────────────────────────────────────────────
  {
    id: "summary-newspaper",
    name: "Newspaper Headline",
    description: "Newspaper headline style for daily summary.",
    category: "summary_style",
    sparksCost: 150,
    minRank: "silver",
    assetKey: "summaries/newspaper",
  },
  {
    id: "summary-game",
    name: "Game Stats Screen",
    description: "Game stats screen style for daily summary.",
    category: "summary_style",
    sparksCost: 150,
    minRank: "silver",
    assetKey: "summaries/game",
  },
  {
    id: "summary-receipt",
    name: "Receipt",
    description: "Receipt style for daily summary.",
    category: "summary_style",
    sparksCost: 150,
    minRank: "gold",
    assetKey: "summaries/receipt",
  },

  // ─── Party Entrances ──────────────────────────────────────────────────────
  {
    id: "entrance-drop",
    name: "Drop from Top",
    description: "Your avatar drops from the top in party view.",
    category: "party_entrance",
    sparksCost: 75,
    minRank: "bronze",
    assetKey: "entrances/drop",
  },
  {
    id: "entrance-teleport",
    name: "Teleport",
    description: "Your avatar teleports into party view.",
    category: "party_entrance",
    sparksCost: 75,
    minRank: "silver",
    assetKey: "entrances/teleport",
  },
  {
    id: "entrance-flame",
    name: "Flame Entrance",
    description: "Your avatar enters party view with flames.",
    category: "party_entrance",
    sparksCost: 75,
    minRank: "gold",
    assetKey: "entrances/flame",
  },

  // ─── Quality of Life Unlocks ──────────────────────────────────────────────
  {
    id: "qol-categories",
    name: "Habit Categories/Folders",
    description: "Organize habits into custom groups.",
    category: "qol",
    sparksCost: 0,
    minRank: "silver",
    assetKey: null,
  },
  {
    id: "qol-custom-reminders",
    name: "Custom Reminder Messages",
    description: "Write your own notification text.",
    category: "qol",
    sparksCost: 0,
    minRank: "gold",
    assetKey: null,
  },
  {
    id: "qol-data-export",
    name: "Data Export (CSV/JSON)",
    description: "Export all habit history.",
    category: "qol",
    sparksCost: 0,
    minRank: "silver",
    assetKey: null,
  },
  {
    id: "qol-freeze-pack",
    name: "Multi-Day Freeze Pack (3 days)",
    description: "Three freezes at once for vacations.",
    category: "qol",
    sparksCost: 200,
    minRank: "gold",
    assetKey: null,
  },
  {
    id: "qol-secret-habit",
    name: "Secret Habit Mode",
    description:
      "Habit invisible to ALL social context — not even percentage or streak visible.",
    category: "qol",
    sparksCost: 100,
    minRank: "silver",
    assetKey: null,
  },
  {
    id: "qol-emoji-picker",
    name: "Full Emoji Picker for Habits",
    description: "Use any emoji as habit icon (default is limited set).",
    category: "qol",
    sparksCost: 50,
    minRank: "bronze",
    assetKey: null,
  },

  // ─── Seasonal / Limited-Time (placeholder entries) ────────────────────────
  {
    id: "seasonal-new-year",
    name: "New Year's Gold",
    description: "Limited-time New Year's gold theme.",
    category: "seasonal",
    sparksCost: 250,
    minRank: "bronze",
    assetKey: "seasonal/new-year",
    isSeasonal: true,
    availableFrom: new Date("2026-12-25"),
    availableUntil: new Date("2027-01-07"),
  },
  {
    id: "seasonal-summer",
    name: "Summer Sunset",
    description: "Limited-time summer sunset theme.",
    category: "seasonal",
    sparksCost: 250,
    minRank: "bronze",
    assetKey: "seasonal/summer",
    isSeasonal: true,
    availableFrom: new Date("2026-06-01"),
    availableUntil: new Date("2026-08-31"),
  },
  {
    id: "seasonal-halloween",
    name: "Halloween Dark",
    description: "Limited-time Halloween dark theme.",
    category: "seasonal",
    sparksCost: 250,
    minRank: "bronze",
    assetKey: "seasonal/halloween",
    isSeasonal: true,
    availableFrom: new Date("2026-10-15"),
    availableUntil: new Date("2026-11-02"),
  },
  {
    id: "seasonal-diwali",
    name: "Diwali Lights",
    description: "Limited-time Diwali lights theme.",
    category: "seasonal",
    sparksCost: 250,
    minRank: "bronze",
    assetKey: "seasonal/diwali",
    isSeasonal: true,
    availableFrom: new Date("2026-10-20"),
    availableUntil: new Date("2026-11-10"),
  },
];

// ─── Test Users ─────────────────────────────────────────────────────────────

const testUsers = [
  {
    firebaseUid: "test-uid-alice",
    email: "alice@test.dev",
    name: "Alice",
    xp: 600,
    sparks: 500,
    rank: "silver" as const,
    personaType: "achiever" as const,
  },
  {
    firebaseUid: "test-uid-bob",
    email: "bob@test.dev",
    name: "Bob",
    xp: 2500,
    sparks: 1200,
    rank: "gold" as const,
    personaType: "socialiser" as const,
  },
  {
    firebaseUid: "test-uid-charlie",
    email: "charlie@test.dev",
    name: "Charlie",
    xp: 50,
    sparks: 50,
    rank: "bronze" as const,
    personaType: "general" as const,
  },
];

// ─── Seed Runner ────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding database...");

  // Upsert shop items (idempotent — safe to re-run)
  console.log(`  Inserting ${catalog.length} shop items...`);
  for (const item of catalog) {
    await db
      .insert(shopItems)
      .values(item)
      .onConflictDoUpdate({
        target: shopItems.id,
        set: {
          name: item.name,
          description: item.description,
          category: item.category,
          sparksCost: item.sparksCost,
          minRank: item.minRank,
          assetKey: item.assetKey,
          isSeasonal: item.isSeasonal ?? false,
          availableFrom: item.availableFrom ?? null,
          availableUntil: item.availableUntil ?? null,
        },
      });
  }
  console.log("  Shop items seeded.");

  // Upsert test users (idempotent on firebase_uid)
  console.log(`  Inserting ${testUsers.length} test users...`);
  for (const user of testUsers) {
    await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.firebaseUid,
        set: {
          name: user.name,
          email: user.email,
          xp: user.xp,
          sparks: user.sparks,
          rank: user.rank,
          personaType: user.personaType,
        },
      });
  }
  console.log("  Test users seeded.");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
