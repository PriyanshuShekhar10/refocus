import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id } = await context.params;
  const { action } = body as { action?: "accept" | "decline" };
  if (!action)
    return NextResponse.json({ error: "Missing action" }, { status: 400 });

  // Only the receiver can update status
  const { data: fr, error: frErr } = await supabase
    .from("friend_requests")
    .select("id, to_user_id, status")
    .eq("id", id)
    .single();
  if (frErr) {
    const msg = (frErr.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "friend_requests table not found" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!fr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (fr.to_user_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const nextStatus = action === "accept" ? "accepted" : "declined";
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: nextStatus, responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "friend_requests table not found" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
