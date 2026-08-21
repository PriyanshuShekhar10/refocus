import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";
import {
  addEngagementCrewMember,
  listEngagementCrew,
  removeEngagementCrewMember,
} from "@/lib/engagementCrew";

function publicCrewUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/crew`;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const members = await listEngagementCrew();
  return NextResponse.json({
    members,
    publicUrl: publicCrewUrl(req.nextUrl.origin),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email : "";
  const result = await addEngagementCrewMember({
    email,
    addedBy: gate.admin.userId,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  await logAdminAction({
    actorId: gate.admin.userId,
    actorEmail: gate.admin.email,
    action: "crew.add",
    targetUserId: result.member.userId,
    targetUserEmail: result.member.email,
    targetLabel: result.member.name,
    details: { email: result.member.email },
  });

  return NextResponse.json({ ok: true, member: result.member });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email : "";
  const result = await removeEngagementCrewMember(email);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  await logAdminAction({
    actorId: gate.admin.userId,
    actorEmail: gate.admin.email,
    action: "crew.remove",
    targetUserEmail: email.trim().toLowerCase(),
    details: { email: email.trim().toLowerCase() },
  });

  return NextResponse.json({ ok: true });
}
