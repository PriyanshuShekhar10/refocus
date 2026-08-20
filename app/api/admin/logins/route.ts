import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { mergeKnownIps } from "@/lib/userIps";

const LOGIN_METHODS = ["credentials", "google"] as const;
const MAX_LIMIT = 500;

function parseIso(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD in UTC (fallback when from/to omitted). */
function utcDayRange(ymd: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(Date.UTC(y, m - 1, d + 1));
  return { start, end };
}

function todayUtcYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const userIdParam = (searchParams.get("userId") ?? "").trim();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "200", 10) || 200,
    MAX_LIMIT,
  );

  const from = parseIso(searchParams.get("from"));
  const to = parseIso(searchParams.get("to"));
  const dateParam = (searchParams.get("date") ?? "").trim();

  let rangeStart: Date | null = from;
  let rangeEnd: Date | null = to;
  let dateLabel: string | null = null;

  if (!rangeStart || !rangeEnd) {
    const ymd = dateParam || (!userIdParam && !q ? todayUtcYmd() : "");
    if (ymd) {
      const range = utcDayRange(ymd);
      if (!range) {
        return NextResponse.json(
          { error: "Invalid date (use YYYY-MM-DD)" },
          { status: 400 },
        );
      }
      rangeStart = range.start;
      rangeEnd = range.end;
      dateLabel = ymd;
    }
  } else {
    dateLabel = searchParams.get("date") || rangeStart.toISOString().slice(0, 10);
  }

  if (rangeStart && rangeEnd && rangeEnd <= rangeStart) {
    return NextResponse.json(
      { error: "`to` must be after `from`" },
      { status: 400 },
    );
  }

  const db = await getDb();

  // Ensure day-range scans stay fast.
  await db
    .collection("user_login_events")
    .createIndex({ method: 1, at: -1 })
    .catch(() => undefined);
  await db
    .collection("user_login_events")
    .createIndex({ userId: 1, at: -1 })
    .catch(() => undefined);

  let resolvedUserId: string | null = null;
  let userSummary: Record<string, unknown> | null = null;

  if (userIdParam) {
    if (!ObjectId.isValid(userIdParam)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    resolvedUserId = userIdParam;
  } else if (q) {
    const match = await db
      .collection("users")
      .find(
        {
          $or: [
            { email: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
            { name: { $regex: q, $options: "i" } },
            { firstname: { $regex: q, $options: "i" } },
            { lastname: { $regex: q, $options: "i" } },
          ],
        },
        {
          projection: {
            email: 1,
            username: 1,
            name: 1,
            firstname: 1,
            lastname: 1,
            createdAt: 1,
            signupIp: 1,
            lastLoginIp: 1,
            lastLoginAt: 1,
            lastSeenIp: 1,
            lastSeenAt: 1,
            knownIps: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
    if (!match) {
      return NextResponse.json({
        date: dateLabel,
        mode: "user",
        count: 0,
        uniqueUsers: 0,
        user: null,
        logins: [],
        message: "No user matched that search",
      });
    }
    resolvedUserId = String(match._id);
  }

  if (resolvedUserId) {
    const u = await db.collection("users").findOne(
      { _id: new ObjectId(resolvedUserId) },
      {
        projection: {
          email: 1,
          username: 1,
          name: 1,
          firstname: 1,
          lastname: 1,
          createdAt: 1,
          signupIp: 1,
          lastLoginIp: 1,
          lastLoginAt: 1,
          lastSeenIp: 1,
          lastSeenAt: 1,
          knownIps: 1,
        },
      },
    );
    if (!u) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const known = mergeKnownIps({
      signupIp: (u.signupIp as string | null | undefined) ?? null,
      lastLoginIp: (u.lastLoginIp as string | null | undefined) ?? null,
      lastSeenIp: (u.lastSeenIp as string | null | undefined) ?? null,
      knownIps: (u.knownIps as Array<{
        ip?: string | null;
        firstSeenAt?: Date | string | null;
        lastSeenAt?: Date | string | null;
        count?: number | null;
      }> | null) ?? null,
    });
    userSummary = {
      id: resolvedUserId,
      email: (u.email as string | undefined) ?? null,
      username: (u.username as string | undefined) ?? null,
      name:
        [u.firstname, u.lastname].filter(Boolean).join(" ") ||
        (u.name as string | undefined) ||
        null,
      createdAt: u.createdAt
        ? new Date(u.createdAt as Date).toISOString()
        : null,
      signupIp: (u.signupIp as string | undefined) ?? null,
      lastLoginIp: (u.lastLoginIp as string | undefined) ?? null,
      lastLoginAt: u.lastLoginAt
        ? new Date(u.lastLoginAt as Date).toISOString()
        : null,
      lastSeenIp: (u.lastSeenIp as string | undefined) ?? null,
      lastSeenAt: u.lastSeenAt
        ? new Date(u.lastSeenAt as Date).toISOString()
        : null,
      knownIps: known.map((row) => ({
        ip: row.ip,
        firstSeenAt: row.firstSeenAt.toISOString(),
        lastSeenAt: row.lastSeenAt.toISOString(),
        count: row.count,
      })),
    };
  }

  const filter: Record<string, unknown> = {
    method: { $in: [...LOGIN_METHODS] },
  };
  if (resolvedUserId) filter.userId = resolvedUserId;
  if (rangeStart && rangeEnd) {
    filter.at = { $gte: rangeStart, $lt: rangeEnd };
  }

  const rows = await db
    .collection("user_login_events")
    .find(filter)
    .sort({ at: -1 })
    .limit(limit)
    .toArray();

  const userIds = [
    ...new Set(
      rows
        .map((r) => String(r.userId ?? ""))
        .filter((id) => ObjectId.isValid(id)),
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
        email: (u.email as string | undefined) ?? null,
        username: (u.username as string | undefined) ?? null,
        name:
          [u.firstname, u.lastname].filter(Boolean).join(" ") ||
          (u.name as string | undefined) ||
          null,
      },
    ]),
  );

  const logins = rows.map((r) => {
    const uid = String(r.userId ?? "");
    const profile = byId[uid];
    return {
      id: String(r._id),
      at: r.at ? new Date(r.at as Date).toISOString() : null,
      method: r.method === "google" ? "google" : "credentials",
      ip: (r.ip as string | null | undefined) ?? null,
      userId: uid,
      email: profile?.email ?? null,
      username: profile?.username ?? null,
      name: profile?.name ?? null,
    };
  });

  return NextResponse.json({
    date: dateLabel,
    mode: resolvedUserId ? "user" : "day",
    from: rangeStart?.toISOString() ?? null,
    to: rangeEnd?.toISOString() ?? null,
    count: logins.length,
    uniqueUsers: new Set(logins.map((l) => l.userId)).size,
    user: userSummary,
    logins,
  });
}
