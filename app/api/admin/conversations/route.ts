import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { listConversations } from "@/lib/adminConversations";

/** GET /api/admin/conversations?q= → who is privately messaging whom (latest first). */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const q = req.nextUrl.searchParams.get("q")?.slice(0, 100) ?? "";
  const db = await getDb();
  const conversations = await listConversations(db, { q });
  return NextResponse.json({ conversations });
}
