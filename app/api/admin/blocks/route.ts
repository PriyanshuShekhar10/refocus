import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { escapeRegex } from "@/lib/communityMentions";

const MAX_LIMIT = 100;
const MAX_SEARCH_USERS = 200;

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
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50", 10) || 50,
    MAX_LIMIT,
  );
  const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10) || 0, 0);

  const db = await getDb();
  const filter: Record<string, unknown> = {};

  if (q) {
    const escaped = escapeRegex(q);
    const matched = await db
      .collection("users")
      .find(
        {
          $or: [
            { email: { $regex: escaped, $options: "i" } },
            { username: { $regex: escaped, $options: "i" } },
            { name: { $regex: escaped, $options: "i" } },
            { firstname: { $regex: escaped, $options: "i" } },
            { lastname: { $regex: escaped, $options: "i" } },
          ],
        },
        { projection: { _id: 1 } },
      )
      .limit(MAX_SEARCH_USERS)
      .toArray();

    const ids = matched.map((u) => String(u._id));
    if (ObjectId.isValid(q)) ids.push(q);

    if (ids.length === 0) {
      return NextResponse.json({
        total: 0,
        uniqueBlockers: 0,
        skip,
        limit,
        blocks: [],
      });
    }

    filter.$or = [
      { blocker_id: { $in: ids } },
      { blocked_id: { $in: ids } },
    ];
  }

  const col = db.collection("user_blocks");
  const [rows, total, blockerIds] = await Promise.all([
    col
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    col.countDocuments(filter),
    col.distinct("blocker_id", filter),
  ]);

  const userIds = [
    ...new Set(
      rows.flatMap((r) =>
        [r.blocker_id, r.blocked_id].filter(
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
    uniqueBlockers: Array.isArray(blockerIds) ? blockerIds.length : 0,
    skip,
    limit,
    blocks: rows.map((r) => {
      const blockerId = String(r.blocker_id ?? "");
      const blockedId = String(r.blocked_id ?? "");
      const blocker = person(blockerId, byId);
      const blocked = person(blockedId, byId);
      const created = r.created_at ? new Date(r.created_at as Date) : null;
      return {
        id: String(r._id),
        createdAt:
          created && !Number.isNaN(created.getTime())
            ? created.toISOString()
            : null,
        blocker,
        blocked,
        summary: `${blocker.label} blocked ${blocked.label}`,
      };
    }),
  });
}
