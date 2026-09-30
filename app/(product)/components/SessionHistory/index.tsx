"use client";

import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";
import { MySessionsView } from "@/app/(product)/sessions/MySessionsView";
import { RecentSessionPartners } from "@/components/recent-session-partners";
import { SessionStatsDashboard } from "@/components/session-stats/dashboard";
import type { PastSession } from "@/app/(product)/sessions/PastSessionsList";

type MySessionsResponse = {
  currentUserId: string;
  upcoming: PastSession[];
  past: PastSession[];
};

export default function SessionHistory() {
  const { data, error, isLoading, mutate } = useSWR<MySessionsResponse>(
    swrKeys.sessionsMine,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Couldn't load your sessions.");
      return res.json();
    },
    { revalidateOnFocus: true },
  );

  if (isLoading && !data) {
    return (
      <p className="py-16 text-center text-sm text-rf-ink-mute">
        Loading your sessions…
      </p>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[14px] border border-rf-line bg-rf-card p-6 text-center">
        <p className="text-sm text-rf-ink-soft">
          {error instanceof Error ? error.message : "Couldn't load your sessions."}
        </p>
        <button
          type="button"
          onClick={() => void mutate()}
          className="mt-3 text-sm font-medium text-rf-plum-ink hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <MySessionsView
        upcoming={data.upcoming}
        past={data.past}
        currentUserId={data.currentUserId}
        onRefresh={() => void mutate()}
        showBackLink={false}
      />
      <RecentSessionPartners />
      <SessionStatsDashboard />
    </div>
  );
}
