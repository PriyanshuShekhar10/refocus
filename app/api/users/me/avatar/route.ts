import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { del, put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { requireVerifiedEmail } from "@/lib/requireVerifiedEmail";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_BYTES,
  isManagedAvatarUrl,
  resolveAvatarUrl,
} from "@/lib/userAvatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "img";
  }
}

async function deleteManagedAvatar(url: string | null | undefined) {
  if (!url || !isManagedAvatarUrl(url)) return;
  try {
    await del(url);
  } catch (err) {
    console.warn("[avatar] Failed to delete old blob:", err);
  }
}

/** POST multipart/form-data with field `avatar` (image file). */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailGate = await requireVerifiedEmail(userId);
  if (emailGate) return emailGate;

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "Avatar uploads are not configured" },
      { status: 503 },
    );
  }

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const form = await req.formData().catch(() => null);
  const file = form?.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing avatar file" }, { status: 400 });
  }

  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File must be JPEG, PNG, WebP, or GIF" },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be between 1 byte and 5 MB" },
      { status: 400 },
    );
  }

  const db = await getDb();
  const existing = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { avatar_url: 1, image: 1 } },
  )) as { avatar_url?: string | null; image?: string | null } | null;
  const previousUrl = resolveAvatarUrl(existing);

  const ext = extensionForMime(file.type);
  const pathname = `avatars/${userId}-${Date.now()}.${ext}`;

  let blob;
  try {
    blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type,
    });
  } catch (err) {
    console.error("[avatar] Blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { avatar_url: blob.url, updatedAt: new Date() } },
  );

  if (previousUrl && previousUrl !== blob.url) {
    await deleteManagedAvatar(previousUrl);
  }

  return NextResponse.json({ ok: true, avatarUrl: blob.url });
}

/** Remove the user's uploaded profile photo. */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailGate = await requireVerifiedEmail(userId);
  if (emailGate) return emailGate;

  const db = await getDb();
  const existing = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { avatar_url: 1, image: 1 } },
  )) as { avatar_url?: string | null; image?: string | null } | null;
  const previousUrl = existing?.avatar_url ?? null;

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $unset: { avatar_url: "" }, $set: { updatedAt: new Date() } },
  );

  if (previousUrl) {
    await deleteManagedAvatar(previousUrl);
  }

  return NextResponse.json({
    ok: true,
    avatarUrl: existing?.image?.trim() || null,
  });
}
