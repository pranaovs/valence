import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.js";
import { habitsRoutes } from "./routes/habits.js";
import { groupRoutes } from "./routes/groups.js";
import { socialRoutes } from "./routes/social.js";
import { shopRoutes } from "./routes/shop.js";
import { insightsRoutes } from "./routes/insights.js";
import { notificationRoutes } from "./routes/notifications.js";
import { userRoutes } from "./routes/users.js";
import { pluginRoutes } from "./routes/plugins.js";
import { uploadRoutes } from "./routes/uploads.js";
import { oauthRoutes } from "./routes/oauth.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "fs";
import { join } from "path";
import "dotenv/config";

const swaggerUiPath = join(process.cwd(), "node_modules", "swagger-ui-dist");

const app = new Hono();

// --- Global middleware ---
app.use("*", cors());
app.onError(errorHandler);

// --- Swagger UI ---
app.get("/docs", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Valance API Docs</title>
  <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: "/openapi.yaml", dom_id: "#swagger-ui", presets: [SwaggerUIBundle.presets.apis] });
  </script>
</body>
</html>`;
  return c.html(html);
});

app.get("/openapi.yaml", (c) => {
  const yaml = readFileSync(join(process.cwd(), "openapi.yaml"), "utf-8");
  c.header("Content-Type", "text/yaml");
  return c.body(yaml);
});

app.get("/swagger-ui/*", (c) => {
  const file = c.req.path.replace("/swagger-ui/", "");
  try {
    const content = readFileSync(`${swaggerUiPath}/${file}`);
    const ext = file.split(".").pop();
    const types: Record<string, string> = { css: "text/css", js: "application/javascript", png: "image/png", map: "application/json" };
    c.header("Content-Type", types[ext || ""] || "application/octet-stream");
    return c.body(content);
  } catch {
    return c.notFound();
  }
});

// --- Health check ---
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- API v1 routes ---
const api = new Hono();
api.route("/auth", authRoutes);
api.route("/habits", habitsRoutes);
api.route("/groups", groupRoutes);
api.route("/social", socialRoutes);
api.route("/shop", shopRoutes);
api.route("/insights", insightsRoutes);
api.route("/notifications", notificationRoutes);
api.route("/users", userRoutes);
api.route("/plugins", pluginRoutes);
api.route("/uploads", uploadRoutes);
api.route("/oauth", oauthRoutes);

app.route("/api/v1", api);

// --- Serve uploaded files statically ---
app.use("/uploads/*", serveStatic({ root: "./" }));

// --- Start server ---
const port = parseInt(process.env.PORT || "3000", 10);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`[valance] Server running on http://0.0.0.0:${info.port}`);
  console.log(`[valance] Local network: http://${process.env.HOST_IP || "0.0.0.0"}:${info.port}`);
});

export default app;
