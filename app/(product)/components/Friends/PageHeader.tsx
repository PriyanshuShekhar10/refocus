"use client";

import { ChangeEvent } from "react";
import { Search } from "lucide-react";
import { designStyles } from "@/components/design";

interface PageHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export default function PageHeader({ query, onQueryChange }: PageHeaderProps) {
  return (
    <header className="mb-6">
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
        <label
          className="flex h-10 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-background px-3"
          role="search"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search friends"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onQueryChange(e.target.value)
            }
            aria-label="Search friends"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
    </header>
  );
}
