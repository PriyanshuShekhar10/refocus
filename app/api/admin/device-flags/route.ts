import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { canonicalEmail } from "@/lib/normalizeEmail";
import { mergeKnownIps } from "@/lib/userIps";
import type { DeviceSignalDoc, DeviceSignalType } from "@/lib/userDevices";

const MAX_LIMIT = 200;
const DEMO_EMAIL = "demo@refocus.co.in";

type UserDoc = {
  _id: ObjectId;
  email?: string | null;
  username?: string | null;
  name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  role?: string | null;
  signupIp?: string | null;
  lastLoginIp?: string | null;
  lastSeenIp?: string | null;
  knownIps?: Array<{ ip?: string | null }> | null;
};

type AccountOut = {
  userId: string;
  email: string | null;
  username: string | null;
  name: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;
  lastIp: string | null;
  firstSeenSource: "login" | "signup";
};

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50", 10) || 50,
    MAX_LIMIT,
  );

  const db = await getDb();

  // Devices/fingerprints tied to >= 2 distinct accounts, independently per
  // signal type, merged below if the same account set matched on both.
  const groups = (await db
    .collection<DeviceSignalDoc>("device_signals")
    .aggregate([
      {
        $group: {
          _id: { signalType: "$signalType", signalValue: "$signalValue" },
          userIds: { $addToSet: "$userId" },
          lastSeenAt: { $max: "$lastSeenAt" },
        },
      },
      { $match: { $expr: { $gte: [{ $size: "$userIds" }, 2] } } },
      { $sort: { lastSeenAt: -1 } },
      { $limit: limit * 2 }, // headroom before merge + noise filtering below
    ])
    .toArray()) as Array<{
    _id: { signalType: DeviceSignalType; signalValue: string };
    userIds: string[];
    lastSeenAt: Date;
  }>;

  if (groups.length === 0) {
    return NextResponse.json({ count: 0, devices: [] });
  }

  const allUserIds = [...new Set(groups.flatMap((g) => g.userIds))].filter(
    (id) => ObjectId.isValid(id),
  );

  const [users, crewDocs] = await Promise.all([
    db
      .collection<UserDoc>("users")
      .find(
        { _id: { $in: allUserIds.map((id) => new ObjectId(id)) } },
        {
          projection: {
            email: 1,
            username: 1,
            name: 1,
            firstname: 1,
            lastname: 1,
            role: 1,
            signupIp: 1,
            lastLoginIp: 1,
            lastSeenIp: 1,
            knownIps: 1,
          },
        },
      )
      .toArray(),
    db
      .collection<{ userId?: string; canonicalEmail?: string }>("engagement_crew")
      .find({}, { projection: { userId: 1, canonicalEmail: 1 } })
      .toArray(),
  ]);

  const crewUserIds = new Set(crewDocs.map((c) => c.userId).filter(Boolean));
  const crewEmails = new Set(crewDocs.map((c) => c.canonicalEmail).filter(Boolean));

  const usersById = new Map(users.map((u) => [String(u._id), u]));

  const isNoiseUser = (userId: string): boolean => {
    const u = usersById.get(userId);
    if (!u) return false;
    const email = (u.email || "").trim().toLowerCase();
    if (u.role === "admin") return true;
    if (email === DEMO_EMAIL) return true;
    if (crewUserIds.has(userId) || crewEmails.has(canonicalEmail(email))) return true;
    return false;
  };

  const knownIpsByUser = new Map(
    users.map((u) => [
      String(u._id),
      new Set(
        mergeKnownIps({
          signupIp: u.signupIp,
          lastLoginIp: u.lastLoginIp,
          lastSeenIp: u.lastSeenIp,
          knownIps: u.knownIps,
        }).map((row) => row.ip),
      ),
    ]),
  );

  // Pull the per-(signalValue,userId) rows so each account's own
  // firstSeenAt/lastSeenAt/count/lastIp/firstSeenSource can be shown.
  const signalValues = groups.map((g) => g._id.signalValue);
  const rows = await db
    .collection<DeviceSignalDoc>("device_signals")
    .find({ signalValue: { $in: signalValues } })
    .toArray();
  const rowsByKey = new Map<string, DeviceSignalDoc[]>();
  for (const row of rows) {
    const key = `${row.signalType}:${row.signalValue}`;
    const list = rowsByKey.get(key) ?? [];
    list.push(row);
    rowsByKey.set(key, list);
  }

  const toAccount = (row: DeviceSignalDoc): AccountOut => {
    const u = usersById.get(row.userId);
    return {
      userId: row.userId,
      email: u?.email ?? null,
      username: u?.username ?? null,
      name: [u?.firstname, u?.lastname].filter(Boolean).join(" ") || u?.name || null,
      firstSeenAt: row.firstSeenAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      count: row.count,
      lastIp: row.lastIp ?? null,
      firstSeenSource: row.firstSeenSource,
    };
  };

  // Merge a cookie-group and a fingerprint-group into one row when they
  // matched the exact same set of accounts (strongest, highest-confidence
  // signal combination); otherwise keep them as separate rows.
  const byAccountSetKey = new Map<
    string,
    {
      signals: Set<DeviceSignalType>;
      deviceIds: string[];
      userIds: string[];
      lastSeenAt: Date;
      firstSeenAt: Date;
    }
  >();

  for (const g of groups) {
    const accountSetKey = [...g.userIds].sort().join(",");
    const key = `${g._id.signalType}:${g._id.signalValue}`;
    const memberRows = rowsByKey.get(key) ?? [];
    const firstSeenAt = memberRows.reduce(
      (min, r) => (r.firstSeenAt < min ? r.firstSeenAt : min),
      g.lastSeenAt,
    );

    const existing = byAccountSetKey.get(accountSetKey);
    if (existing) {
      existing.signals.add(g._id.signalType);
      existing.deviceIds.push(g._id.signalValue);
      if (g.lastSeenAt > existing.lastSeenAt) existing.lastSeenAt = g.lastSeenAt;
      if (firstSeenAt < existing.firstSeenAt) existing.firstSeenAt = firstSeenAt;
    } else {
      byAccountSetKey.set(accountSetKey, {
        signals: new Set([g._id.signalType]),
        deviceIds: [g._id.signalValue],
        userIds: g.userIds,
        lastSeenAt: g.lastSeenAt,
        firstSeenAt,
      });
    }
  }

  const devices = [...byAccountSetKey.values()]
    .filter((cluster) => !cluster.userIds.every(isNoiseUser))
    .map((cluster) => {
      const accounts = cluster.userIds
        .map((userId) => {
          // Prefer the cookie signal's row for this user if present, else fingerprint's.
          for (const deviceId of cluster.deviceIds) {
            const match = (rowsByKey.get(`cookie:${deviceId}`) ?? [])
              .concat(rowsByKey.get(`fingerprint:${deviceId}`) ?? [])
              .find((r) => r.userId === userId);
            if (match) return toAccount(match);
          }
          return null;
        })
        .filter((a): a is AccountOut => a !== null);

      const ipSets = cluster.userIds
        .map((id) => knownIpsByUser.get(id))
        .filter((s): s is Set<string> => !!s && s.size > 0);
      const sharedIps =
        ipSets.length >= 2
          ? [...ipSets[0]].filter((ip) => ipSets.every((s) => s.has(ip)))
          : [];

      return {
        signals: [...cluster.signals].sort(),
        accountCount: accounts.length,
        firstSeenAt: cluster.firstSeenAt.toISOString(),
        lastSeenAt: cluster.lastSeenAt.toISOString(),
        accounts,
        sharedIps,
      };
    })
    .sort((a, b) => {
      if (a.signals.length !== b.signals.length) return b.signals.length - a.signals.length;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    })
    .slice(0, limit);

  return NextResponse.json({ count: devices.length, devices });
}
