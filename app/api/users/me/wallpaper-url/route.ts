import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { url } = await req.json().catch(() => ({ url: null }));
  
  if (url !== null && typeof url !== "string") {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  // Only allow our predefined relative paths for security.
  if (url !== null && !url.startsWith("/")) {
      return NextResponse.json({ error: "Invalid wallpaper url" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { "preferences.dashboardWallpaperUrl": url } }
  );

  return NextResponse.json({ wallpaperUrl: url });
}
