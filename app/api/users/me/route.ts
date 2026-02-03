import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const user = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    {
      projection: {
        email: 1,
        name: 1,
        firstname: 1,
        lastname: 1,
        about: 1,
        interests: 1,
        location: 1,
        website: 1,
      },
    }
  )) as null | {
    email?: string;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    about?: string | null;
    interests?: string[] | null;
    location?: string | null;
    website?: string | null;
  };

  return NextResponse.json({
    user: user
      ? {
          email: user.email,
          name: user.name ?? null,
          firstname: user.firstname ?? null,
          lastname: user.lastname ?? null,
          about: user.about ?? null,
          interests: user.interests ?? [],
          location: user.location ?? null,
          website: user.website ?? null,
        }
      : null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { firstname, lastname, about, interests, location, website } = body as {
    firstname?: string;
    lastname?: string;
    about?: string;
    interests?: string[];
    location?: string;
    website?: string;
  };

  const db = await getDb();

  // Build update object with only provided fields
  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (firstname !== undefined) updateFields.firstname = firstname;
  if (lastname !== undefined) updateFields.lastname = lastname;
  if (about !== undefined) updateFields.about = about;
  if (interests !== undefined) updateFields.interests = interests;
  if (location !== undefined) updateFields.location = location;
  if (website !== undefined) updateFields.website = website;

  // Update name if firstname or lastname is provided
  if (firstname !== undefined || lastname !== undefined) {
    const currentUser = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    const newFirstname = firstname ?? currentUser?.firstname ?? "";
    const newLastname = lastname ?? currentUser?.lastname ?? "";
    updateFields.name = [newFirstname, newLastname].filter(Boolean).join(" ");
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateFields },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
