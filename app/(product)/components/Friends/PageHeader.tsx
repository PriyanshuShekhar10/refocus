"use client";

import { ChangeEvent } from "react";
import { Search } from "lucide-react";
import { designStyles } from "@/components/design";
import { PageRefreshButton } from "@/components/page-refresh";

interface PageHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export default function PageHeader({ query, onQueryChange }: PageHeaderProps) {
  return (
    <header className={`${designStyles.card} mb-6`}>
      <span className={designStyles.eyebrow}>People</span>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: "clamp(24px, 4vw, 32px)" }}
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
        <div className="flex w-full max-w-md flex-col items-stretch gap-2 sm:items-end">
          <PageRefreshButton className="self-end" />
          <label
          className="flex h-10 w-full max-w-xs items-center gap-2 rounded-lg px-3"
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
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--ink)" }}
          />
        </label>
        </div>
      </div>
    </header>
  );
}
