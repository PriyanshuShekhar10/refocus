import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { del, put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { requireVerifiedEmail } from "@/lib/requireVerifiedEmail";
import {
  WALLPAPER_ALLOWED_TYPES,
  WALLPAPER_MAX_BYTES,
  isManagedWallpaperUrl,
} from "@/lib/userWallpaper";

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

async function deleteManagedWallpaper(url: string | null | undefined) {
  if (!url || !isManagedWallpaperUrl(url)) return;
  try {
    await del(url);
  } catch (err) {
    console.warn("[wallpaper] Failed to delete old blob:", err);
  }
}

/** POST multipart/form-data with field `wallpaper` (image file). */
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
      { error: "Wallpaper uploads are not configured" },
      { status: 503 },
    );
  }

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const form = await req.formData().catch(() => null);
  const file = form?.get("wallpaper");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing wallpaper file" }, { status: 400 });
  }

  if (!WALLPAPER_ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File must be JPEG, PNG, WebP, or GIF" },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > WALLPAPER_MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be between 1 byte and 10 MB" },
      { status: 400 },
    );
  }

  const db = await getDb();
  const existing = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { "preferences.dashboardWallpaperUrl": 1 } },
  )) as { preferences?: { dashboardWallpaperUrl?: string | null } } | null;
  const previousUrl = existing?.preferences?.dashboardWallpaperUrl ?? null;

  const ext = extensionForMime(file.type);
  const pathname = `wallpapers/${userId}-${Date.now()}.${ext}`;

  let blob;
  try {
    blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type,
    });
  } catch (err) {
    console.error("[wallpaper] Blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        "preferences.dashboardWallpaperUrl": blob.url,
        updatedAt: new Date(),
      },
    },
  );

  if (previousUrl && previousUrl !== blob.url) {
    await deleteManagedWallpaper(previousUrl);
  }

  return NextResponse.json({ ok: true, wallpaperUrl: blob.url });
}

/** Remove the user's dashboard wallpaper (reverts to default grid). */
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
    { projection: { "preferences.dashboardWallpaperUrl": 1 } },
  )) as { preferences?: { dashboardWallpaperUrl?: string | null } } | null;
  const previousUrl = existing?.preferences?.dashboardWallpaperUrl ?? null;

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $unset: { "preferences.dashboardWallpaperUrl": "" },
      $set: { updatedAt: new Date() },
    },
  );

  if (previousUrl) {
    await deleteManagedWallpaper(previousUrl);
  }

  return NextResponse.json({ ok: true, wallpaperUrl: null });
}
