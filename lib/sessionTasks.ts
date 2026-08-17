export const SESSION_TASK_TITLE_MAX = 80;
export const SESSION_TASKS_PER_OWNER_MAX = 12;

export type SessionTask = {
  id: string;
  ownerId: string;
  title: string;
  done: boolean;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionTaskDTO = {
  id: string;
  ownerId: string;
  title: string;
  done: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
};

export type SessionTasksUpdatedEvent = {
  type: "session_tasks_updated";
  sessionId: string;
  tasks: SessionTaskDTO[];
};

export function serializeSessionTask(task: SessionTask): SessionTaskDTO {
  return {
    id: task.id,
    ownerId: task.ownerId,
    title: task.title,
    done: task.done,
    sort: task.sort,
    createdAt: new Date(task.createdAt).toISOString(),
    updatedAt: new Date(task.updatedAt).toISOString(),
  };
}

export function serializeSessionTasks(
  tasks: SessionTask[] | null | undefined,
): SessionTaskDTO[] {
  return [...(tasks ?? [])]
    .sort((a, b) => a.sort - b.sort || +new Date(a.createdAt) - +new Date(b.createdAt))
    .map(serializeSessionTask);
}

export function normalizeTaskTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.trim().replace(/\s+/g, " ");
  if (!title) return null;
  return title.slice(0, SESSION_TASK_TITLE_MAX);
}

export function tasksForOwner(
  tasks: SessionTaskDTO[],
  ownerId: string,
): SessionTaskDTO[] {
  return tasks.filter((t) => t.ownerId === ownerId);
}

export function taskProgress(tasks: SessionTaskDTO[]): {
  done: number;
  total: number;
} {
  return {
    done: tasks.filter((t) => t.done).length,
    total: tasks.length,
  };
}

export function partnerFirstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}
