import { getDb } from "@/lib/mongodb";

export const OPS_NOTIFY_SETTINGS_KEY = "ops_notify";

export type OpsNotifyKind = "signup" | "sessionMatched";

export type OpsNotifyPrefs = {
  signup: boolean;
  sessionMatched: boolean;
};

export const DEFAULT_OPS_NOTIFY_PREFS: OpsNotifyPrefs = {
  signup: true,
  sessionMatched: true,
};

type OpsNotifyDoc = {
  key: string;
  signup?: boolean;
  sessionMatched?: boolean;
};

function normalizePrefs(doc: OpsNotifyDoc | null | undefined): OpsNotifyPrefs {
  return {
    signup: doc?.signup !== false,
    sessionMatched: doc?.sessionMatched !== false,
  };
}

export async function getOpsNotifyPrefs(): Promise<OpsNotifyPrefs> {
  const db = await getDb();
  const doc = (await db
    .collection<OpsNotifyDoc>("app_settings")
    .findOne({ key: OPS_NOTIFY_SETTINGS_KEY })) as OpsNotifyDoc | null;
  return normalizePrefs(doc);
}

export async function isOpsNotifyKindEnabled(
  kind: OpsNotifyKind,
): Promise<boolean> {
  const prefs = await getOpsNotifyPrefs();
  return prefs[kind];
}

export async function setOpsNotifyPrefs(
  patch: Partial<OpsNotifyPrefs>,
  updatedBy: string,
): Promise<OpsNotifyPrefs> {
  const next: Partial<OpsNotifyPrefs> = {};
  if (typeof patch.signup === "boolean") next.signup = patch.signup;
  if (typeof patch.sessionMatched === "boolean") {
    next.sessionMatched = patch.sessionMatched;
  }

  if (Object.keys(next).length === 0) {
    return getOpsNotifyPrefs();
  }

  const db = await getDb();
  await db.collection("app_settings").updateOne(
    { key: OPS_NOTIFY_SETTINGS_KEY },
    {
      $set: {
        ...next,
        updatedAt: new Date(),
        updatedBy,
      },
      $setOnInsert: { key: OPS_NOTIFY_SETTINGS_KEY },
    },
    { upsert: true },
  );

  return getOpsNotifyPrefs();
}
