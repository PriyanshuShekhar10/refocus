import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  
  const currentUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });

  if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let userEmbedding = currentUser.embedding;

  const hasGeminiKey = !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  if (!userEmbedding && (hasGeminiKey || hasOpenAIKey)) {
      console.log("Generating missing embedding for user...");
      const finalFirst = currentUser.firstname ?? "";
      const finalLast = currentUser.lastname ?? "";
      const finalAbout = currentUser.about ?? "";
      const finalInterests = currentUser.interests ?? [];
      const textToEmbed = `Name: ${finalFirst} ${finalLast}. About: ${finalAbout}. Interests: ${finalInterests.join(", ")}.`;

      // Set Gemini key explicitly if needed
      if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
      }

      try {
          const embeddingModel = hasGeminiKey
            ? google.textEmbeddingModel("text-embedding-004")
            : openai.embedding("text-embedding-3-small");
          const { embedding } = await embed({
            model: embeddingModel,
            value: textToEmbed,
          });
          userEmbedding = embedding;
          await db.collection("users").updateOne(
              { _id: new ObjectId(userId) },
              { $set: { embedding: userEmbedding } }
          );
      } catch (e) {
          console.error("Failed to generate embedding on query", e);
          return NextResponse.json({ matches: [], error: "Failed to generate embedding" });
      }
  }

  if (!userEmbedding) {
      return NextResponse.json({ matches: [], warning: "No embedding available" });
  }

  try {
      const pipeline = [
          {
              $vectorSearch: {
                  index: "vector_index",
                  path: "embedding",
                  queryVector: userEmbedding,
                  numCandidates: 50, 
                  limit: 10       
              }
          },
          {
            $match: {
                _id: { $ne: new ObjectId(userId) }
            } 
          },
          {
              $project: {
                  name: 1,
                  firstname: 1, 
                  lastname: 1,
                  about: 1,
                  interests: 1,
                  image: 1,
                  score: { $meta: "vectorSearchScore" }
              }
          }
      ];

      const matches = await db.collection("users").aggregate(pipeline).toArray();
      return NextResponse.json({ matches });

  } catch (error) {
      console.error("Vector Search Error", error);
      return NextResponse.json({ error: "Vector search failed. Did you create the Atlas Index?", details: String(error) }, { status: 500 });
  }
}
