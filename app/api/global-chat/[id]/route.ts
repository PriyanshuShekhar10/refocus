import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { globalChatChannel, publish } from "@/lib/sse";
import { publishAbly } from "@/lib/ably-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as { id?: string } | undefined;
  const currentUserId = currentUser?.id;
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  if (!messageId) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
  }
  if (!ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Empty content" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const message = await db.collection("global_messages").findOne({
      _id: new ObjectId(messageId),
    });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.user_id !== currentUserId) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 },
      );
    }
    if (message.deleted) {
      return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });
    }

    const editedAt = new Date();
    const result = await db.collection("global_messages").updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { content, edited_at: editedAt } },
    );
    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
    }

    const event = {
      type: "message:updated",
      payload: { id: messageId, content, edited_at: editedAt.toISOString() },
    };
    await Promise.all([
      publish(globalChatChannel(), event),
      publishAbly(globalChatChannel(), event),
    ]);
    return NextResponse.json({ success: true, id: messageId });
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as
    | { id?: string; name?: string }
    | undefined;
  const currentUserId = currentUser?.id;

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;

  if (!messageId) {
    return NextResponse.json(
      { error: "Message ID is required" },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();

    // First, check if the message exists and belongs to the current user
    const message = await db.collection("global_messages").findOne({
      _id: new ObjectId(messageId),
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.user_id !== currentUserId) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 },
      );
    }

    // Mark the message as deleted instead of removing it
    const result = await db.collection("global_messages").updateOne(
      { _id: new ObjectId(messageId) },
      {
        $set: {
          deleted: true,
          deleted_at: new Date(),
          content: "[This message was deleted]",
        },
      },
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 },
      );
    }

    // Publish update event (async for Redis support)
    const event = {
      type: "message:deleted",
      payload: { id: messageId },
    };
    await Promise.all([
      publish(globalChatChannel(), event),
      publishAbly(globalChatChannel(), event),
    ]);

    return NextResponse.json({ success: true, id: messageId });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
