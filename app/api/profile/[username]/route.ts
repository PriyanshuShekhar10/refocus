import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

/** GET /api/users/profile/:username — public profile data */
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
        interests: 1,
        location: 1,
        website: 1,
        createdAt: 1,
        "preferences.publicProfile": 1,
      },
    }
  );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.preferences?.publicProfile === false) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      username: user.username,
      name: user.name ?? null,
      firstname: user.firstname ?? null,
      lastname: user.lastname ?? null,
      avatarUrl: user.avatar_url ?? user.image ?? null,
      about: user.about ?? null,
      interests: user.interests ?? [],
      location: user.location ?? null,
      website: user.website ?? null,
      createdAt: user.createdAt ?? null,
    },
  });
}
