"use client";

import { ChevronRight } from "lucide-react";
import WelcomeBoard from "./WelcomeBoard";
import type { CommunityLayoutMode } from "@/hooks/useCommunityPanelLayout";

type ProfilePreviewPayload = {
  username: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  layout: CommunityLayoutMode;
  chatWidth: number;
  onLayoutChange: (mode: CommunityLayoutMode) => void;
  onPreviewProfile?: (profile: ProfilePreviewPayload) => void;
};

export default function WelcomeBoardPanel({
  layout,
  chatWidth,
  onLayoutChange,
  onPreviewProfile,
}: Props) {
  if (layout !== "split") return null;

  return (
    <aside
      className="sticky top-8 hidden min-w-[260px] flex-col lg:flex"
      style={{ flex: `0 1 ${Math.min(chatWidth, 300)}px` }}
    >
      <div className="flex h-[min(640px,calc(100vh-64px))] min-h-0 flex-col overflow-hidden rounded-[14px] border border-rf-line bg-rf-card">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rf-line px-3 py-2.5">
          <p className="text-xs font-semibold text-rf-ink-mute">
            Recently joined
          </p>
          <button
            type="button"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            onClick={() => onLayoutChange("feed")}
            className="grid h-[26px] w-[26px] place-items-center rounded-md text-rf-ink-mute transition-colors hover:bg-rf-line-soft"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <WelcomeBoard
            onPreviewProfile={onPreviewProfile}
            compactHeader
          />
        </div>
      </div>
    </aside>
  );
}
