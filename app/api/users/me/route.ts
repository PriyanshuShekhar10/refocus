import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const user = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    {
      projection: {
        email: 1,
        username: 1,
        name: 1,
        firstname: 1,
        lastname: 1,
        about: 1,
        interests: 1,
        location: 1,
        website: 1,
      },
    }
  )) as null | {
    email?: string;
    username?: string | null;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    about?: string | null;
    interests?: string[] | null;
    location?: string | null;
    website?: string | null;
  };

  return NextResponse.json({
    user: user
      ? {
          email: user.email,
          username: user.username ?? null,
          name: user.name ?? null,
          firstname: user.firstname ?? null,
          lastname: user.lastname ?? null,
          about: user.about ?? null,
          interests: user.interests ?? [],
          location: user.location ?? null,
          website: user.website ?? null,
        }
      : null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit profile updates
  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { username, firstname, lastname, about, interests, location, website } = body as {
    username?: string;
    firstname?: string;
    lastname?: string;
    about?: string;
    interests?: string[];
    location?: string;
    website?: string;
  };

  const db = await getDb();

  // Validate and update username if provided
  if (username !== undefined) {
    const trimmed = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,20}$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters and contain only letters, numbers, hyphens, or underscores" },
        { status: 400 }
      );
    }
    // Check availability (excluding current user)
    const existing = await db.collection("users").findOne(
      { username: trimmed, _id: { $ne: new ObjectId(userId) } },
      { projection: { _id: 1 } }
    );
    if (existing) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
  }

  // Build update object with only provided fields
  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (username !== undefined) updateFields.username = username.trim().toLowerCase();
  if (firstname !== undefined) updateFields.firstname = firstname;
  if (lastname !== undefined) updateFields.lastname = lastname;
  if (about !== undefined) updateFields.about = about;
  if (interests !== undefined) updateFields.interests = interests;
  if (location !== undefined) updateFields.location = location;
  if (website !== undefined) updateFields.website = website;

  const relevantForEmbedding =
    firstname !== undefined ||
    lastname !== undefined ||
    about !== undefined ||
    interests !== undefined;

  let currentUser = undefined;
  if (relevantForEmbedding) {
    currentUser = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });

    if (firstname !== undefined || lastname !== undefined) {
        const newFirstname = firstname ?? currentUser?.firstname ?? "";
        const newLastname = lastname ?? currentUser?.lastname ?? "";
        updateFields.name = [newFirstname, newLastname].filter(Boolean).join(" ");
    }

    const finalFirst = firstname ?? currentUser?.firstname ?? "";
    const finalLast = lastname ?? currentUser?.lastname ?? "";
    const finalAbout = about ?? currentUser?.about ?? "";
    const finalInterests = interests ?? currentUser?.interests ?? [];

    const textToEmbed = `Name: ${finalFirst} ${finalLast}. About: ${finalAbout}. Interests: ${finalInterests.join(", ")}.`;

    try {
        const hasGeminiKey = !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
        const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

        if (hasGeminiKey || hasOpenAIKey) {
            const embeddingModel = hasGeminiKey
                ? createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY! }).textEmbeddingModel("text-embedding-004")
                : openai.embedding("text-embedding-3-small");
            const { embedding } = await embed({
                model: embeddingModel,
                value: textToEmbed,
            });
            updateFields.embedding = embedding;
        }
    } catch (e) {
        console.warn("Embedding generation failed:", e);
    }
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateFields },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
