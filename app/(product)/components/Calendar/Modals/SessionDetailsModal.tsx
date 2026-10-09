"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import type { CalendarEvent } from "@/types/calendar";
import { ModalWrapper } from "./ModalWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SESSION_COLOR_PRESETS,
  getSessionColorPresetIndex,
} from "@/constants/calendar";
import { getLocalSessionColor, setLocalSessionColor } from "@/lib/sessionColors";
import { formatLocalDate, formatLocalTimeRange } from "@/lib/localTime";
import { isCallJoinable } from "@/lib/sessionWindow";

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
      (other.username ? `@${other.username}` : "Your partner")
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const selectedColorIndex = getSessionColorPresetIndex(color);

  // Visibility for the "Join" button — mirrors the API window so a click
  // never lands on a 403. Recomputed every 15s while the modal is open.
  const isBooked = (event.participants?.length ?? 0) >= 2;
  const [canJoin, setCanJoin] = useState(() =>
    isCallJoinable(event.start, event.end),
  );
  useEffect(() => {
    const tick = () => setCanJoin(isCallJoinable(event.start, event.end));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [event.start, event.end]);

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
  const dateLabel = formatLocalDate(startDate, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeRange = formatLocalTimeRange(startDate, endDate, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <ModalWrapper onClose={onClose}>
      <div className="w-full max-w-md rounded-xl bg-rf-card shadow-2xl dark:text-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rf-line">
          <h2 className="text-lg font-semibold text-rf-ink">
            Session details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-rf-ink-mute hover:text-rf-ink hover:bg-rf-line-soft transition-colors"
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
            <div className="rounded-lg bg-rf-bg px-3 py-2.5">
              <p className="text-xs font-medium text-rf-ink-mute uppercase tracking-wide">
                When
              </p>
              <p className="text-sm font-medium text-rf-ink mt-0.5">
                {dateLabel}
              </p>
              <p className="text-sm text-rf-ink-soft">
                {timeRange}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-rf-ink capitalize">
                {event.sessionType}
              </span>
              <span className="text-rf-ink-mute">·</span>
              <span className="text-rf-ink-soft">
                {event.durationMin} min
              </span>
            </div>
          </section>

          {/* Editable: personal session label */}
          {self && (
            <section className="pt-1 border-t border-rf-line-soft">
              <label className="block text-xs font-medium text-rf-ink-mute uppercase tracking-wide mb-1.5">
                Session name
              </label>
              <p className="text-xs text-rf-ink-mute mb-2">
                Only you see this on your calendar
              </p>
              <input
                type="text"
                className="w-full rounded-lg border border-rf-line bg-rf-card px-3 py-2 text-sm text-rf-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rf-rose focus:border-transparent"
                placeholder="e.g. Morning focus"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </section>
          )}

          {/* Color — everyone can set for their own view */}
          <section className="pt-1 border-t border-rf-line-soft">
            <label className="block text-xs font-medium text-rf-ink-mute uppercase tracking-wide mb-1.5">
              Color
            </label>
            <p className="text-xs text-rf-ink-mute mb-2">
              Your view only — light and dark variants follow your theme
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => handleColorChange("")}
                className={`h-10 w-10 rounded-lg border-2 transition-all shrink-0 flex items-center justify-center text-sm font-medium ${
                  !color
                    ? "border-rf-rose ring-2 ring-rf-rose/30 bg-rf-line-soft text-rf-ink-soft"
                    : "border-rf-line hover:border-gray-400 dark:hover:border-gray-500 bg-rf-line-soft text-rf-ink-mute"
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
                        ? "border-rf-rose ring-2 ring-rf-rose/30"
                        : "border-rf-line hover:border-gray-400 dark:hover:border-gray-500"
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
            <section className="pt-1 border-t border-rf-line-soft">
              <p className="text-xs font-medium text-rf-ink-mute uppercase tracking-wide mb-2">
                Partner
              </p>
              <div className="rounded-lg bg-rf-bg px-3 py-2.5 flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  {other?.avatar_url ? (
                    <AvatarImage src={other.avatar_url} alt={otherName} />
                  ) : null}
                  <AvatarFallback className="text-sm font-semibold bg-rf-cream-bg text-rf-plum-ink">
                    {(otherName[0] || "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                <p className="text-sm font-medium text-rf-ink">
                  {otherName}
                </p>
                {other?.username && (
                  <p className="text-xs text-rf-ink-mute mt-0.5">
                    @{other.username}
                  </p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-rf-ink-mute">
                  <span>You: quiet {selfQuiet ? "on" : "off"}</span>
                  <span>Partner: quiet {partnerQuiet ? "on" : "off"}</span>
                </div>
                </div>
              </div>
            </section>
          )}

          {/* Join */}
          {isBooked && (
            <section className="pt-1 border-t border-rf-line-soft">
              <p className="text-xs font-medium text-rf-ink-mute uppercase tracking-wide mb-2">
                Live call
              </p>
              {canJoin ? (
                <a
                  href={`/sessions/${event.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rf-primary px-4 py-2.5 text-sm font-semibold text-rf-on-primary hover:bg-rf-primary-hover transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  Join session
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rf-line-soft px-4 py-2.5 text-sm font-medium text-rf-ink-mute cursor-not-allowed"
                  title="Join opens 5 minutes before the session starts"
                >
                  Join opens 5 min before start
                </button>
              )}
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-rf-line bg-rf-bg/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-rf-plum-ink min-h-[1.25rem]">
            {friendReqStatus}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {other && !isFriend && (
              <button
                type="button"
                onClick={sendFriendRequest}
                className="rounded-lg border border-rf-peach bg-rf-cream-bg px-3 py-2 text-sm font-medium text-rf-plum-ink hover:bg-rf-peach/35 transition-colors"
              >
                Add friend
              </button>
            )}
            {onLeave && !isOwner && (
              <button
                type="button"
                onClick={onLeave}
                className="rounded-lg border border-amber-500/60 dark:border-amber-500/50 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                Leave session
              </button>
            )}
            {self && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-rf-primary px-4 py-2 text-sm font-medium text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-rf-line px-4 py-2 text-sm font-medium text-rf-ink-soft hover:bg-rf-line-soft transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
