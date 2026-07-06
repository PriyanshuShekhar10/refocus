import {NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { getBlockedUserIds } from "@/lib/blocking";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit AI / vector-search calls
  const rl = await checkRateLimit(userId, "ai");
  if (!rl.success) return rateLimitedResponse(rl);

  const db = await getDb();
  
  const currentUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });

  if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userEmbedding = currentUser.embedding;

  // If no embedding yet, tell the user to complete their profile.
  // Embeddings are generated automatically when the profile is saved
  // (via PATCH /api/users/me), so we avoid the latency and external-API
  // call of generating one synchronously during the match request.
  if (!userEmbedding) {
      return NextResponse.json({
        matches: [],
        warning: "Please complete your profile (name, about, interests) so we can find matches for you.",
      });
  }

  try {
      const blockedIds = await getBlockedUserIds(userId);
      const blockedObjectIds = Array.from(blockedIds)
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));

      const matchFilter: Record<string, unknown> = {
        _id: { $ne: new ObjectId(userId) },
      };
      if (blockedObjectIds.length > 0) {
        matchFilter._id = {
          $ne: new ObjectId(userId),
          $nin: blockedObjectIds,
        };
      }

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
            $match: matchFilter
          },
          {
              $project: {
                  name: 1,
                  firstname: 1, 
                  lastname: 1,
                  about: 1,
                  interests: 1,
                  image: 1,
                  avatar_url: 1,
                  score: { $meta: "vectorSearchScore" }
              }
          }
      ];

      const matches = await db.collection("users").aggregate(pipeline).toArray();
      return NextResponse.json({
        matches: matches.map((m) => ({
          ...m,
          image: resolveAvatarUrl(m as { avatar_url?: string | null; image?: string | null }),
        })),
      });

  } catch (error) {
      console.error("Vector Search Error", error);
      return NextResponse.json({ error: "Vector search failed. Did you create the Atlas Index?", details: String(error) }, { status: 500 });
  }
}
