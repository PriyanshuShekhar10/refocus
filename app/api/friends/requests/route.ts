import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/friends/requests { to_user_id }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { to_user_id } = body as { to_user_id?: string };
  if (!to_user_id)
    return NextResponse.json({ error: "Missing to_user_id" }, { status: 400 });
  if (to_user_id === user.id)
    return NextResponse.json(
      { error: "Cannot friend yourself" },
      { status: 400 }
    );

  const { error } = await supabase
    .from("friend_requests")
    .insert({ from_user_id: user.id, to_user_id, status: "pending" });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "friend_requests table not found. Apply the database migration.",
          hint: "Run supabase/schema.sql",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// GET /api/friends/requests?type=incoming|outgoing
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "incoming";

  const column = type === "outgoing" ? "from_user_id" : "to_user_id";
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .eq(column, user.id)
    .order("created_at", { ascending: false });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return NextResponse.json(
        { requests: [], hint: "friend_requests table not found" },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ requests: data || [] });
}
