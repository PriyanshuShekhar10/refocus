import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: sessionId } = await context.params;
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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await context.params;
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id, owner_id")
    .eq("id", sessionId)
    .single();
  if (sErr || !session)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.owner_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, color } = body as {
    name?: string | null;
    color?: string | null;
  };
  const updates: {
    updated_at: string;
    name?: string | null;
    color?: string | null;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof name !== "undefined") updates.name = name;
  if (typeof color !== "undefined") updates.color = color;

  let { error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", sessionId);
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (
      msg.includes("column") &&
      (msg.includes("name") || msg.includes("color"))
    ) {
      const fallback = { updated_at: updates.updated_at };
      const { error: e2 } = await supabase
        .from("sessions")
        .update(fallback)
        .eq("id", sessionId);
      if (!e2) {
        return NextResponse.json({
          ok: true,
          hint: "name/color not available; updated timestamp only",
        });
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
