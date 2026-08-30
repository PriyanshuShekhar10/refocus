import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import {
  PRODUCT_UPDATE_BODY_MAX,
  PRODUCT_UPDATE_TITLE_MAX,
} from "@/lib/productUpdates.constants";

const enhanceSchema = z.object({
  title: z
    .string()
    .nullable()
    .describe("Short notification title, or null if none needed"),
  body: z.string().describe("The main update message"),
});

function clampTitle(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.trim().slice(0, PRODUCT_UPDATE_TITLE_MAX);
}

function clampBody(value: string): string {
  return value.trim().slice(0, PRODUCT_UPDATE_BODY_MAX);
}

async function enhanceWithAi(input: {
  title?: string;
  body: string;
}): Promise<{ title: string | null; body: string }> {
  const systemPrompt = `You polish in-app product update notifications for Refocus, a friendly body-doubling and focus app.

Rewrite the admin's draft into a short, warm, human notification that feels like a helpful nudge — not corporate marketing.

Rules:
1. Keep the same factual meaning; do not invent features or promises.
2. Body: concise, friendly, conversational (1–3 short sentences max). Aim under 200 characters when possible.
3. Title: optional punchy label (2–5 words). Use null if a title adds no value.
4. No markdown, emoji, hashtags, or quotation marks around the whole message.
5. No greetings like "Hi everyone" or sign-offs.
6. Prefer plain language over jargon.
7. If the draft is empty or nonsense, return a gentle placeholder body asking the admin to describe the update.`;

  const userPrompt = [
    input.title?.trim()
      ? `Current title: ${input.title.trim()}`
      : "Current title: (none)",
    `Current message: ${input.body.trim() || "(empty)"}`,
    "",
    `Hard limits: title max ${PRODUCT_UPDATE_TITLE_MAX} chars, body max ${PRODUCT_UPDATE_BODY_MAX} chars.`,
  ].join("\n");

  const run = async (model: Parameters<typeof generateObject>[0]["model"]) =>
    generateObject({
      model,
      schema: enhanceSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not found");
    }
    const result = await run(openai("gpt-4o-mini"));
    return {
      title: clampTitle(result.object.title),
      body: clampBody(result.object.body),
    };
  } catch (openaiError) {
    console.warn(
      "OpenAI enhance failed, attempting Gemini fallback:",
      openaiError,
    );
    const result = await run(google("gemini-1.5-flash"));
    return {
      title: clampTitle(result.object.title),
      body: clampBody(result.object.body),
    };
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const rl = await checkRateLimit(guard.admin.userId, "ai");
  if (!rl.success) return rateLimitedResponse(rl);

  const payload = (await req.json().catch(() => ({}))) as {
    title?: unknown;
    body?: unknown;
  };

  const title = typeof payload.title === "string" ? payload.title : "";
  const body = typeof payload.body === "string" ? payload.body : "";

  if (!title.trim() && !body.trim()) {
    return NextResponse.json(
      { error: "Add a title or message to enhance" },
      { status: 400 },
    );
  }

  try {
    const enhanced = await enhanceWithAi({ title, body });
    if (!enhanced.body) {
      return NextResponse.json(
        { error: "Could not enhance message" },
        { status: 500 },
      );
    }
    return NextResponse.json(enhanced);
  } catch (error) {
    console.error("Admin update enhance error:", error);
    return NextResponse.json(
      { error: "Failed to enhance message. Try again in a moment." },
      { status: 500 },
    );
  }
}
