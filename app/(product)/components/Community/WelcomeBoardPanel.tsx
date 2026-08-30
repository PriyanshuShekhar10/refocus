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
    <div
      className="relative hidden min-h-0 h-full shrink-0 flex-col lg:flex"
      style={{ width: chatWidth }}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/80">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            Recently joined
          </p>
          <button
            type="button"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            onClick={() => onLayoutChange("feed")}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <WelcomeBoard
            onPreviewProfile={onPreviewProfile}
            compactHeader
          />
        </div>
      </div>
    </div>
  );
}
