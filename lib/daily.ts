import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  getDailyAccountById,
  listDailyAccounts,
  pickDailyAccountForNewRoom,
  type DailyAccount,
} from "@/lib/dailyAccounts";

const DAILY_API_BASE = "https://api.daily.co/v1";

type ProbeOutcome =
  | { kind: "found"; account: DailyAccount }
  | { kind: "miss" }
  | { kind: "abort"; status: number; accountId: string };

type EnsureRoomResult =
  | { kind: "ready"; room: Record<string, unknown> }
  | { kind: "retry_same"; status: number; body: string }
  | { kind: "create_failed"; status: number; body: string };

type RoomResult = {
  room: Record<string, unknown>;
  roomName: string;
  domain: string;
  account: DailyAccount;
};

function roomNameForSession(sessionId: string): string {
  return `session-${sessionId}`;
}

async function getStoredDailyAccountId(
  sessionId: string,
): Promise<string | null> {
  if (!ObjectId.isValid(sessionId)) return null;
  const db = await getDb();
  const session = await db.collection("sessions").findOne(
    { _id: new ObjectId(sessionId) },
    { projection: { daily_account_id: 1 } },
  );
  return typeof session?.daily_account_id === "string"
    ? session.daily_account_id
    : null;
}

/**
 * Claim this account for the session only when no account is stored yet.
 * Returns the account that won (ours or whoever claimed first).
 */
async function claimSessionDailyAccount(
  sessionId: string,
  account: DailyAccount,
): Promise<DailyAccount> {
  if (!ObjectId.isValid(sessionId)) return account;

  const db = await getDb();
  const result = await db.collection("sessions").updateOne(
    {
      _id: new ObjectId(sessionId),
      $or: [
        { daily_account_id: { $exists: false } },
        { daily_account_id: null },
      ],
    },
    {
      $set: {
        daily_account_id: account.id,
        daily_domain: account.domain,
      },
    },
  );

  if (result.matchedCount > 0) return account;

  const storedId = await getStoredDailyAccountId(sessionId);
  const winner = storedId ? getDailyAccountById(storedId) : undefined;
  if (winner) return winner;
  return account;
}

/** Clear the claim only when it still equals the account this request owns. */
async function releaseSessionDailyAccountClaim(
  sessionId: string,
  accountId: string,
): Promise<void> {
  if (!ObjectId.isValid(sessionId)) return;
  const db = await getDb();
  await db.collection("sessions").updateOne(
    {
      _id: new ObjectId(sessionId),
      daily_account_id: accountId,
    },
    {
      $unset: { daily_account_id: "", daily_domain: "" },
    },
  );
}

async function probeAccountForRoom(
  roomName: string,
  account: DailyAccount,
): Promise<
  | { kind: "found" }
  | { kind: "miss" }
  | { kind: "skip_key" }
  | { kind: "abort"; status: number }
> {
  const roomRes = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    headers: { Authorization: `Bearer ${account.apiKey}` },
    cache: "no-store",
  });
  if (roomRes.ok) return { kind: "found" };
  if (roomRes.status === 404) return { kind: "miss" };
  if (roomRes.status === 401) return { kind: "skip_key" };
  return { kind: "abort", status: roomRes.status };
}

/**
 * Probe every configured account. 404 = miss, 401 = skip that key,
 * anything else aborts so we never invent a room elsewhere.
 */
async function probeForExistingRoom(
  roomName: string,
  accounts: DailyAccount[],
): Promise<ProbeOutcome> {
  for (const account of accounts) {
    const outcome = await probeAccountForRoom(roomName, account);
    if (outcome.kind === "found") return { kind: "found", account };
    if (outcome.kind === "miss") continue;
    if (outcome.kind === "skip_key") continue;
    return {
      kind: "abort",
      status: outcome.status,
      accountId: account.id,
    };
  }
  return { kind: "miss" };
}

async function getRoomOnAccount(
  roomName: string,
  account: DailyAccount,
): Promise<{ status: number; body: string }> {
  const roomRes = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    headers: { Authorization: `Bearer ${account.apiKey}` },
    cache: "no-store",
  });
  const body = await roomRes.text();
  return { status: roomRes.status, body };
}

async function createRoomOnAccount(
  roomName: string,
  account: DailyAccount,
  roomProperties: Record<string, unknown>,
): Promise<{ status: number; body: string }> {
  const roomRes = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      properties: roomProperties,
    }),
  });
  const body = await roomRes.text();
  return { status: roomRes.status, body };
}

async function updateRoomProperties(
  roomName: string,
  account: DailyAccount,
  roomProperties: Record<string, unknown>,
): Promise<
  | { ok: true; room: Record<string, unknown> }
  | { ok: false; status: number; body: string }
> {
  const updateRes = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: roomProperties,
    }),
  });
  if (!updateRes.ok) {
    return {
      ok: false,
      status: updateRes.status,
      body: await updateRes.text(),
    };
  }
  return {
    ok: true,
    room: (await updateRes.json()) as Record<string, unknown>,
  };
}

/**
 * Ensure the room exists on this account.
 * - 200 on GET → stay (even if later update fails, throw without moving).
 * - non-404 on GET → retry_same (do not move an in-progress call).
 * - 404 then successful create → ready.
 * - 404 then create failure → create_failed (caller may fail over).
 */
async function ensureRoomOnAccount(
  roomName: string,
  account: DailyAccount,
  roomProperties: Record<string, unknown>,
): Promise<EnsureRoomResult> {
  const existing = await getRoomOnAccount(roomName, account);

  if (existing.status === 200) {
    const updated = await updateRoomProperties(
      roomName,
      account,
      roomProperties,
    );
    if (!updated.ok) {
      throw new Error(
        `Daily room update error: ${updated.status} ${updated.body}`,
      );
    }
    return { kind: "ready", room: updated.room };
  }

  if (existing.status !== 404) {
    return {
      kind: "retry_same",
      status: existing.status,
      body: existing.body,
    };
  }

  const created = await createRoomOnAccount(roomName, account, roomProperties);
  if (created.status < 200 || created.status >= 300) {
    return {
      kind: "create_failed",
      status: created.status,
      body: created.body,
    };
  }

  const updated = await updateRoomProperties(
    roomName,
    account,
    roomProperties,
  );
  if (!updated.ok) {
    throw new Error(
      `Daily room update error: ${updated.status} ${updated.body}`,
    );
  }
  return { kind: "ready", room: updated.room };
}

function candidatesAfterSkip(
  accounts: DailyAccount[],
  skipIds: Set<string>,
  preferred: DailyAccount | null,
): DailyAccount[] {
  const ordered: DailyAccount[] = [];
  if (preferred && !skipIds.has(preferred.id)) {
    ordered.push(preferred);
  }
  for (const account of accounts) {
    if (skipIds.has(account.id)) continue;
    if (preferred && account.id === preferred.id) continue;
    ordered.push(account);
  }
  return ordered;
}

async function settleOnAccount(
  sessionId: string,
  roomName: string,
  account: DailyAccount,
  roomProperties: Record<string, unknown>,
  skipIds: Set<string>,
): Promise<
  | { kind: "done"; result: RoomResult }
  | { kind: "failover"; error: Error }
> {
  const ensure = await ensureRoomOnAccount(roomName, account, roomProperties);
  if (ensure.kind === "ready") {
    return {
      kind: "done",
      result: {
        room: ensure.room,
        roomName,
        domain: account.domain,
        account,
      },
    };
  }
  if (ensure.kind === "retry_same") {
    throw new Error(`Daily room error: ${ensure.status} ${ensure.body}`);
  }
  await releaseSessionDailyAccountClaim(sessionId, account.id);
  skipIds.add(account.id);
  return {
    kind: "failover",
    error: new Error(`Daily room error: ${ensure.status} ${ensure.body}`),
  };
}

export async function createOrGetDailyRoom(
  sessionId: string,
  exp?: number,
): Promise<RoomResult> {
  const accounts = listDailyAccounts();
  if (accounts.length === 0) {
    throw new Error("Missing Daily.co API key/domain env pairs");
  }

  const roomName = roomNameForSession(sessionId);
  const roomProperties = {
    enable_prejoin_ui: true,
    enable_screenshare: true,
    enable_chat: true,
    enable_knocking: false,
    eject_at_room_exp: true,
    exp: exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  };

  const skipIds = new Set<string>();
  let lastError: Error | null = null;

  const storedId = await getStoredDailyAccountId(sessionId);
  const stored = storedId ? getDailyAccountById(storedId) : undefined;

  if (stored) {
    const settled = await settleOnAccount(
      sessionId,
      roomName,
      stored,
      roomProperties,
      skipIds,
    );
    if (settled.kind === "done") return settled.result;
    lastError = settled.error;
  } else {
    // No usable stored account — probe before inventing a room.
    const probe = await probeForExistingRoom(roomName, accounts);
    if (probe.kind === "abort") {
      throw new Error(
        `Daily room probe inconclusive on account ${probe.accountId}: ${probe.status}`,
      );
    }
    if (probe.kind === "found") {
      const winner = await claimSessionDailyAccount(sessionId, probe.account);
      const settled = await settleOnAccount(
        sessionId,
        roomName,
        winner,
        roomProperties,
        skipIds,
      );
      if (settled.kind === "done") return settled.result;
      lastError = settled.error;
    }
  }

  // Clean miss (or released dead claim) — pick, claim, fail over once per account.
  let preferred: DailyAccount | null = null;
  try {
    preferred = await pickDailyAccountForNewRoom();
  } catch (e) {
    if (!lastError) throw e;
  }

  const candidates = candidatesAfterSkip(accounts, skipIds, preferred);
  for (const candidate of candidates) {
    const winner = await claimSessionDailyAccount(sessionId, candidate);
    const settled = await settleOnAccount(
      sessionId,
      roomName,
      winner,
      roomProperties,
      skipIds,
    );
    if (settled.kind === "done") return settled.result;
    lastError = settled.error;
  }

  throw lastError ?? new Error("Daily room error: no accounts available");
}

export async function createDailyMeetingToken(
  roomName: string,
  userId: string,
  opts?: { userName?: string; exp?: number; account?: DailyAccount },
) {
  const sessionId = roomName.replace(/^session-/, "");
  let account = opts?.account;
  if (!account) {
    const storedId = await getStoredDailyAccountId(sessionId);
    account = storedId ? getDailyAccountById(storedId) : undefined;
  }
  if (!account) {
    const ensured = await createOrGetDailyRoom(sessionId);
    account = ensured.account;
  }

  const { apiKey } = account;
  const sanitizedName = opts?.userName?.trim();
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        ...(sanitizedName ? { user_name: sanitizedName } : {}),
        is_owner: false,
        exp: opts?.exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 2,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daily token error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.token as string;
}
