import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listWelcomeAnnouncements } from "@/lib/welcomeAnnouncements";

// GET — Discord-style welcome board (newest first)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  const { announcements, nextCursor } = await listWelcomeAnnouncements({
    limit,
    cursor,
  });

  return NextResponse.json({ announcements, nextCursor });
}
