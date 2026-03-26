import "dotenv/config";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

interface GiphyGif {
  id: string;
  title: string;
  url: string;
  preview: string;
}

interface GiphyResult {
  id: string;
  title: string;
  images: {
    original: { url: string };
    fixed_height: { url: string };
    fixed_width_small: { url: string };
    preview_gif: { url: string };
  };
}

export async function searchGif(query: string): Promise<GiphyGif | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      api_key: GIPHY_API_KEY,
      limit: "10",
      rating: "pg",
      lang: "en",
    });

    const res = await fetch(`${GIPHY_BASE}/search?${params}`);
    if (!res.ok) return null;

    const data = (await res.json()) as { data: GiphyResult[] };
    if (!data.data?.length) return null;

    // Pick random from top 10 for variety
    const pick = data.data[Math.floor(Math.random() * data.data.length)];

    return {
      id: pick.id,
      title: pick.title,
      url: pick.images.fixed_height.url,
      preview: pick.images.fixed_width_small?.url || pick.images.preview_gif?.url,
    };
  } catch (err) {
    console.error("[giphy] Search failed:", err);
    return null;
  }
}

export async function getMemeForContext(context: string): Promise<GiphyGif | null> {
  const searchMappings: Record<string, string[]> = {
    morning: ["good morning motivation", "rise and grind", "lets go", "morning energy"],
    streak: ["winning streak", "on fire", "unstoppable", "keep going"],
    exercise: ["gym motivation", "workout", "exercise funny", "gym meme"],
    coding: ["programmer motivation", "coding meme", "hackerman", "developer life"],
    reading: ["reading meme", "book nerd", "knowledge power"],
    meditation: ["zen mode", "inner peace", "calm", "namaste"],
    missed: ["its okay", "tomorrow another day", "dont give up", "you got this"],
    comeback: ["comeback", "return of the king", "im back", "never give up"],
    perfect_day: ["perfect celebration", "nailed it", "flawless victory", "celebration dance"],
    group: ["team motivation", "squad goals", "stronger together", "teamwork"],
    nudge: ["friendly reminder", "hey you", "dont forget", "poke funny"],
  };

  const contextLower = context.toLowerCase();
  let searchQuery = "motivation funny";

  for (const [key, queries] of Object.entries(searchMappings)) {
    if (contextLower.includes(key)) {
      searchQuery = queries[Math.floor(Math.random() * queries.length)];
      break;
    }
  }

  return searchGif(searchQuery);
}
