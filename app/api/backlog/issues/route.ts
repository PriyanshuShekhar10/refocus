import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

type IssueStatus = "todo" | "in_progress" | "done";
type IssuePriority = "low" | "medium" | "high";

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

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const issues = await db
    .collection<{
      _id: ObjectId;
      title: string;
      description?: string;
      status: IssueStatus;
      priority: IssuePriority;
      createdAt: Date;
      updatedAt: Date;
    }>("backlog_issues")
    .find({ ownerId: userId })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    issues: issues.map(serializeIssue),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();
  const priority = String(body?.priority || "medium") as IssuePriority;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (title.length > 120) {
    return NextResponse.json({ error: "Title is too long" }, { status: 400 });
  }
  if (description.length > 500) {
    return NextResponse.json(
      { error: "Description must be 500 characters or less" },
      { status: 400 },
    );
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  const db = await getDb();
  const now = new Date();
  const issue = {
    ownerId: userId,
    title,
    description,
    status: "todo" as IssueStatus,
    priority,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("backlog_issues").insertOne(issue);

  return NextResponse.json(
    {
      issue: serializeIssue({
        _id: result.insertedId,
        ...issue,
      }),
    },
    { status: 201 },
  );
}
