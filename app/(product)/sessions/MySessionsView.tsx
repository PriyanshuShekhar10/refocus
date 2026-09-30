"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageRefreshButton } from "@/components/page-refresh";
import { SessionsTabs } from "./SessionsTabs";
import type { PastSession } from "./PastSessionsList";

interface MySessionsViewProps {
  upcoming: PastSession[];
  past: PastSession[];
  currentUserId: string;
  onRefresh?: () => void;
  /** Hide "Back to Calendar" when already inside the dashboard. */
  showBackLink?: boolean;
}

export function MySessionsView({
  upcoming,
  past,
  currentUserId,
  onRefresh,
  showBackLink = true,
}: MySessionsViewProps) {
  return (
    <div className="flex flex-col">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-[14px] border border-rf-line bg-rf-card p-6">
        <div>
          <span className="inline-flex items-center gap-2.5 font-rf-mono text-xs uppercase tracking-[0.04em] text-rf-ink-mute">
            <span aria-hidden className="h-px w-[18px] bg-rf-ink-mute" />
            Sessions
          </span>
          <h1 className="mt-2 text-[clamp(24px,4vw,32px)] font-medium leading-[1.05] tracking-[-0.04em] text-rf-ink">
            My Sessions
          </h1>
          <p className="mt-2.5 text-sm text-rf-ink-soft">
            Upcoming bookings and everything you’ve completed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageRefreshButton onRefresh={onRefresh} />
          {showBackLink ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-rf-line bg-rf-card px-3.5 text-[13px] font-medium text-rf-ink transition-colors hover:border-rf-ink-mute"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to Calendar
            </Link>
          ) : null}
        </div>
      </header>

      <SessionsTabs upcoming={upcoming} past={past} currentUserId={currentUserId} />
    </div>
  );
}
