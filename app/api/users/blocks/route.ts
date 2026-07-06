import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { blockUser } from "@/lib/blocking";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

// POST /api/users/blocks { blocked_user_id }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(currentUserId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { blocked_user_id } = body as { blocked_user_id?: string };
  if (!blocked_user_id) {
    return NextResponse.json(
      { error: "Missing blocked_user_id" },
      { status: 400 },
    );
  }
  if (!ObjectId.isValid(blocked_user_id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  if (blocked_user_id === currentUserId) {
    return NextResponse.json(
      { error: "Cannot block yourself" },
      { status: 400 },
    );
  }

  try {
    const result = await blockUser(currentUserId, blocked_user_id);
    return NextResponse.json({ ok: true, created: result.created });
  } catch (e) {
    const message = (e as Error).message;
    if (message === "User not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
