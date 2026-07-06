import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type CommunityModerationFields = {
  communityBannedAt?: Date | null;
  communityMutedUntil?: Date | null;
};

export function isCommunityBanned(user: CommunityModerationFields): boolean {
  return !!user.communityBannedAt;
}

export function isCommunityMuted(user: CommunityModerationFields): boolean {
  if (!user.communityMutedUntil) return false;
  return new Date(user.communityMutedUntil) > new Date();
}

export async function getCommunityModerationStatus(userId: string) {
  if (!ObjectId.isValid(userId)) {
    return { banned: false, muted: false, mutedUntil: null as Date | null };
  }

  const db = await getDb();
  const user = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { communityBannedAt: 1, communityMutedUntil: 1 } },
  )) as CommunityModerationFields | null;

  if (!user) {
    return { banned: false, muted: false, mutedUntil: null as Date | null };
  }

  return {
    banned: isCommunityBanned(user),
    muted: isCommunityMuted(user),
    mutedUntil: user.communityMutedUntil ?? null,
  };
}

export async function requireCommunityAccess(
  userId: string,
): Promise<NextResponse | null> {
  const status = await getCommunityModerationStatus(userId);
  if (status.banned) {
    return NextResponse.json(
      { error: "You are banned from the community." },
      { status: 403 },
    );
  }
  if (status.muted) {
    return NextResponse.json(
      { error: "You are muted in the community." },
      { status: 403 },
    );
  }
  return null;
}

export const COMMUNITY_BANNED_MESSAGE =
  "You are banned from the community and cannot book sessions.";

export async function requireNotCommunityBanned(
  userId: string,
): Promise<NextResponse | null> {
  const status = await getCommunityModerationStatus(userId);
  if (status.banned) {
    return NextResponse.json(
      { error: COMMUNITY_BANNED_MESSAGE },
      { status: 403 },
    );
  }
  return null;
}
