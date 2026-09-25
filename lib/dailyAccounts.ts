import { getDb } from "@/lib/mongodb";

export const DAILY_SETTINGS_ID = "daily";
const MAX_DAILY_ACCOUNTS = 20;

export type DailyAccount = {
  id: string;
  apiKey: string;
  domain: string;
};

export type DailyAccountPublic = {
  id: string;
  domain: string;
  keyHint: string;
};

export type DailySelectionMode = "rotate" | "pin";

type DailySettingsDoc = {
  _id: string;
  selectionMode?: DailySelectionMode;
  activeId?: string;
  rotationCounter?: number;
  updatedAt?: Date;
  updatedBy?: string;
};

function envPair(index: number): { keyName: string; domainName: string } {
  if (index === 1) {
    return { keyName: "DAILY_API_KEY", domainName: "DAILY_DOMAIN" };
  }
  return {
    keyName: `DAILY_API_KEY_${index}`,
    domainName: `DAILY_DOMAIN_${index}`,
  };
}

function keyHint(apiKey: string): string {
  if (apiKey.length <= 4) return "****";
  return `…${apiKey.slice(-4)}`;
}

/** Complete Daily.co API key + domain pairs from env (ids "1".."20"). */
export function listDailyAccounts(): DailyAccount[] {
  const accounts: DailyAccount[] = [];
  for (let i = 1; i <= MAX_DAILY_ACCOUNTS; i++) {
    const { keyName, domainName } = envPair(i);
    const apiKey = process.env[keyName]?.trim();
    const domain = process.env[domainName]?.trim();
    if (!apiKey || !domain) continue;
    accounts.push({ id: String(i), apiKey, domain });
  }
  return accounts;
}

export function listDailyAccountsPublic(): DailyAccountPublic[] {
  return listDailyAccounts().map(({ id, domain, apiKey }) => ({
    id,
    domain,
    keyHint: keyHint(apiKey),
  }));
}

export function getDailyAccountById(id: string): DailyAccount | undefined {
  return listDailyAccounts().find((account) => account.id === id);
}

async function getDailySettingsDoc(): Promise<DailySettingsDoc | null> {
  const db = await getDb();
  return db
    .collection<DailySettingsDoc>("app_settings")
    .findOne({ _id: DAILY_SETTINGS_ID });
}

export function resolveSelectionMode(
  doc: Pick<DailySettingsDoc, "selectionMode"> | null | undefined,
): DailySelectionMode {
  return doc?.selectionMode === "pin" ? "pin" : "rotate";
}

export async function getStoredDailyActiveId(): Promise<string | null> {
  const doc = await getDailySettingsDoc();
  return typeof doc?.activeId === "string" ? doc.activeId : null;
}

export async function getDailyAdminState(): Promise<{
  selectionMode: DailySelectionMode;
  activeId: string | null;
  nextId: string | null;
}> {
  const accounts = listDailyAccounts();
  const doc = await getDailySettingsDoc();
  const selectionMode = resolveSelectionMode(doc);
  const storedId = typeof doc?.activeId === "string" ? doc.activeId : null;
  const activeId =
    storedId && accounts.some((account) => account.id === storedId)
      ? storedId
      : (accounts[0]?.id ?? null);
  const nextId =
    accounts.length === 0
      ? null
      : accounts[(doc?.rotationCounter ?? 0) % accounts.length]!.id;
  return { selectionMode, activeId, nextId };
}

/**
 * Resolve the pinned Daily account, else the first env pair.
 * Prefer `pickDailyAccountForNewRoom` when creating rooms.
 */
export async function getActiveDailyAccount(): Promise<DailyAccount> {
  const accounts = listDailyAccounts();
  if (accounts.length === 0) {
    throw new Error("Missing Daily.co API key/domain env pairs");
  }

  const storedId = await getStoredDailyActiveId();
  const match = storedId
    ? accounts.find((account) => account.id === storedId)
    : undefined;
  return match ?? accounts[0]!;
}

/**
 * Choose which Daily account should host a new room.
 * Rotate mode cycles equally via an atomic counter; pin mode uses activeId.
 */
export async function pickDailyAccountForNewRoom(): Promise<DailyAccount> {
  const accounts = listDailyAccounts();
  if (accounts.length === 0) {
    throw new Error("Missing Daily.co API key/domain env pairs");
  }
  if (accounts.length === 1) return accounts[0]!;

  const doc = await getDailySettingsDoc();
  if (resolveSelectionMode(doc) === "pin") {
    const match = doc?.activeId
      ? accounts.find((account) => account.id === doc.activeId)
      : undefined;
    return match ?? accounts[0]!;
  }

  const db = await getDb();
  const updated = await db
    .collection<DailySettingsDoc>("app_settings")
    .findOneAndUpdate(
      { _id: DAILY_SETTINGS_ID },
      { $inc: { rotationCounter: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  if (!updated || typeof updated.rotationCounter !== "number") {
    throw new Error("Daily rotation counter missing after increment");
  }
  return accounts[(updated.rotationCounter - 1) % accounts.length]!;
}

export async function setDailySelectionMode(
  mode: DailySelectionMode,
  updatedBy: string,
): Promise<{ previousMode: DailySelectionMode }> {
  const doc = await getDailySettingsDoc();
  const previousMode = resolveSelectionMode(doc);
  const db = await getDb();
  await db.collection<DailySettingsDoc>("app_settings").updateOne(
    { _id: DAILY_SETTINGS_ID },
    {
      $set: {
        selectionMode: mode,
        updatedAt: new Date(),
        updatedBy,
      },
    },
    { upsert: true },
  );
  return { previousMode };
}

export async function setDailyActiveId(
  activeId: string,
  updatedBy: string,
): Promise<{ previousId: string | null; account: DailyAccount }> {
  const accounts = listDailyAccounts();
  const account = accounts.find((a) => a.id === activeId);
  if (!account) {
    throw new Error("Unknown Daily account id");
  }

  const previousId = await getStoredDailyActiveId();
  const db = await getDb();
  await db.collection<DailySettingsDoc>("app_settings").updateOne(
    { _id: DAILY_SETTINGS_ID },
    {
      $set: {
        selectionMode: "pin",
        activeId,
        updatedAt: new Date(),
        updatedBy,
      },
    },
    { upsert: true },
  );

  return { previousId, account };
}

if (
  process.env.NODE_ENV === "production" &&
  listDailyAccounts().length === 0
) {
  throw new Error("Missing Daily.co API key/domain env pairs");
}
