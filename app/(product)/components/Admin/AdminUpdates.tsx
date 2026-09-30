"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, Sparkles, Trash2 } from "lucide-react";
import {
  PRODUCT_UPDATE_BODY_MAX,
  PRODUCT_UPDATE_TITLE_MAX,
} from "@/lib/productUpdates.constants";

type UpdateItem = {
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
  createdByName: string | null;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminUpdates({ active }: { active: boolean }) {
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/updates");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load updates");
      setUpdates(data.updates ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const enhance = async () => {
    if (!title.trim() && !body.trim()) return;
    setEnhancing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/updates/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to enhance message");
      if (typeof data.body === "string") {
        setBody(data.body.slice(0, PRODUCT_UPDATE_BODY_MAX));
      }
      if (data.title === null) {
        setTitle("");
      } else if (typeof data.title === "string") {
        setTitle(data.title.slice(0, PRODUCT_UPDATE_TITLE_MAX));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnhancing(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to publish");
      setTitle("");
      setBody("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this update for everyone?")) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/updates/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setUpdates((current) => current.filter((update) => update.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-rf-ink">
          Product updates
        </h2>
        <p className="mt-1 text-sm text-rf-ink-mute">
          Send a short in-app note to everyone. It appears in the right sidebar
          between the profile card and footer; users can dismiss it with a
          satisfying pop.
        </p>
      </div>

      <div className="rounded-xl border border-rf-line bg-rf-card p-4 space-y-3">
        <label className="block text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
          Title (optional)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, PRODUCT_UPDATE_TITLE_MAX))}
          placeholder="e.g. New Community mentions"
          className="w-full rounded-lg border border-rf-line bg-rf-card px-3 py-2 text-sm"
          disabled={publishing || enhancing}
        />

        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
            Message
          </label>
          <button
            type="button"
            onClick={() => void enhance()}
            disabled={enhancing || publishing || (!title.trim() && !body.trim())}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-rf-plum-ink transition-colors hover:text-rf-plum-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enhancing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Enhancing…
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" aria-hidden />
                AI Enhance
              </>
            )}
          </button>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, PRODUCT_UPDATE_BODY_MAX))}
          rows={4}
          placeholder="Share a quick product update, fix, or tip…"
          className="w-full resize-y rounded-lg border border-rf-line bg-rf-card px-3 py-2 text-sm"
          disabled={publishing || enhancing}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-rf-ink-mute">
            {body.length}/{PRODUCT_UPDATE_BODY_MAX}
          </span>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={publishing || enhancing || !body.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-rf-primary px-4 py-2 text-sm font-medium text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Megaphone className="h-4 w-4" aria-hidden />
            )}
            {publishing ? "Publishing…" : "Publish update"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-rf-line bg-rf-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
          Published updates
        </p>
        {loading && updates.length === 0 ? (
          <p className="mt-3 text-sm text-rf-ink-mute">Loading…</p>
        ) : updates.length === 0 ? (
          <p className="mt-3 text-sm text-rf-ink-mute">No updates yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-rf-line-soft">
            {updates.map((update) => (
              <li key={update.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-rf-ink">
                    {update.title || "What's new"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-rf-ink-soft">
                    {update.body}
                  </p>
                  <p className="mt-2 text-xs text-rf-ink-mute">
                    {formatWhen(update.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(update.id)}
                  disabled={deletingId === update.id}
                  className="shrink-0 rounded-lg border border-rf-line px-2.5 py-1.5 text-xs text-rf-ink-soft hover:bg-rf-line-soft disabled:opacity-50"
                >
                  {deletingId === update.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
