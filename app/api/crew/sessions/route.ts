import { NextRequest, NextResponse } from "next/server";
import { getCrewMemberSessions } from "@/lib/crewSessions";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim() ?? "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 40;
  if (!Number.isFinite(limit)) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  const result = await getCrewMemberSessions({ email, limit });
  return NextResponse.json(result);
}
