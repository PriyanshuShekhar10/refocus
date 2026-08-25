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

type DailySettingsDoc = {
  _id: string;
  activeId?: string;
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

export async function getStoredDailyActiveId(): Promise<string | null> {
  const db = await getDb();
  const doc = (await db
    .collection<DailySettingsDoc>("app_settings")
    .findOne({ _id: DAILY_SETTINGS_ID })) as DailySettingsDoc | null;
  return typeof doc?.activeId === "string" ? doc.activeId : null;
}

/**
 * Resolve the active Daily account: Mongo `app_settings` activeId, else first env pair.
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
