import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { escapeRegex } from "@/lib/communityMentions";
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
    const qRe = escapeRegex(q);
    filter.$or = [
      { email: { $regex: qRe, $options: "i" } },
      { canonicalEmail: { $regex: qRe, $options: "i" } },
      { username: { $regex: qRe, $options: "i" } },
      { name: { $regex: qRe, $options: "i" } },
      { firstname: { $regex: qRe, $options: "i" } },
      { lastname: { $regex: qRe, $options: "i" } },
      { signupIp: { $regex: qRe, $options: "i" } },
      { lastLoginIp: { $regex: qRe, $options: "i" } },
      { lastSeenIp: { $regex: qRe, $options: "i" } },
      { knownIps: { $regex: qRe, $options: "i" } },
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
