import { useState, useEffect, useMemo } from "react";
import type { CalendarEvent } from "@/types/calendar";

export function SessionDetailsModal({
  event,
  onClose,
  currentUserId,
  onUpdate,
}: {
  event: CalendarEvent;
  onClose: () => void;
  currentUserId: string | null;
  onUpdate: (patch: { name?: string | null; color?: string | null }) => void;
}) {
  const participants = event.participants || [];
  const other = participants.find((p) => p.user_id !== currentUserId);
  const self = participants.find((p) => p.user_id === currentUserId);
  const selfQuiet = Boolean(self?.quiet);
  const partnerQuiet = Boolean(other?.quiet);
  const otherName = other
    ? [other.firstname, other.lastname].filter(Boolean).join(" ") ||
      other.email ||
      other.user_id
    : undefined;
  const isOwner =
    event.owner_id && currentUserId && event.owner_id === currentUserId;
  const [name, setName] = useState<string>(event.name || "");
  const [color, setColor] = useState<string>(event.color || "");
  const [saving, setSaving] = useState<boolean>(false);
  const [friendReqStatus, setFriendReqStatus] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState<boolean>(false);
  useEffect(() => {
    let cancelled = false;
    const checkFriend = async () => {
      if (!other?.user_id) {
        if (!cancelled) setIsFriend(false);
        return;
      }
      try {
        const res = await fetch("/api/friends");
        if (!res.ok) return;
        const data = await res.json();
        const list: Array<{ user_id: string }> = data.friends || [];
        if (!cancelled)
          setIsFriend(list.some((f) => f.user_id === other.user_id));
      } catch {
        // ignore — if it fails, we leave button visible
      }
    };
    checkFriend();
    return () => {
      cancelled = true;
    };
  }, [other?.user_id]);
  const isColorValid = useMemo(() => {
    if (!color) return true;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
  }, [color]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ name: name || null, color: color || null });
    } finally {
      setSaving(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!other?.user_id) return;
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: other.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send request");
      setFriendReqStatus("Request sent");
      setTimeout(() => setFriendReqStatus(null), 2000);
    } catch (e) {
      setFriendReqStatus((e as Error).message);
      setTimeout(() => setFriendReqStatus(null), 3000);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Session details
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Close
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              When:
            </span>
            <div className="mt-1 rounded bg-gray-50 p-2 dark:bg-gray-800">
              {new Date(event.start).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}{" "}
              →{" "}
              {new Date(event.end).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Type:
            </span>{" "}
            {event.sessionType} • {event.durationMin} min
          </div>
          {isOwner && (
            <div className="grid grid-cols-1 gap-3 pt-2">
              <div>
                <label className="font-medium text-gray-900 dark:text-gray-100">
                  Session name
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="Optional name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="font-medium text-gray-900 dark:text-gray-100">
                  Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-12 cursor-pointer rounded-md border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
                    value={color || "#eef2ff"}
                    onChange={(e) => setColor(e.target.value)}
                    title="Pick a color"
                  />
                  <input
                    className={`w-40 rounded-md border px-3 py-2 text-sm ${
                      isColorValid
                        ? "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        : "border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    }`}
                    placeholder="#eef2ff"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                {!isColorValid && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Enter a valid hex color like #abc or #aabbcc
                  </p>
                )}
              </div>
            </div>
          )}
          {otherName && (
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Partner:
              </span>{" "}
              {otherName}
              {other?.email && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {other.email}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1 space-y-0.5 dark:text-gray-400">
                <div>You selected quiet: {selfQuiet ? "Yes" : "No"}</div>
                <div>Partner selected quiet: {partnerQuiet ? "Yes" : "No"}</div>
              </div>
            </div>
          )}
          <div className="pt-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Join link:
            </span>
            <div className="mt-1 text-sm break-all">
              <a
                className="text-indigo-600 hover:underline dark:text-indigo-400"
                href={`/sessions/${event.id}`}
              >
                /sessions/{event.id}
              </a>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-green-700 dark:text-green-400">
            {friendReqStatus}
          </div>
          <div className="flex gap-2">
            {other && !isFriend && (
              <button
                onClick={sendFriendRequest}
                className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
              >
                Send friend request
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleSave}
                disabled={saving || !isColorValid}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
