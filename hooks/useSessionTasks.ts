"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAblyClient } from "@/lib/ably-client";
import { sessionTasksChannel } from "@/lib/realtimeChannels";
import {
  SESSION_TASKS_PER_OWNER_MAX,
  SESSION_TASK_TITLE_MAX,
  taskProgress,
  tasksForOwner,
  type SessionTaskDTO,
  type SessionTasksUpdatedEvent,
} from "@/lib/sessionTasks";

type TasksResponse = { tasks?: SessionTaskDTO[]; error?: string };

export function useSessionTasks(sessionId: string, userId: string | null) {
  const [tasks, setTasks] = useState<SessionTaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const prevPartnerRef = useRef<Map<string, boolean>>(new Map());

  const yours = useMemo(
    () => (userId ? tasksForOwner(tasks, userId) : []),
    [tasks, userId],
  );
  const partnerTasks = useMemo(
    () => (userId ? tasks.filter((t) => t.ownerId !== userId) : tasks),
    [tasks, userId],
  );
  const youProgress = useMemo(() => taskProgress(yours), [yours]);
  const partnerProgress = useMemo(
    () => taskProgress(partnerTasks),
    [partnerTasks],
  );

  const flashPartnerChanges = useCallback(
    (next: SessionTaskDTO[]) => {
      if (!userId) return;
      const nextPartner = next.filter((t) => t.ownerId !== userId);
      const prev = prevPartnerRef.current;
      const changed: string[] = [];
      for (const task of nextPartner) {
        const was = prev.get(task.id);
        if (was !== undefined && was !== task.done) changed.push(task.id);
      }
      prevPartnerRef.current = new Map(
        nextPartner.map((t) => [t.id, t.done]),
      );
      if (changed.length === 0) return;
      setHighlightedIds((cur) => {
        const n = new Set(cur);
        for (const id of changed) n.add(id);
        return n;
      });
      window.setTimeout(() => {
        setHighlightedIds((cur) => {
          const n = new Set(cur);
          for (const id of changed) n.delete(id);
          return n;
        });
      }, 900);
    },
    [userId],
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/tasks`);
    const data = (await res.json().catch(() => ({}))) as TasksResponse;
    if (!res.ok) throw new Error(data.error || "Failed to load tasks");
    const next = data.tasks ?? [];
    flashPartnerChanges(next);
    setTasks(next);
  }, [sessionId, flashPartnerChanges]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getAblyClient>["channels"]["get"]> | null =
      null;
    try {
      const client = getAblyClient();
      channel = client.channels.get(sessionTasksChannel(sessionId));
      const onEvent = (message: { data?: unknown }) => {
        const data = message.data as SessionTasksUpdatedEvent | undefined;
        if (data?.type !== "session_tasks_updated") return;
        if (data.sessionId !== sessionId) return;
        flashPartnerChanges(data.tasks);
        setTasks(data.tasks);
      };
      channel.subscribe("event", onEvent);
      return () => {
        try {
          channel?.unsubscribe("event", onEvent);
        } catch {
          // ignore
        }
      };
    } catch {
      return undefined;
    }
  }, [sessionId, flashPartnerChanges]);

  const addTask = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed || !userId) return;
      if (yours.length >= SESSION_TASKS_PER_OWNER_MAX) {
        setError(`You can add at most ${SESSION_TASKS_PER_OWNER_MAX} tasks.`);
        return;
      }
      setError(null);
      const optimistic: SessionTaskDTO = {
        id: `tmp-${Date.now()}`,
        ownerId: userId,
        title: trimmed.slice(0, SESSION_TASK_TITLE_MAX),
        done: false,
        sort: yours.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks((cur) => [...cur, optimistic]);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        });
        const data = (await res.json().catch(() => ({}))) as TasksResponse;
        if (!res.ok) throw new Error(data.error || "Could not add task");
        if (data.tasks) setTasks(data.tasks);
      } catch (e) {
        setTasks((cur) => cur.filter((t) => t.id !== optimistic.id));
        setError((e as Error).message);
      }
    },
    [sessionId, userId, yours.length],
  );

  const toggleTask = useCallback(
    async (taskId: string, done: boolean) => {
      setError(null);
      setTasks((cur) =>
        cur.map((t) =>
          t.id === taskId
            ? { ...t, done, updatedAt: new Date().toISOString() }
            : t,
        ),
      );
      try {
        const res = await fetch(`/api/sessions/${sessionId}/tasks`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, done }),
        });
        const data = (await res.json().catch(() => ({}))) as TasksResponse;
        if (!res.ok) throw new Error(data.error || "Could not update task");
        if (data.tasks) setTasks(data.tasks);
      } catch (e) {
        setError((e as Error).message);
        void load().catch(() => {});
      }
    },
    [sessionId, load],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const previous = tasks;
      setError(null);
      setTasks((cur) => cur.filter((t) => t.id !== taskId));
      try {
        const res = await fetch(`/api/sessions/${sessionId}/tasks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        const data = (await res.json().catch(() => ({}))) as TasksResponse;
        if (!res.ok) throw new Error(data.error || "Could not delete task");
        if (data.tasks) setTasks(data.tasks);
      } catch (e) {
        setTasks(previous);
        setError((e as Error).message);
      }
    },
    [sessionId, tasks],
  );

  return {
    yours,
    partnerTasks,
    youProgress,
    partnerProgress,
    loading,
    error,
    highlightedIds,
    addTask,
    toggleTask,
    deleteTask,
    canAdd: yours.length < SESSION_TASKS_PER_OWNER_MAX,
  };
}
