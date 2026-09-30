"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Loader2, PartyPopper } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAblyClient } from "@/lib/ably-client";
import { welcomeBoardChannel } from "@/lib/realtimeChannels";
import { swrKeys } from "@/lib/swr/keys";
import type { WelcomeAnnouncement } from "@/lib/welcomeAnnouncements";

type ProfilePreviewPayload = {
  username: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  onPreviewProfile?: (profile: ProfilePreviewPayload) => void;
  /** When true, header is rendered by the parent panel */
  compactHeader?: boolean;
  /** How many welcomes to show before "See more" (defaults to the page size). */
  initialVisible?: number;
  /** Let the list grow with its content instead of scrolling inside a fixed-height panel. */
  autoHeight?: boolean;
};

type WelcomeResponse = {
  announcements: WelcomeAnnouncement[];
  nextCursor: string | null;
};

const INITIAL_LIMIT = 8;
const PAGE_SIZE = 20;

const fetcher = async (url: string): Promise<WelcomeResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load welcome board");
  return res.json();
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (sameDay) return `Today at ${time}`;
  return (
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }) + ` at ${time}`
  );
}

function mentionLabel(a: WelcomeAnnouncement): string {
  if (a.username) return `@${a.username}`;
  return a.displayName;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function WelcomeBoard({
  onPreviewProfile,
  compactHeader = false,
  initialVisible = INITIAL_LIMIT,
  autoHeight = false,
}: Props) {
  const { data, error, isLoading, mutate } = useSWR<WelcomeResponse>(
    swrKeys.communityWelcome(INITIAL_LIMIT),
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: true },
  );

  const [older, setOlder] = useState<WelcomeAnnouncement[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setOlder([]);
    setNextCursor(data?.nextCursor ?? null);
    setExpanded(false);
    seenIdsRef.current = new Set(
      (data?.announcements ?? []).map((a) => a.id),
    );
  }, [data?.nextCursor, data?.announcements]);

  useEffect(() => {
    const client = getAblyClient();
    const channel = client.channels.get(welcomeBoardChannel());

    const onEvent = (message: { data?: unknown }) => {
      const payload = message.data as {
        type?: string;
        announcement?: WelcomeAnnouncement;
      } | null;
      if (payload?.type !== "welcome_announcement" || !payload.announcement) {
        return;
      }
      const incoming = payload.announcement;
      if (seenIdsRef.current.has(incoming.id)) return;
      seenIdsRef.current.add(incoming.id);

      void mutate(
        (current) => {
          if (!current) {
            return {
              announcements: [incoming],
              nextCursor: null,
            };
          }
          if (current.announcements.some((a) => a.id === incoming.id)) {
            return current;
          }
          return {
            ...current,
            announcements: [incoming, ...current.announcements],
          };
        },
        { revalidate: false },
      );
    };

    channel.subscribe("event", onEvent);
    return () => {
      channel.unsubscribe("event", onEvent);
    };
  }, [mutate]);

  const announcements = [...(data?.announcements ?? []), ...older];
  const visible = expanded
    ? announcements
    : announcements.slice(0, initialVisible);
  const canSeeMore =
    announcements.length > initialVisible || Boolean(nextCursor);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        swrKeys.communityWelcomePage(nextCursor, PAGE_SIZE),
      );
      if (!res.ok) return;
      const page = (await res.json()) as WelcomeResponse;
      setOlder((prev) => {
        const ids = new Set(prev.map((a) => a.id));
        const fresh = page.announcements.filter((a) => !ids.has(a.id));
        return [...prev, ...fresh];
      });
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  const handleSeeMore = async () => {
    setExpanded(true);
    if (nextCursor) {
      await loadMore();
    }
  };

  const openProfile = (a: WelcomeAnnouncement) => {
    if (!onPreviewProfile || !a.username) return;
    onPreviewProfile({
      username: a.username,
      name: a.displayName,
      avatarUrl: a.avatarUrl,
    });
  };

  return (
    <div className={autoHeight ? "flex flex-col" : "flex h-full min-h-0 flex-col"}>
      {!compactHeader ? (
        <div className="shrink-0 border-b border-border/70 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rf-plum-ink/10 text-rf-plum-ink">
              <PartyPopper className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                Recently joined
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Live announcements when someone joins the Refocus community.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={autoHeight ? "p-1.5" : "min-h-0 flex-1 overflow-y-auto p-1.5"}>
        {isLoading && !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load welcome messages.
            </p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-2 text-sm font-medium text-rf-plum-ink hover:underline"
            >
              Try again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-12 text-center">
            <PartyPopper className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No welcomes yet — the next new member will show up here.
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((a) => {
              const mention = mentionLabel(a);
              return (
                <li
                  key={a.id}
                  className="group flex gap-2.5 rounded-[10px] p-2 transition-colors hover:bg-rf-line-soft"
                >
                  <Avatar className="h-[34px] w-[34px] shrink-0">
                    {a.avatarUrl ? (
                      <AvatarImage src={a.avatarUrl} alt={a.displayName} />
                    ) : null}
                    <AvatarFallback className="bg-rf-cream-bg text-[11px] font-semibold text-rf-plum-ink">
                      {initials(a.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[13.5px] font-semibold text-rf-ink">
                        Refocus
                      </span>
                      <span className="rounded bg-rf-plum-soft px-[5px] py-px text-[9.5px] font-semibold uppercase tracking-[0.04em] text-rf-plum-ink">
                        Bot
                      </span>
                      <span className="text-[11px] text-rf-ink-mute">
                        {formatWhen(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13.5px] leading-[1.45] text-rf-ink-soft">
                      Welcome{" "}
                      {a.username && onPreviewProfile ? (
                        <button
                          type="button"
                          onClick={() => openProfile(a)}
                          className="font-semibold text-rf-plum-ink hover:underline"
                        >
                          {mention}
                        </button>
                      ) : (
                        <span className="font-semibold text-rf-plum-ink">
                          {mention}
                        </span>
                      )}{" "}
                      to the Refocus community!!
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canSeeMore && !expanded ? (
          <button
            type="button"
            onClick={() => void handleSeeMore()}
            className="w-full px-2 py-1.5 text-left text-xs font-medium text-rf-plum-ink hover:underline"
          >
            See more →
          </button>
        ) : null}

        {expanded && nextCursor ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="mt-2 w-full px-2 py-1.5 text-left text-xs font-medium text-rf-plum-ink hover:underline disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "See more →"}
          </button>
        ) : null}

        {loadingMore && expanded ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
