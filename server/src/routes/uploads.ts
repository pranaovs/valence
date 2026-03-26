import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { ok, error } from "../lib/response.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { nanoid } from "nanoid";

export const uploadRoutes = new Hono();

uploadRoutes.use("*", authMiddleware);

const UPLOAD_DIR = join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// POST /uploads/photo — Upload a proof photo, returns URL
uploadRoutes.post("/photo", async (c) => {
  const user = c.get("user");

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || typeof file === "string") {
    return error(c, "NO_FILE", "No file uploaded. Send as multipart form with field 'file'.");
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return error(c, "INVALID_TYPE", `File type ${file.type} not allowed. Use JPEG, PNG, WebP, or GIF.`);
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > maxSize) {
    return error(c, "FILE_TOO_LARGE", "File must be under 10MB.");
  }

  // Generate unique filename
  const ext = file.name?.split(".").pop() || "jpg";
  const filename = `${user.id}_${nanoid(12)}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  // Write file
  writeFileSync(filepath, Buffer.from(buffer));

  // Return URL (served statically)
  const host = c.req.header("host") || "localhost:3000";
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const url = `${protocol}://${host}/uploads/${filename}`;

  return ok(c, { url, filename }, 201);
});
