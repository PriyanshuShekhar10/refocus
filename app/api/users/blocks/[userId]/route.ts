import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { unblockUser } from "@/lib/blocking";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

// DELETE /api/users/blocks/[userId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(currentUserId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { userId } = await params;
  if (!ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const removed = await unblockUser(currentUserId, userId);
  if (!removed) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
