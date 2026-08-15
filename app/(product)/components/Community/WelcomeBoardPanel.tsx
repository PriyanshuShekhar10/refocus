"use client";

import type { ReactNode } from "react";
import { Columns2, PanelLeft, PanelRight } from "lucide-react";
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
  onResizeStart: (event: React.MouseEvent) => void;
  onPreviewProfile?: (profile: ProfilePreviewPayload) => void;
};

function LayoutButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? "bg-[#5D1C6A] text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function WelcomeBoardPanel({
  layout,
  chatWidth,
  onLayoutChange,
  onResizeStart,
  onPreviewProfile,
}: Props) {
  return (
    <div
      className={`relative hidden min-h-0 shrink-0 flex-col lg:flex ${
        layout === "chat" ? "h-full flex-1" : "h-full"
      }`}
      style={layout === "split" ? { width: chatWidth } : undefined}
    >
      {layout === "split" ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize welcome panel"
          onMouseDown={onResizeStart}
          className="absolute -left-2 top-4 bottom-4 z-10 w-4 cursor-col-resize"
        >
          <div className="mx-auto h-full w-1 rounded-full bg-border/80 transition-colors hover:bg-[#CA5995]/70" />
        </div>
      ) : null}

      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex shrink-0 items-center justify-end gap-0.5 border-b border-border px-2 py-1.5">
          <LayoutButton
            active={layout === "feed"}
            title="Focus on community feed"
            onClick={() => onLayoutChange("feed")}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </LayoutButton>
          <LayoutButton
            active={layout === "split"}
            title="Split feed and welcome board"
            onClick={() => onLayoutChange("split")}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </LayoutButton>
          <LayoutButton
            active={layout === "chat"}
            title="Focus on welcome board"
            onClick={() => onLayoutChange("chat")}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </LayoutButton>
        </div>

        <div className="min-h-0 flex-1">
          <WelcomeBoard onPreviewProfile={onPreviewProfile} />
        </div>
      </div>
    </div>
  );
}
