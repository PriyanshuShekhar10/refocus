/** Max upload size for profile photos (5 MB). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function resolveAvatarUrl(
  user:
    | { avatar_url?: string | null; image?: string | null }
    | null
    | undefined,
): string | null {
  if (!user) return null;
  const url = user.avatar_url ?? user.image ?? null;
  return url?.trim() ? url.trim() : null;
}

/** True when the URL points at our Vercel Blob store (safe to delete on replace). */
export function isManagedAvatarUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Batch-load avatar URLs for a set of user ids (Mongo user _id strings). */
export async function fetchAvatarUrlMap(
  db: import("mongodb").Db,
  userIds: string[],
): Promise<Record<string, string | null>> {
  const { ObjectId } = await import("mongodb");
  const unique = [...new Set(userIds)].filter((id) => ObjectId.isValid(id));
  if (unique.length === 0) return {};

  const users = await db
    .collection<{
      _id: import("mongodb").ObjectId;
      avatar_url?: string | null;
      image?: string | null;
    }>("users")
    .find({ _id: { $in: unique.map((id) => new ObjectId(id)) } })
    .project({ avatar_url: 1, image: 1 })
    .toArray();

  const map: Record<string, string | null> = {};
  for (const user of users) {
    map[String(user._id)] = resolveAvatarUrl(user);
  }
  return map;
}
