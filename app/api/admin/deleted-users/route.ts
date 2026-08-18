import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import {
  DELETED_USERS_COLLECTION,
  serializeDeletedUser,
  type DeletedUserRecord,
} from "@/lib/deletedUsers";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "40", 10), 100);
  const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { email: { $regex: q, $options: "i" } },
      { canonicalEmail: { $regex: q, $options: "i" } },
      { username: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
      { firstname: { $regex: q, $options: "i" } },
      { lastname: { $regex: q, $options: "i" } },
      { signupIp: { $regex: q, $options: "i" } },
      { lastLoginIp: { $regex: q, $options: "i" } },
      { lastSeenIp: { $regex: q, $options: "i" } },
      { knownIps: { $regex: q, $options: "i" } },
    ];
  }

  const db = await getDb();
  const col = db.collection<DeletedUserRecord>(DELETED_USERS_COLLECTION);
  const [rows, total] = await Promise.all([
    col
      .find(filter)
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    col.countDocuments(filter),
  ]);

  return NextResponse.json({
    users: rows.map(serializeDeletedUser),
    total,
    skip,
    limit,
  });
}
