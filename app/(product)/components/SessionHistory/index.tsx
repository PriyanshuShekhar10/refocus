"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Shell } from "@/components/design";
import { useWallpaperActive } from "@/components/wallpaper-context";
import { RecentSessionPartners } from "@/components/recent-session-partners";
import { SessionStatsDashboard } from "@/components/session-stats/dashboard";
import { PageRefreshButton, dispatchPageRefreshEvent, PAGE_REFRESH_EVENTS } from "@/components/page-refresh";

interface SessionHistoryProps {
  compact?: boolean;
}

export default function SessionHistory({ compact = false }: SessionHistoryProps) {
  const [statsExpanded, setStatsExpanded] = useState(!compact);
  const wallpaperActive = useWallpaperActive();

  return (
    <Shell transparent={wallpaperActive}>
      <div
        style={{
          padding: compact ? "4px 0" : "8px 4px",
          maxWidth: 980,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: compact ? 12 : 20,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-xl font-semibold text-gray-900 dark:text-white"
              style={{ fontSize: compact ? 20 : "clamp(24px, 4vw, 32px)" }}
            >
              Sessions
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Recent partners and your focus history.
            </p>
          </div>
          <PageRefreshButton
            onRefresh={() =>
              dispatchPageRefreshEvent(PAGE_REFRESH_EVENTS.sessions)
            }
          />
        </div>
        <RecentSessionPartners />
        {compact ? (
          <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setStatsExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-semibold text-gray-900 dark:text-white">
                Session stats
              </span>
              {statsExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            {statsExpanded && (
              <div className="border-t border-gray-200 px-2 pb-4 pt-2 dark:border-gray-700">
                <SessionStatsDashboard />
              </div>
            )}
          </section>
        ) : (
          <SessionStatsDashboard />
        )}
      </div>
    </Shell>
  );
}
