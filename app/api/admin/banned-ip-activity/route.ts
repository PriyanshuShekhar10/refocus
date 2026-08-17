import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const db = await getDb();
  const rows = await db
    .collection("banned_ip_activity")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const bannedIds = [
    ...new Set(rows.flatMap((r) => (r.matchedBannedUserIds as string[]) ?? [])),
  ].filter((id) => ObjectId.isValid(id));

  const bannedUsers = bannedIds.length
    ? await db
        .collection("users")
        .find(
          { _id: { $in: bannedIds.map((id) => new ObjectId(id)) } },
          { projection: { email: 1, username: 1, name: 1, firstname: 1 } },
        )
        .toArray()
    : [];
  const bannedById = Object.fromEntries(
    bannedUsers.map((u) => [
      String(u._id),
      {
        email: (u.email as string | undefined) ?? null,
        label:
          (u.name as string | undefined) ||
          (u.firstname as string | undefined) ||
          (u.username as string | undefined) ||
          (u.email as string | undefined) ||
          String(u._id),
      },
    ]),
  );

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: String(r._id),
      ip: r.ip ?? null,
      attemptedEmail: r.attemptedEmail ?? null,
      outcome: r.outcome ?? "created",
      createdUserId: r.createdUserId ?? null,
      matchedBannedUsers: ((r.matchedBannedUserIds as string[]) ?? []).map(
        (id) => ({
          id,
          email: bannedById[id]?.email ?? null,
          label: bannedById[id]?.label ?? id,
        }),
      ),
      createdAt: r.createdAt
        ? new Date(r.createdAt as Date).toISOString()
        : null,
    })),
  });
}
