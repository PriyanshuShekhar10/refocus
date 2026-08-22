import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getDb } from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { isUserAdmin } from "@/lib/admin";
import { isEmailVerified } from "@/lib/emailVerification";
import { resolveAvatarUrl } from "@/lib/userAvatar";

/** GET /api/profile/:username — public profile data (admins can view private profiles) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const normalized = username.trim().toLowerCase();

  if (!/^[a-z0-9_-]{3,20}$/.test(normalized)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { username: normalized },
    {
      projection: {
        username: 1,
        name: 1,
        firstname: 1,
        lastname: 1,
        image: 1,
        avatar_url: 1,
        about: 1,
        aboutMe: 1,
        interests: 1,
        location: 1,
        website: 1,
        createdAt: 1,
        emailVerified: 1,
        "preferences.publicProfile": 1,
      },
    }
  );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isPrivate = user.preferences?.publicProfile === false;
  let adminView = false;
  if (isPrivate) {
    const session = await getServerSession(authOptions);
    const viewerId = (session?.user as { id?: string } | undefined)?.id;
    if (!(await isUserAdmin(viewerId))) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    adminView = true;
  }

  return NextResponse.json({
    user: {
      username: user.username,
      name: user.name ?? null,
      firstname: user.firstname ?? null,
      lastname: user.lastname ?? null,
      avatarUrl: resolveAvatarUrl({
        avatar_url: typeof user.avatar_url === "string" ? user.avatar_url : null,
        image: typeof user.image === "string" ? user.image : null,
      }),
      about: user.about ?? null,
      aboutMe: user.aboutMe ?? {},
      interests: user.interests ?? [],
      location: user.location ?? null,
      website: user.website ?? null,
      createdAt: user.createdAt ?? null,
      emailVerified: isEmailVerified(user.emailVerified),
    },
    ...(adminView ? { adminView: true, privateProfile: true } : {}),
  });
}
