import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = params.id;
  // Check existing participants
  const { data: s, error: sErr } = await supabase
    .from("sessions")
    .select(
      `id, owner_id, start_time, end_time, duration_min, session_type, status,
       session_participants ( user_id )`
    )
    .eq("id", sessionId)
    .single();
  if (sErr || !s)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cannot join more than 2 participants
  const count = s.session_participants?.length ?? 0;
  if (count >= 2) {
    return NextResponse.json(
      { error: "Session already has 2 participants" },
      { status: 409 }
    );
  }
  // Do not duplicate
  if (s.session_participants?.some((p: any) => p.user_id === user.id)) {
    return NextResponse.json({ ok: true });
  }

  const { error: insErr } = await supabase
    .from("session_participants")
    .insert({ session_id: sessionId, user_id: user.id });
  if (insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 });

  // Update status
  await supabase
    .from("sessions")
    .update({ status: "booked", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  // Optional: send a notification via a simple table insert
  await supabase.from("notifications").insert({
    user_id: s.owner_id,
    type: "session_joined",
    payload: { session_id: sessionId, by_user_id: user.id },
  } as any);

  return NextResponse.json({ ok: true });
}
