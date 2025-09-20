import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
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
  // Ensure ownership
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id, owner_id")
    .eq("id", sessionId)
    .single();
  if (sErr || !session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.owner_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Delete participants first (if no on delete cascade)
  await supabase
    .from("session_participants")
    .delete()
    .eq("session_id", sessionId);
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
