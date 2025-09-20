import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/sessions?from=ISO&to=ISO
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Basic validation
  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to query params (ISO datetime)" },
      { status: 400 }
    );
  }

  // Fetch sessions in range with participants
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(
      `id, owner_id, start_time, end_time, duration_min, session_type, status, created_at, updated_at,
       session_participants ( user_id, joined_at )`
    )
    .gte("start_time", from)
    .lt("start_time", to)
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const mapped = (sessions ?? []).map((s) => {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    let status: "available" | "booked" | "in-progress" | "completed" =
      s.status ?? "available";
    const count = (s.session_participants?.length ?? 0) as number;
    if (now > end) status = "completed";
    else if (now >= start && now <= end) status = "in-progress";
    else if (count >= 2) status = "booked";

    return {
      id: s.id,
      owner_id: s.owner_id,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMin: s.duration_min as 25 | 50 | 75,
      sessionType: s.session_type as "focus" | "deep-work" | "learning",
      participants: s.session_participants ?? [],
      status,
    };
  });

  return NextResponse.json({ currentUserId: user.id, sessions: mapped });
}

// POST /api/sessions
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { start, durationMin, sessionType } = body as {
    start?: string;
    durationMin?: 25 | 50 | 75;
    sessionType?: "focus" | "deep-work" | "learning";
  };
  if (!start || !durationMin || !sessionType) {
    return NextResponse.json(
      { error: "Missing start, durationMin, or sessionType" },
      { status: 400 }
    );
  }
  const s = new Date(start);
  const e = new Date(s.getTime() + durationMin * 60_000);

  // Create session
  const { data: created, error } = await supabase
    .from("sessions")
    .insert({
      owner_id: user.id,
      start_time: s.toISOString(),
      end_time: e.toISOString(),
      duration_min: durationMin,
      session_type: sessionType,
      status: "available",
    })
    .select("id")
    .single();
  if (error || !created) {
    return NextResponse.json(
      { error: error?.message || "Failed to create" },
      { status: 500 }
    );
  }

  // Add owner as a participant by default
  await supabase
    .from("session_participants")
    .insert({ session_id: created.id, user_id: user.id });

  return NextResponse.json({ id: created.id });
}
