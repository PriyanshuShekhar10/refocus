"use client";

import { Home, Users, MessageCircle, MoreHorizontal } from "lucide-react";
import type { TabKey } from "../Sidebar/sidebar";

export type MobileNavTab = "home" | "friends" | "community" | "more";

export const MOBILE_MORE_TABS: TabKey[] = [
  "profile",
  "sessions",
  "settings",
  "admin",
];

export function getMobileNavTab(activeTab: TabKey): MobileNavTab {
  if (activeTab === "dashboard") return "home";
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
      id: "friends",
      label: "Friends",
      icon: <Users className="h-5 w-5" />,
      onClick: () => onSelect("friends"),
      badge: pendingSessionRequests,
    },
    {
      id: "community",
      label: "Community",
      icon: <MessageCircle className="h-5 w-5" />,
      onClick: () => onSelect("community"),
    },
    {
      id: "more",
      label: "More",
      icon: <MoreHorizontal className="h-5 w-5" />,
      onClick: onMoreOpen,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-gray-200 bg-white dark:border-[#354055] dark:bg-[#0E1624] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile navigation"
    >
      <div className="grid h-16 grid-cols-4">
        {tabs.map((tab) => {
          const isActive = tab.id === "more" ? moreActive : navTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive
                  ? "text-[#8A328F] dark:text-[#8A328F]"
                  : "text-gray-500 dark:text-[#AAA6B1]"
              }`}
            >
              <div
                className={`relative rounded-xl p-1.5 transition-colors ${
                  isActive ? "bg-[#21182B]/80 dark:bg-[#21182B]" : ""
                }`}
              >
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0E1624]"
                    aria-hidden
                  />
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
