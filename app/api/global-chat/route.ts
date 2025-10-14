import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { globalChatChannel } from "@/lib/sse";
import { publish } from "@/lib/sse";

type GlobalMessageDoc = {
  _id: unknown;
  user_id: string;
  user_name?: string | null;
  content: string;
  created_at: Date;
  deleted?: boolean;
  deleted_at?: Date;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string; name?: string } | undefined)?.id;
  if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const docs = (await db
    .collection<GlobalMessageDoc>("global_messages")
    .find({})
    .sort({ created_at: 1 })
    .limit(300)
    .toArray()) as unknown as GlobalMessageDoc[];

  return NextResponse.json({
    messages: docs.map((m) => ({
      id: String(m._id as string),
      user_id: m.user_id,
      user_name: m.user_name ?? null,
      content: m.content,
      created_at: m.created_at.toISOString(),
      deleted: m.deleted ?? false,
      deleted_at: m.deleted_at?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as { id?: string; name?: string } | undefined;
  const currentUserId = currentUser?.id;
  if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { content } = body as { content?: string };
  if (!content || !content.trim())
    return NextResponse.json({ error: "Empty content" }, { status: 400 });

  const db = await getDb();
  const insert = await db.collection("global_messages").insertOne({
    user_id: currentUserId,
    user_name: currentUser?.name ?? null,
    content: content.trim(),
    created_at: new Date(),
  });

  publish(globalChatChannel(), { type: "message:new", payload: { id: String(insert.insertedId) } });
  return NextResponse.json({ id: String(insert.insertedId) });
}


