import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { dismissProductUpdate } from "@/lib/productUpdates";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  const ok = await dismissProductUpdate(db, userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
