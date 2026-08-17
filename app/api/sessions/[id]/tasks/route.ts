import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId, type Collection } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { publishAbly } from "@/lib/ably-server";
import { isOwnerOrParticipant, toObjectId } from "@/lib/sessionAccess";
import { sessionTasksChannel } from "@/lib/realtimeChannels";
import {
  SESSION_TASKS_PER_OWNER_MAX,
  SESSION_TASK_TITLE_MAX,
  normalizeTaskTitle,
  serializeSessionTasks,
  type SessionTask,
  type SessionTasksUpdatedEvent,
} from "@/lib/sessionTasks";

type SessionDoc = {
  _id: ObjectId;
  owner_id: string;
  session_participants?: Array<{ user_id: string }>;
  session_tasks?: SessionTask[];
};

async function requireParticipant(
  sessionId: string,
  userId: string,
): Promise<
  | { ok: true; col: Collection<SessionDoc>; session: SessionDoc }
  | { ok: false; response: NextResponse }
> {
  const oid = toObjectId(sessionId);
  if (!oid) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid session id" }, { status: 400 }),
    };
  }

  const db = await getDb();
  const col = db.collection<SessionDoc>("sessions");
  const session = await col.findOne({ _id: oid });
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  if (!isOwnerOrParticipant(session, userId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, col, session };
}

async function publishTasks(
  sessionId: string,
  tasks: SessionTask[],
): Promise<SessionTasksUpdatedEvent> {
  const event: SessionTasksUpdatedEvent = {
    type: "session_tasks_updated",
    sessionId,
    tasks: serializeSessionTasks(tasks),
  };
  await publishAbly(sessionTasksChannel(sessionId), event);
  return event;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const gate = await requireParticipant(sessionId, userId);
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    tasks: serializeSessionTasks(gate.session.session_tasks),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { id: sessionId } = await params;
  const gate = await requireParticipant(sessionId, userId);
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as { title?: unknown };
  const title = normalizeTaskTitle(body.title);
  if (!title) {
    return NextResponse.json(
      { error: `Title is required (max ${SESSION_TASK_TITLE_MAX} characters).` },
      { status: 400 },
    );
  }

  const existing = gate.session.session_tasks ?? [];
  const mine = existing.filter((t) => t.ownerId === userId);
  if (mine.length >= SESSION_TASKS_PER_OWNER_MAX) {
    return NextResponse.json(
      { error: `You can add at most ${SESSION_TASKS_PER_OWNER_MAX} tasks.` },
      { status: 400 },
    );
  }

  const now = new Date();
  const task: SessionTask = {
    id: crypto.randomUUID(),
    ownerId: userId,
    title,
    done: false,
    sort: mine.length === 0 ? 0 : Math.max(...mine.map((t) => t.sort)) + 1,
    createdAt: now,
    updatedAt: now,
  };
  const next = [...existing, task];

  await gate.col.updateOne(
    { _id: gate.session._id },
    { $set: { session_tasks: next, updatedAt: now } },
  );

  const event = await publishTasks(sessionId, next);
  return NextResponse.json({ ok: true, task: serializeSessionTasks([task])[0], tasks: event.tasks });
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
  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { id: sessionId } = await params;
  const gate = await requireParticipant(sessionId, userId);
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as {
    taskId?: unknown;
    done?: unknown;
    title?: unknown;
    sort?: unknown;
  };
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const existing = gate.session.session_tasks ?? [];
  const index = existing.findIndex((t) => t.id === taskId);
  if (index < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const current = existing[index];
  if (current.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nextTask: SessionTask = { ...current, updatedAt: new Date() };
  if (typeof body.done === "boolean") nextTask.done = body.done;
  if (body.title !== undefined) {
    const title = normalizeTaskTitle(body.title);
    if (!title) {
      return NextResponse.json(
        { error: `Title is required (max ${SESSION_TASK_TITLE_MAX} characters).` },
        { status: 400 },
      );
    }
    nextTask.title = title;
  }
  if (typeof body.sort === "number" && Number.isFinite(body.sort)) {
    nextTask.sort = body.sort;
  }

  const next = existing.map((t, i) => (i === index ? nextTask : t));
  await gate.col.updateOne(
    { _id: gate.session._id },
    { $set: { session_tasks: next, updatedAt: nextTask.updatedAt } },
  );

  const event = await publishTasks(sessionId, next);
  return NextResponse.json({ ok: true, tasks: event.tasks });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const { id: sessionId } = await params;
  const gate = await requireParticipant(sessionId, userId);
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as { taskId?: unknown };
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const existing = gate.session.session_tasks ?? [];
  const current = existing.find((t) => t.id === taskId);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (current.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const next = existing.filter((t) => t.id !== taskId);
  await gate.col.updateOne(
    { _id: gate.session._id },
    { $set: { session_tasks: next, updatedAt: new Date() } },
  );

  const event = await publishTasks(sessionId, next);
  return NextResponse.json({ ok: true, tasks: event.tasks });
}
