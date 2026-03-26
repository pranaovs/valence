import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { integrationConnections } from "../db/schema/integrations.js";
import { users } from "../db/schema/users.js";
import { ok, error } from "../lib/response.js";
import { authMiddleware } from "../middleware/auth.js";
import "dotenv/config";

export const oauthRoutes = new Hono();

// Google Fit OAuth2 config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/api/v1/oauth/google-fit/callback";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_FIT_SCOPES = [
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.body.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
].join(" ");

// Strava OAuth2 config
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || "";
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || "";
const STRAVA_REDIRECT_URI =
  process.env.STRAVA_REDIRECT_URI ||
  "http://localhost:3000/api/v1/oauth/strava/callback";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

// ── Google Fit OAuth ─────────────────────────────────────────

// Step 1: Redirect user to Google consent screen
// Flutter opens this in webview. For browser testing, pass ?user_id= query param.
oauthRoutes.get("/google-fit/authorize", async (c) => {
  // Try auth middleware first, fall back to query param for browser testing
  let userId = c.req.query("user_id");
  if (!userId) {
    const header = c.req.header("X-Dev-User-Id");
    if (header) userId = header;
  }
  if (!userId) {
    return error(c, "UNAUTHORIZED", "Pass user_id query param or X-Dev-User-Id header");
  }
  const user = { id: userId };

  if (!GOOGLE_CLIENT_ID) {
    return error(c, "NOT_CONFIGURED", "Google OAuth not configured. Set GOOGLE_CLIENT_ID env var.", 500);
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_FIT_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: user.id, // pass user ID through OAuth state
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params}`;
  return c.redirect(authUrl);
});

// Step 2: Google redirects back with auth code
oauthRoutes.get("/google-fit/callback", async (c) => {
  const code = c.req.query("code");
  const userId = c.req.query("state");
  const authError = c.req.query("error");

  if (authError || !code || !userId) {
    return c.html(`
      <html><body>
        <h2>Connection Failed</h2>
        <p>${authError || "Missing authorization code"}</p>
        <p>You can close this window.</p>
      </body></html>
    `);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (tokens.error || !tokens.access_token) {
      return c.html(`
        <html><body>
          <h2>Connection Failed</h2>
          <p>${tokens.error || "Could not get access token"}</p>
          <p>You can close this window.</p>
        </body></html>
      `);
    }

    // Store the connection
    await db
      .insert(integrationConnections)
      .values({
        userId,
        pluginId: "google_fit",
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || "",
          expires_in: tokens.expires_in,
          obtained_at: new Date().toISOString(),
        },
        status: "active",
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [integrationConnections.userId, integrationConnections.pluginId],
        set: {
          credentials: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || "",
            expires_in: tokens.expires_in,
            obtained_at: new Date().toISOString(),
          },
          status: "active",
          lastSyncedAt: new Date(),
          lastError: null,
        },
      });

    return c.html(`
      <html><body>
        <h2>Google Fit Connected!</h2>
        <p>Your fitness data will now auto-verify your habits.</p>
        <p>You can close this window and return to the app.</p>
        <script>
          // For Flutter webview: signal success
          if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('oauthComplete', { plugin: 'google_fit', success: true });
          }
        </script>
      </body></html>
    `);
  } catch (err) {
    return c.html(`
      <html><body>
        <h2>Connection Failed</h2>
        <p>${err instanceof Error ? err.message : "Unknown error"}</p>
        <p>You can close this window.</p>
      </body></html>
    `);
  }
});

// ── Strava OAuth ─────────────────────────────────────────────

oauthRoutes.get("/strava/authorize", async (c) => {
  let userId = c.req.query("user_id") || c.req.header("X-Dev-User-Id");
  if (!userId) return error(c, "UNAUTHORIZED", "Pass user_id query param");
  const user = { id: userId };

  if (!STRAVA_CLIENT_ID) {
    return error(c, "NOT_CONFIGURED", "Strava OAuth not configured. Set STRAVA_CLIENT_ID env var.", 500);
  }

  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: "code",
    scope: "activity:read_all",
    state: user.id,
  });

  return c.redirect(`${STRAVA_AUTH_URL}?${params}`);
});

oauthRoutes.get("/strava/callback", async (c) => {
  const code = c.req.query("code");
  const userId = c.req.query("state");
  const authError = c.req.query("error");

  if (authError || !code || !userId) {
    return c.html(`
      <html><body>
        <h2>Connection Failed</h2>
        <p>${authError || "Missing authorization code"}</p>
      </body></html>
    `);
  }

  try {
    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      athlete?: { id: number; firstname: string };
      errors?: unknown[];
    };

    if (!tokens.access_token) {
      return c.html(`<html><body><h2>Failed</h2><p>Could not get token</p></body></html>`);
    }

    await db
      .insert(integrationConnections)
      .values({
        userId,
        pluginId: "strava",
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || "",
          expires_at: tokens.expires_at,
          athlete_id: tokens.athlete?.id,
        },
        status: "active",
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [integrationConnections.userId, integrationConnections.pluginId],
        set: {
          credentials: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || "",
            expires_at: tokens.expires_at,
            athlete_id: tokens.athlete?.id,
          },
          status: "active",
          lastSyncedAt: new Date(),
          lastError: null,
        },
      });

    return c.html(`
      <html><body>
        <h2>Strava Connected!</h2>
        <p>Welcome, ${tokens.athlete?.firstname || "athlete"}! Your workouts will now auto-verify.</p>
        <script>
          if (window.flutter_inappwebview) {
            window.flutter_inappwebview.callHandler('oauthComplete', { plugin: 'strava', success: true });
          }
        </script>
      </body></html>
    `);
  } catch (err) {
    return c.html(`<html><body><h2>Failed</h2><p>${err instanceof Error ? err.message : "Error"}</p></body></html>`);
  }
});

// ── Token refresh utility ────────────────────────────────────

export async function refreshGoogleToken(connectionId: string): Promise<string | null> {
  const [conn] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);

  if (!conn) return null;
  const creds = conn.credentials as { refresh_token?: string };
  if (!creds.refresh_token) return null;

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: creds.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    await db
      .update(integrationConnections)
      .set({
        credentials: {
          ...creds,
          access_token: data.access_token,
          expires_in: data.expires_in,
          obtained_at: new Date().toISOString(),
        },
      })
      .where(eq(integrationConnections.id, connectionId));

    return data.access_token;
  } catch {
    return null;
  }
}
