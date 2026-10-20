"use client";

import Calendar, { type SidebarProfilePreview } from "./Calendar";
import { MobileCalendar } from "./Mobile";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";

export default function Dashboard({
  onPreviewProfile,
}: {
  onPreviewProfile?: (profile: SidebarProfilePreview) => void;
}) {
  const { isMobile } = useIsMobileShell();

  if (isMobile) {
    return (
      <div className="h-full min-h-0">
        <MobileCalendar />
      </div>
    );
  }

  return (
    <div className="h-full">
      <Calendar onPreviewProfile={onPreviewProfile} />
    </div>
  );
}
