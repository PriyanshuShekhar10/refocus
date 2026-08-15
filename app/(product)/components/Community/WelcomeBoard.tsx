"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Loader2, PartyPopper } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
};

type WelcomeResponse = {
  announcements: WelcomeAnnouncement[];
  nextCursor: string | null;
};

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

export default function WelcomeBoard({ onPreviewProfile }: Props) {
  const { data, error, isLoading, mutate } = useSWR<WelcomeResponse>(
    swrKeys.communityWelcome(40),
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );

  const [older, setOlder] = useState<WelcomeAnnouncement[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOlder([]);
    setNextCursor(data?.nextCursor ?? null);
  }, [data?.nextCursor, data?.announcements]);

  const announcements = [...(data?.announcements ?? []), ...older];

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(swrKeys.communityWelcomePage(nextCursor, 30));
      if (!res.ok) return;
      const page = (await res.json()) as WelcomeResponse;
      setOlder((prev) => [...prev, ...page.announcements]);
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const openProfile = (a: WelcomeAnnouncement) => {
    if (!onPreviewProfile || !a.username) return;
    onPreviewProfile({
      username: a.username,
      name: a.displayName,
      avatarUrl: a.avatarUrl,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/70 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5D1C6A]/10 text-[#5D1C6A]">
            <PartyPopper className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">#welcome</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Public announcements when someone joins the Refocus community.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
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
              className="mt-2 text-sm font-medium text-[#5D1C6A] hover:underline"
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
          <ul className="space-y-1">
            {announcements.map((a) => {
              const mention = mentionLabel(a);
              return (
                <li
                  key={a.id}
                  className="group flex gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="mt-0.5 h-9 w-9 shrink-0">
                    {a.avatarUrl ? (
                      <AvatarImage src={a.avatarUrl} alt={a.displayName} />
                    ) : null}
                    <AvatarFallback className="bg-[#5D1C6A]/15 text-[11px] font-semibold text-[#5D1C6A]">
                      {initials(a.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        Refocus
                      </span>
                      <span className="rounded bg-[#5D1C6A]/10 px-1 py-px text-[10px] font-medium uppercase tracking-wide text-[#5D1C6A]">
                        Bot
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatWhen(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">
                      Welcome{" "}
                      {a.username && onPreviewProfile ? (
                        <button
                          type="button"
                          onClick={() => openProfile(a)}
                          className="font-semibold text-[#5865F2] hover:underline"
                        >
                          {mention}
                        </button>
                      ) : (
                        <span className="font-semibold text-[#5865F2]">
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

        <div ref={loadMoreRef} className="h-4" />
        {loadingMore ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
