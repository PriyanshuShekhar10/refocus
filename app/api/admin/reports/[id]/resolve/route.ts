import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { resolveContentReport } from "@/lib/adminReportResolve";
import type { ReportResolution } from "@/lib/reports";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { resolution, muteDays, note } = body as {
    resolution?: ReportResolution;
    muteDays?: number;
    note?: string;
  };

  if (
    !resolution ||
    !["dismiss", "delete_content", "mute", "ban"].includes(resolution)
  ) {
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  }

  try {
    await resolveContentReport(id, guard.admin, resolution, { muteDays, note });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}
