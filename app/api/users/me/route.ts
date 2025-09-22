import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { firstname, lastname } = body as {
    firstname?: string;
    lastname?: string;
  };
  const db = await getDb();
  await db
    .collection("users")
    .updateOne(
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
