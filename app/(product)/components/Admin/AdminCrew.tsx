"use client";

import { useCallback, useEffect, useState } from "react";

type CrewMember = {
  email: string;
  canonicalEmail: string;
  userId: string | null;
  name: string | null;
  addedAt: string;
};

export default function AdminCrew({ active }: { active: boolean }) {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/crew");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load crew");
      setMembers(data.members || []);
      setPublicUrl(data.publicUrl ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setEmail("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberEmail: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/crew", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy link");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-rf-ink">
          Engagement crew
        </h2>
        <p className="mt-1 text-sm text-rf-ink-mute">
          Add emails for hired engagers. The board is visible only to crew
          members and admins. It is not linked from the app.
        </p>
      </div>

      <div className="rounded-xl border border-rf-line bg-rf-card p-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
          Board link
        </p>
        {publicUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-rf-bg px-3 py-2 text-xs text-rf-ink-soft">
              {publicUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="rounded-lg border border-rf-line px-3 py-2 text-sm hover:bg-rf-line-soft"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-rf-ink-mute">Loading link…</p>
        )}
      </div>

      <form className="flex gap-2" onSubmit={(e) => void addMember(e)}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1 rounded-lg border border-rf-line bg-rf-card px-3 py-2 text-sm"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="rounded-lg bg-rf-primary px-4 py-2 text-sm font-medium text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-rf-ink-mute">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-rf-line">
          <table className="w-full text-sm">
            <thead className="bg-rf-bg text-left text-xs uppercase text-rf-ink-mute">
              <tr>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rf-line-soft bg-rf-card">
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-rf-ink-mute"
                  >
                    No crew members yet
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.canonicalEmail}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-rf-ink">
                        {m.name || "—"}
                      </div>
                      <div className="text-xs text-rf-ink-mute">{m.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-rf-ink-mute">
                      {m.userId ? "Registered" : "Not registered yet"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeMember(m.email)}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
