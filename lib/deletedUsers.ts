import type { Collection, Db, ObjectId } from "mongodb";
import { isEmailVerified } from "@/lib/emailVerification";
import { ADMIN_ROLE } from "@/lib/admin";
import {
  isCommunityBanned,
  isCommunityMuted,
} from "@/lib/communityModeration";
import { mergeKnownIps } from "@/lib/userIps";

export const DELETED_USERS_COLLECTION = "deleted_users";

export type UserDeletionSnapshot = {
  _id?: ObjectId;
  email?: string | null;
  canonicalEmail?: string | null;
  username?: string | null;
  name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  emailVerified?: Date | string | null;
  createdAt?: Date | string | null;
  hashedPassword?: string;
  password?: string;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date | string | null;
  signupIp?: string | null;
  lastLoginIp?: string | null;
  lastSeenIp?: string | null;
  lastLoginAt?: Date | string | null;
  knownIps?: Array<{
    ip?: string | null;
    firstSeenAt?: Date;
    lastSeenAt?: Date;
    count?: number;
  }>;
  role?: string | null;
  communityBannedAt?: Date | string | null;
  communityMutedUntil?: Date | string | null;
};

export type DeletedUserRecord = {
  userId: string;
  email: string | null;
  canonicalEmail: string | null;
  username: string | null;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  emailVerified: boolean;
  createdAt: Date | null;
  deletedAt: Date;
  lastLoginAt: Date | null;
  signupIp: string | null;
  lastLoginIp: string | null;
  lastSeenIp: string | null;
  knownIps: string[];
  wasAdmin: boolean;
  communityBanned: boolean;
  communityMuted: boolean;
};

export type DeletedUserDTO = {
  id: string;
  userId: string;
  email: string | null;
  username: string | null;
  name: string | null;
  emailVerified: boolean;
  createdAt: string | null;
  deletedAt: string | null;
  lastLoginAt: string | null;
  signupIp: string | null;
  lastLoginIp: string | null;
  lastSeenIp: string | null;
  knownIps: string[];
  wasAdmin: boolean;
  communityBanned: boolean;
  communityMuted: boolean;
};

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayName(user: UserDeletionSnapshot): string | null {
  const combined = [user.firstname, user.lastname].filter(Boolean).join(" ");
  return combined || user.name || null;
}

export function snapshotDeletedUser(
  user: UserDeletionSnapshot,
  userId: string,
  now = new Date(),
): DeletedUserRecord {
  return {
    userId,
    email: user.email?.trim() || null,
    canonicalEmail: user.canonicalEmail?.trim() || null,
    username: user.username?.trim() || null,
    name: displayName(user),
    firstname: user.firstname?.trim() || null,
    lastname: user.lastname?.trim() || null,
    emailVerified: isEmailVerified(user.emailVerified),
    createdAt: asDate(user.createdAt),
    deletedAt: now,
    lastLoginAt: asDate(user.lastLoginAt),
    signupIp: user.signupIp ?? null,
    lastLoginIp: user.lastLoginIp ?? null,
    lastSeenIp: user.lastSeenIp ?? null,
    knownIps: mergeKnownIps({
      signupIp: user.signupIp ?? null,
      lastLoginIp: user.lastLoginIp ?? null,
      lastSeenIp: user.lastSeenIp ?? null,
      knownIps: user.knownIps,
    }).map((row) => row.ip),
    wasAdmin: user.role === ADMIN_ROLE,
    communityBanned: isCommunityBanned({
      communityBannedAt: asDate(user.communityBannedAt),
    }),
    communityMuted: isCommunityMuted({
      communityMutedUntil: asDate(user.communityMutedUntil),
    }),
  };
}

export function serializeDeletedUser(
  row: DeletedUserRecord & { _id?: ObjectId },
): DeletedUserDTO {
  return {
    id: row._id ? String(row._id) : row.userId,
    userId: row.userId,
    email: row.email,
    username: row.username,
    name: row.name,
    emailVerified: row.emailVerified,
    createdAt: asDate(row.createdAt)?.toISOString() ?? null,
    deletedAt: asDate(row.deletedAt)?.toISOString() ?? null,
    lastLoginAt: asDate(row.lastLoginAt)?.toISOString() ?? null,
    signupIp: row.signupIp,
    lastLoginIp: row.lastLoginIp,
    lastSeenIp: row.lastSeenIp,
    knownIps: row.knownIps ?? [],
    wasAdmin: Boolean(row.wasAdmin),
    communityBanned: Boolean(row.communityBanned),
    communityMuted: Boolean(row.communityMuted),
  };
}

export async function archiveDeletedUser(
  db: Db,
  user: UserDeletionSnapshot,
  userId: string,
  now = new Date(),
): Promise<void> {
  const col = db.collection(DELETED_USERS_COLLECTION) as Collection<DeletedUserRecord>;
  await col.insertOne(snapshotDeletedUser(user, userId, now));
}
