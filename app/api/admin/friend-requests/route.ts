import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

const MAX_LIMIT = 80;

function userLabel(u: unknown): string {
  if (!u || typeof u !== "object") return "Unknown";
  const rec = u as Record<string, unknown>;
  const firstname = typeof rec.firstname === "string" ? rec.firstname : "";
  const lastname = typeof rec.lastname === "string" ? rec.lastname : "";
  const name = typeof rec.name === "string" ? rec.name : null;
  const username = typeof rec.username === "string" ? rec.username : null;
  const email = typeof rec.email === "string" ? rec.email : null;
  return (
    [firstname, lastname].filter(Boolean).join(" ") ||
    name ||
    (username ? `@${username}` : null) ||
    email ||
    "Unknown"
  );
}

function person(
  id: string,
  byId: Record<
    string,
    { id: string; label: string; username: string | null; email: string | null }
  >,
) {
  return (
    byId[id] ?? {
      id,
      label: id,
      username: null,
      email: null,
    }
  );
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50", 10) || 50,
    MAX_LIMIT,
  );

  const db = await getDb();
  const filter = { status: "pending" };

  const [rows, total] = await Promise.all([
    db
      .collection("friend_requests")
      .find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray(),
    db.collection("friend_requests").countDocuments(filter),
  ]);

  const userIds = [
    ...new Set(
      rows.flatMap((r) =>
        [r.from_user_id, r.to_user_id].filter(
          (id): id is string => typeof id === "string" && ObjectId.isValid(id),
        ),
      ),
    ),
  ];

  const users = userIds.length
    ? await db
        .collection("users")
        .find(
          { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
          {
            projection: {
              email: 1,
              username: 1,
              name: 1,
              firstname: 1,
              lastname: 1,
            },
          },
        )
        .toArray()
    : [];

  const byId = Object.fromEntries(
    users.map((u) => [
      String(u._id),
      {
        id: String(u._id),
        label: userLabel(u),
        username: typeof u.username === "string" ? u.username : null,
        email: typeof u.email === "string" ? u.email : null,
      },
    ]),
  );

  return NextResponse.json({
    total,
    requests: rows.map((r) => {
      const fromId = String(r.from_user_id ?? "");
      const toId = String(r.to_user_id ?? "");
      const from = person(fromId, byId);
      const to = person(toId, byId);
      const created = r.created_at ? new Date(r.created_at as Date) : null;
      return {
        id: String(r._id),
        createdAt:
          created && !Number.isNaN(created.getTime())
            ? created.toISOString()
            : null,
        from,
        to,
        summary: `${from.label} → ${to.label}`,
      };
    }),
  });
}
