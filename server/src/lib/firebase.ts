import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import "dotenv/config";

const serviceAccountPath = "./firebase-service-account.json";

if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export const auth = admin.auth();
export const messaging = admin.messaging();
export default admin;
