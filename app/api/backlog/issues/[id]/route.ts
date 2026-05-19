import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

type IssueStatus = "todo" | "in_progress" | "done";
type IssuePriority = "low" | "medium" | "high";

const VALID_STATUSES: IssueStatus[] = ["todo", "in_progress", "done"];
const VALID_PRIORITIES: IssuePriority[] = ["low", "medium", "high"];

function serializeIssue(issue: {
  _id: ObjectId;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: issue._id.toString(),
    title: issue.title,
    description: issue.description || "",
    status: issue.status,
    priority: issue.priority,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const updateFields: Record<string, string | Date> = {
    updatedAt: new Date(),
  };

  if (body?.status !== undefined) {
    const status = String(body.status) as IssueStatus;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updateFields.status = status;
  }

  if (body?.priority !== undefined) {
    const priority = String(body.priority) as IssuePriority;
    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    updateFields.priority = priority;
  }

  if (body?.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (title.length > 120) {
      return NextResponse.json({ error: "Title is too long" }, { status: 400 });
    }
    updateFields.title = title;
  }

  if (body?.description !== undefined) {
    const description = String(body.description).trim();
    if (description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 },
      );
    }
    updateFields.description = description;
  }

  const db = await getDb();
  const updatedIssue = await db
    .collection<{
      _id: ObjectId;
      title: string;
      description?: string;
      status: IssueStatus;
      priority: IssuePriority;
      createdAt: Date;
      updatedAt: Date;
      ownerId: string;
    }>("backlog_issues")
    .findOneAndUpdate(
      { _id: new ObjectId(id), ownerId: userId },
      { $set: updateFields },
      { returnDocument: "after" },
    );

  if (!updatedIssue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json({ issue: serializeIssue(updatedIssue) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("backlog_issues").deleteOne({
    _id: new ObjectId(id),
    ownerId: userId,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
