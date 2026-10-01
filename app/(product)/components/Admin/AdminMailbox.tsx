"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, Send, X } from "lucide-react";
import {
  ADMIN_MAIL_BODY_MAX,
  ADMIN_MAIL_MAX_RECIPIENTS,
  ADMIN_MAIL_SUBJECT_MAX,
} from "@/lib/email/adminMailLimits";

export type MailRecipient = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
};

type SentMessage = {
  id: string;
  actorEmail: string | null;
  subject: string;
  body: string;
  recipients: Array<{
    userId: string;
    email: string | null;
    name: string | null;
    status: string;
  }>;
  sentCount: number;
  failedCount: number;
  createdAt: string | null;
};

type SearchHit = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
};

function recipientLabel(r: { name: string | null; email: string | null; username: string | null }) {
  return r.name || r.username || r.email || "User";
}

export default function AdminMailbox({
  prefill,
  onPrefillConsumed,
}: {
  prefill: MailRecipient[] | null;
  onPrefillConsumed: () => void;
}) {
  const [recipients, setRecipients] = useState<MailRecipient[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(recipients.map((r) => r.id)),
    [recipients],
  );

  useEffect(() => {
    if (!prefill?.length) return;
    setRecipients((current) => {
      const next = [...current];
      for (const r of prefill) {
        if (!r.email) continue;
        if (next.some((x) => x.id === r.id)) continue;
        if (next.length >= ADMIN_MAIL_MAX_RECIPIENTS) break;
        next.push(r);
      }
      return next;
    });
    onPrefillConsumed();
  }, [prefill, onPrefillConsumed]);

  const loadSent = useCallback(async () => {
    const res = await fetch("/api/admin/mail?limit=40");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load sent mail");
    setSent(data.messages || []);
  }, []);

  useEffect(() => {
    void loadSent().catch((e) => setError((e as Error).message));
  }, [loadSent]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(() => {
      fetch(`/api/admin/users?q=${encodeURIComponent(q)}&limit=8`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          const users = (data.users || []) as SearchHit[];
          setHits(users.filter((u) => u.email && !selectedIds.has(u.id)));
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, selectedIds]);

  const addRecipient = (hit: SearchHit) => {
    if (!hit.email) return;
    if (recipients.length >= ADMIN_MAIL_MAX_RECIPIENTS) {
      setError(`Max ${ADMIN_MAIL_MAX_RECIPIENTS} recipients.`);
      return;
    }
    setRecipients((current) =>
      current.some((r) => r.id === hit.id)
        ? current
        : [
            ...current,
            {
              id: hit.id,
              email: hit.email as string,
              name: hit.name,
              username: hit.username,
            },
          ],
    );
    setQuery("");
    setHits([]);
    setError(null);
  };

  const send = async () => {
    setError(null);
    setNotice(null);
    if (recipients.length === 0) {
      setError("Add at least one recipient.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: recipients.map((r) => r.id),
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Send failed");
      const failed = data.failedCount ?? 0;
      setNotice(
        failed
          ? `Sent to ${data.sentCount}. ${failed} could not be delivered.`
          : `Sent to ${data.sentCount} ${data.sentCount === 1 ? "person" : "people"}.`,
      );
      setSubject("");
      setBody("");
      setRecipients([]);
      await loadSent();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="rounded-xl border border-rf-line bg-rf-card">
        <div className="flex items-center gap-2 border-b border-rf-line-soft px-4 py-3">
          <Send className="h-4 w-4 text-rf-plum-ink" />
          <p className="text-sm font-semibold text-rf-ink">
            Compose
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
              To
            </label>
            <div className="rounded-lg border border-rf-line bg-rf-card p-2">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {recipients.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 rounded-full bg-rf-plum-ink/10 px-2 py-0.5 text-xs text-rf-plum-ink"
                  >
                    {recipientLabel(r)}
                    <button
                      type="button"
                      aria-label={`Remove ${recipientLabel(r)}`}
                      onClick={() =>
                        setRecipients((current) =>
                          current.filter((x) => x.id !== r.id),
                        )
                      }
                      className="rounded-full p-0.5 hover:bg-rf-primary-hover/15"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  recipients.length
                    ? "Add another person…"
                    : "Search name, username, or email…"
                }
                className="w-full bg-transparent px-1 py-1 text-sm outline-none"
              />
            </div>
            {query.trim().length >= 2 ? (
              <div className="mt-1 overflow-hidden rounded-lg border border-rf-line bg-rf-card shadow-sm">
                {searching ? (
                  <p className="px-3 py-2 text-xs text-rf-ink-mute">Searching…</p>
                ) : hits.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-rf-ink-mute">
                    No matching users with an email.
                  </p>
                ) : (
                  hits.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => addRecipient(hit)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-rf-line-soft"
                    >
                      <span className="font-medium text-rf-ink">
                        {recipientLabel(hit)}
                      </span>
                      <span className="text-xs text-rf-ink-mute">{hit.email}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
            <p className="mt-1 text-[11px] text-rf-ink-mute">
              {recipients.length}/{ADMIN_MAIL_MAX_RECIPIENTS} selected
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
              Subject
            </label>
            <input
              value={subject}
              maxLength={ADMIN_MAIL_SUBJECT_MAX}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What’s this about?"
              className="w-full rounded-lg border border-rf-line bg-rf-card px-3 py-2 text-[13.5px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
              Message
            </label>
            <textarea
              value={body}
              maxLength={ADMIN_MAIL_BODY_MAX}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Write in plain text. Line breaks and links are kept."
              className="w-full resize-y rounded-lg border border-rf-line bg-rf-card px-3 py-2 text-[13.5px] leading-6"
            />
            <p className="mt-1 text-right text-[11px] text-rf-ink-mute">
              {body.length}/{ADMIN_MAIL_BODY_MAX}
            </p>
          </div>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          {notice ? (
            <p className="text-sm text-green-700 dark:text-green-400">{notice}</p>
          ) : null}
          <button
            type="button"
            disabled={sending}
            onClick={() => void send()}
            className="inline-flex items-center gap-2 rounded-lg bg-rf-primary px-4 py-2 text-sm font-medium text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending
              ? "Sending…"
              : recipients.length > 1
                ? `Send to ${recipients.length} people`
                : "Send"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-rf-line bg-rf-card">
        <div className="flex items-center gap-2 border-b border-rf-line-soft px-4 py-3">
          <Inbox className="h-4 w-4 text-rf-ink-mute" />
          <p className="text-sm font-semibold text-rf-ink">
            Sent
          </p>
        </div>
        <div className="divide-y divide-rf-line-soft">
          {sent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-rf-ink-mute">
              Nothing sent yet.
            </p>
          ) : (
            sent.map((m) => {
              const open = expandedId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setExpandedId(open ? null : m.id)}
                  className="block w-full px-4 py-3 text-left hover:bg-rf-line-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-medium text-rf-ink">
                      {m.subject}
                    </p>
                    <span className="shrink-0 text-[11px] text-rf-ink-mute">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-rf-ink-mute">
                    {m.sentCount} sent
                    {m.failedCount ? ` · ${m.failedCount} failed` : ""} ·{" "}
                    {m.recipients
                      .map((r) => r.name || r.email)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(", ")}
                    {m.recipients.length > 3
                      ? ` +${m.recipients.length - 3}`
                      : ""}
                  </p>
                  {open ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-rf-ink-soft">
                      {m.body}
                    </p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
