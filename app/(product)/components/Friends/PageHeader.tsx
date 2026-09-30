"use client";

import { ChangeEvent, ReactNode } from "react";
import { Search } from "lucide-react";
import { designStyles } from "@/components/design";
import { PageRefreshButton } from "@/components/page-refresh";

interface PageHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** Rendered along the bottom of the header card (stat strip). */
  footer?: ReactNode;
}

export default function PageHeader({ query, onQueryChange, footer }: PageHeaderProps) {
  return (
    <header className={`${designStyles.card} mb-5`}>
      <span className={designStyles.eyebrow}>People</span>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: "clamp(24px, 4vw, 32px)", lineHeight: 1.05, marginTop: 0 }}
          >
            Friends
          </h1>
          <p
            className={designStyles.pageSub}
            style={{ fontSize: 14, marginTop: 10, maxWidth: "42ch" }}
          >
            Chat with accountability partners, respond to requests, and book
            focus sessions together.
          </p>
        </div>
        <div className="flex w-full max-w-[360px] items-center gap-2">
          <PageRefreshButton className="shrink-0" />
          <label
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3.5"
          style={{
            border: "1px solid var(--line)",
            background: "var(--card)",
          }}
          role="search"
        >
          <Search
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--ink-mute)" }}
          />
          <input
            type="text"
            placeholder="Search friends"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onQueryChange(e.target.value)
            }
            aria-label="Search friends"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
            style={{ color: "var(--ink)" }}
          />
        </label>
        </div>
      </div>
      {footer}
    </header>
  );
}
