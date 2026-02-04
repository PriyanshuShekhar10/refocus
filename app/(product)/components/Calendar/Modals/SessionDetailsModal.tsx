"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import type { CalendarEvent } from "@/types/calendar";
import { ModalWrapper } from "./ModalWrapper";
import {
  SESSION_COLOR_PRESETS,
  getSessionColorPresetIndex,
  TIME_CONFIG,
} from "@/constants/calendar";
import { getLocalSessionColor, setLocalSessionColor } from "@/lib/sessionColors";

export function SessionDetailsModal({
  event,
  onClose,
  currentUserId,
  onUpdate,
  onLeave,
}: {
  event: CalendarEvent;
  onClose: () => void;
  currentUserId: string | null;
  onUpdate: (patch: { name?: string | null }) => void;
  /** When provided and user is participant (not owner), shows Leave session button */
  onLeave?: () => void;
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
  const [color, setColor] = useState<string>(
    () => getLocalSessionColor(event.id) ?? "",
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [friendReqStatus, setFriendReqStatus] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const selectedColorIndex = getSessionColorPresetIndex(color);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sessions/${event.id}`
      : `/sessions/${event.id}`;

  const copyJoinLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Copy failed");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, [joinUrl]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ name: name || null });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = useCallback(
    (newColor: string) => {
      setColor(newColor);
      setLocalSessionColor(event.id, newColor);
    },
    [event.id],
  );

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
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const dateLabel = startDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_CONFIG.timezone,
  });
  const timeRange = `${startDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_CONFIG.timezone,
  })} – ${endDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_CONFIG.timezone,
  })}`;

  return (
    <ModalWrapper onClose={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-900 dark:text-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Session details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* When & Type — read-only summary */}
          <section className="space-y-2">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                When
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                {dateLabel}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {timeRange}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                {event.sessionType}
              </span>
              <span className="text-gray-400 dark:text-gray-500">·</span>
              <span className="text-gray-600 dark:text-gray-400">
                {event.durationMin} min
              </span>
            </div>
          </section>

          {/* Editable: session name (owner only) */}
          {isOwner && (
            <section className="pt-1 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Session name
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                placeholder="e.g. Morning focus"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </section>
          )}

          {/* Color — everyone can set for their own view */}
          <section className="pt-1 border-t border-gray-100 dark:border-gray-800">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Color
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Your view only — light and dark variants follow your theme
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => handleColorChange("")}
                className={`h-10 w-10 rounded-lg border-2 transition-all shrink-0 flex items-center justify-center text-sm font-medium ${
                  !color
                    ? "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/30 dark:ring-indigo-400/30 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}
                title="Default"
              >
                —
              </button>
              {SESSION_COLOR_PRESETS.map((preset, index) => {
                const displayColor = isDark ? preset.dark : preset.light;
                const isSelected = selectedColorIndex === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleColorChange(preset.light)}
                    className={`h-10 w-10 rounded-lg border-2 transition-all shrink-0 ${
                      isSelected
                        ? "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/30 dark:ring-indigo-400/30"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                    style={{ backgroundColor: displayColor }}
                    title={`Color ${index + 1}`}
                  />
                );
              })}
            </div>
          </section>

          {/* Partner (when booked) */}
          {otherName && (
            <section className="pt-1 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Partner
              </p>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {otherName}
                </p>
                {other?.email && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {other.email}
                  </p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>You: quiet {selfQuiet ? "on" : "off"}</span>
                  <span>Partner: quiet {partnerQuiet ? "on" : "off"}</span>
                </div>
              </div>
            </section>
          )}

          {/* Join link + copy */}
          <section className="pt-1 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Join link
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-hidden">
              <a
                href={`/sessions/${event.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 px-3 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate"
              >
                {joinUrl.replace(/^https?:\/\//, "")}
              </a>
              <button
                type="button"
                onClick={copyJoinLink}
                className="shrink-0 px-3 py-2.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                {copyFeedback ?? "Copy"}
              </button>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-green-600 dark:text-green-400 min-h-[1.25rem]">
            {friendReqStatus}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {other && !isFriend && (
              <button
                type="button"
                onClick={sendFriendRequest}
                className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
              >
                Add friend
              </button>
            )}
            {onLeave && (
              <button
                type="button"
                onClick={onLeave}
                className="rounded-lg border border-amber-500/60 dark:border-amber-500/50 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                Leave session
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
