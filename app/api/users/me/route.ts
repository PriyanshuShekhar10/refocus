import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const user = (await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1, name: 1, firstname: 1, lastname: 1 } }
    )) as null | {
    email?: string;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };

  return NextResponse.json({
    user: user
      ? {
          email: user.email,
          name: user.name ?? null,
          firstname: user.firstname ?? null,
          lastname: user.lastname ?? null,
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
  const { firstname, lastname } = body as {
    firstname?: string;
    lastname?: string;
  };
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        name: [firstname, lastname].filter(Boolean).join(" "),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
