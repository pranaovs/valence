import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  fallback: string = "Keep going — you're making progress!"
): Promise<string> {
  try {
    const result = await geminiFlash.generateContent(
      `${systemPrompt}\n\n${userPrompt}`
    );
    return result.response.text();
  } catch (err) {
    console.error("[gemini] generateText failed, using fallback:", err);
    return fallback;
  }
}

export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  fallback?: T
): Promise<T> {
  try {
    const result = await geminiFlash.generateContent(
      `${systemPrompt}\n\n${userPrompt}\n\nRespond with valid JSON only. No markdown, no code fences.`
    );
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("[gemini] generateJSON failed, using fallback:", err);
    if (fallback !== undefined) return fallback;
    throw err;
  }
}
