"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Eye, MessagesSquare, Search } from "lucide-react";

type ConversationUser = { id: string; name: string | null; username: string | null; email: string | null };
type ConversationSummary = {
  users: [ConversationUser, ConversationUser];
  messageCount: number;
  textCount: number;
  firstAt: string;
  lastAt: string;
  lastPreview: string | null;
};
type ConversationMessage = {
  id: string;
  fromUserId: string;
  type: string;
  content: string | null;
  createdAt: string;
  readAt: string | null;
  deleted: boolean;
};
type Thread = { users: [ConversationUser, ConversationUser]; messages: ConversationMessage[] };

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't load messages.");
  return data as T;
};

function label(u: ConversationUser) {
  return u.name || (u.username ? `@${u.username}` : u.email || "Unknown user");
}

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminMessages() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<[string, string] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const list = useSWR<{ conversations: ConversationSummary[] }>(
    `/api/admin/conversations${debounced ? `?q=${encodeURIComponent(debounced)}` : ""}`,
    fetcher,
  );
  // Opening a thread is audit-logged server-side, so only fetch on explicit selection.
  const thread = useSWR<Thread>(
    selected ? `/api/admin/conversations/${selected[0]}/${selected[1]}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const conversations = list.data?.conversations ?? [];
  const peopleCount = useMemo(
    () => new Set(conversations.flatMap((c) => c.users.map((u) => u.id))).size,
    [conversations],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-rf-ink">Private messages</h2>
          <p className="mt-0.5 text-[12.5px] text-rf-ink-mute">
            Who is messaging whom. Opening a conversation is recorded in History.
          </p>
        </div>
        <label className="flex h-9 w-full max-w-[280px] items-center gap-2 rounded-lg border border-rf-line bg-rf-card px-3 text-sm">
          <Search className="h-4 w-4 shrink-0 text-rf-ink-mute" aria-hidden />
          <input
            id="admin-messages-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, username or email"
            className="min-w-0 flex-1 bg-transparent text-rf-ink outline-none placeholder:text-rf-ink-mute"
          />
        </label>
      </div>

      {list.error ? (
        <div className="rounded-xl border border-rf-danger/35 bg-rf-danger-soft px-4 py-3 text-sm text-rf-danger">
          {(list.error as Error).message}
        </div>
      ) : null}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-rf-line bg-rf-card">
          <div className="border-b border-rf-line px-4 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.02em] text-rf-ink-mute">
            {list.isLoading && !list.data
              ? "Loading…"
              : `${conversations.length} conversations · ${peopleCount} people`}
          </div>
          <ul className="max-h-[640px] overflow-y-auto">
            {conversations.map((c) => {
              const key = `${c.users[0].id}:${c.users[1].id}`;
              const active = selected && `${selected[0]}:${selected[1]}` === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setSelected([c.users[0].id, c.users[1].id])}
                    aria-pressed={Boolean(active)}
                    className={`flex w-full flex-col gap-1 border-b border-rf-line-soft px-4 py-3 text-left transition-colors ${
                      active ? "bg-rf-line-soft" : "hover:bg-rf-line-soft/60"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-rf-ink">
                        {label(c.users[0])} ↔ {label(c.users[1])}
                      </span>
                      <span className="shrink-0 text-[11px] text-rf-ink-mute">{when(c.lastAt)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 text-[12px] text-rf-ink-mute">
                      <span className="truncate">{c.lastPreview ?? "Session invite"}</span>
                      <span className="shrink-0 tabular-nums">{c.messageCount} msgs</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!list.isLoading && conversations.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-rf-ink-mute">
                {debounced ? "No conversations match that search." : "No private messages yet."}
              </li>
            ) : null}
          </ul>
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-rf-line bg-rf-card">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-rf-ink-mute">
              <MessagesSquare className="h-6 w-6" aria-hidden />
              Select a conversation to read it.
            </div>
          ) : thread.error ? (
            <div className="px-4 py-6 text-sm text-rf-danger">{(thread.error as Error).message}</div>
          ) : !thread.data ? (
            <div className="px-4 py-6 text-sm text-rf-ink-mute">Loading conversation…</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rf-line px-4 py-3">
                <div className="min-w-0 text-sm">
                  {thread.data.users.map((u, i) => (
                    <span key={u.id} className="text-rf-ink">
                      {i > 0 ? <span className="px-1.5 text-rf-ink-mute">↔</span> : null}
                      <span className="font-medium">{label(u)}</span>
                      {u.email ? <span className="ml-1 text-xs text-rf-ink-mute">{u.email}</span> : null}
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-1 text-[11px] text-rf-ink-mute">
                  <Eye className="h-3.5 w-3.5" aria-hidden /> View logged
                </span>
              </div>
              <ol className="flex max-h-[640px] flex-col gap-2 overflow-y-auto px-4 py-4">
                {thread.data.messages.map((m) => {
                  const mine = m.fromUserId === thread.data!.users[0].id;
                  const sender = thread.data!.users.find((u) => u.id === m.fromUserId);
                  return (
                    <li key={m.id} className={`flex flex-col ${mine ? "items-start" : "items-end"}`}>
                      <span className="mb-0.5 text-[11px] text-rf-ink-mute">
                        {sender ? label(sender) : "Unknown"} · {when(m.createdAt)}
                        {m.readAt ? " · read" : ""}
                      </span>
                      <span
                        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                          mine ? "bg-rf-line-soft text-rf-ink" : "bg-rf-tint-blush text-rf-ink"
                        } ${m.deleted ? "italic opacity-70" : ""}`}
                      >
                        {m.type !== "text"
                          ? "Sent a session invite"
                          : m.deleted
                            ? `(deleted) ${m.content ?? ""}`
                            : m.content}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
