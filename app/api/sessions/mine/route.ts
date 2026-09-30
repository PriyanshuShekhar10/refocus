import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadMySessions } from "@/lib/mySessions";

/** Upcoming + past sessions for the Sessions tab (same data as /sessions). */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { upcoming, past } = await loadMySessions(userId);
  return NextResponse.json({ currentUserId: userId, upcoming, past });
}
