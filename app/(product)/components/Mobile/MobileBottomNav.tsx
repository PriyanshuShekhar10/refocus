"use client";

import { Home, Clock, Heart, Hash, Settings } from "lucide-react";
import type { TabKey } from "../Sidebar/sidebar";

export type MobileNavTab = "home" | "sessions" | "friends" | "community" | "more";

export const MOBILE_MORE_TABS: TabKey[] = ["profile", "settings", "admin"];

export function getMobileNavTab(activeTab: TabKey): MobileNavTab {
  if (activeTab === "dashboard") return "home";
  if (activeTab === "sessions") return "sessions";
  if (activeTab === "friends") return "friends";
  if (activeTab === "community") return "community";
  return "more";
}

interface MobileBottomNavProps {
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
  onMoreOpen: () => void;
  pendingSessionRequests?: number;
}

export function MobileBottomNav({
  activeTab,
  onSelect,
  onMoreOpen,
  pendingSessionRequests = 0,
}: MobileBottomNavProps) {
  const navTab = getMobileNavTab(activeTab);
  const moreActive = navTab === "more";

  const tabs: {
    id: MobileNavTab;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    badge?: number;
  }[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      onClick: () => onSelect("dashboard"),
    },
    {
      id: "sessions",
      label: "Sessions",
      icon: <Clock className="h-5 w-5" />,
      onClick: () => onSelect("sessions"),
    },
    {
      id: "friends",
      label: "Friends",
      icon: <Heart className="h-5 w-5" />,
      onClick: () => onSelect("friends"),
      badge: pendingSessionRequests,
    },
    {
      id: "community",
      label: "Community",
      icon: <Hash className="h-5 w-5" />,
      onClick: () => onSelect("community"),
    },
    {
      id: "more",
      label: "More",
      icon: <Settings className="h-5 w-5" />,
      onClick: onMoreOpen,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-[68px] border-t-2 border-rf-chunk bg-rf-card px-1.5 pt-1.5 lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
      aria-label="Mobile navigation"
    >
      <div className="grid h-full grid-cols-5">
        {tabs.map((tab) => {
          const isActive = tab.id === "more" ? moreActive : navTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-11 flex-col items-center justify-center gap-0.5 ${
                isActive ? "text-rf-primary" : "text-rf-ink-mute"
              }`}
            >
              <div
                className={`relative flex rounded-xl border-2 px-3.5 py-1 transition-colors ${
                  isActive
                    ? "border-[#9DC1EE] bg-[#E3EEFB]"
                    : "border-transparent bg-transparent"
                }`}
              >
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span
                    className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-rf-card bg-rf-rose px-1 text-[9.5px] font-extrabold leading-none text-white"
                    aria-hidden
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10.5px] ${isActive ? "font-extrabold" : "font-semibold"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
