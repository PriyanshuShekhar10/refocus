import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";
import {
  getStoredDailyActiveId,
  listDailyAccounts,
  listDailyAccountsPublic,
  setDailyActiveId,
} from "@/lib/dailyAccounts";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const accounts = listDailyAccountsPublic();
  const storedId = await getStoredDailyActiveId();
  const activeId =
    storedId && accounts.some((a) => a.id === storedId)
      ? storedId
      : (accounts[0]?.id ?? null);

  return NextResponse.json({ accounts, activeId });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const activeId =
    typeof body?.activeId === "string" ? body.activeId.trim() : "";

  if (!activeId) {
    return NextResponse.json({ error: "activeId is required" }, { status: 400 });
  }

  const accounts = listDailyAccounts();
  const next = accounts.find((a) => a.id === activeId);
  if (!next) {
    return NextResponse.json(
      { error: "Unknown Daily account id" },
      { status: 400 },
    );
  }

  try {
    const { previousId, account } = await setDailyActiveId(
      activeId,
      guard.admin.userId,
    );

    const previous = previousId
      ? accounts.find((a) => a.id === previousId)
      : accounts[0];

    if (previousId !== account.id) {
      await logAdminAction({
        actorId: guard.admin.userId,
        actorEmail: guard.admin.email,
        action: "daily.switch_account",
        details: {
          fromId: previousId ?? previous?.id ?? null,
          toId: account.id,
          fromDomain: previous?.domain ?? null,
          toDomain: account.domain,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      activeId: account.id,
      accounts: listDailyAccountsPublic(),
    });
  } catch (e) {
    const message = (e as Error).message;
    if (message === "Unknown Daily account id") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw e;
  }
}
