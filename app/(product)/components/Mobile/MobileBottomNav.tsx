"use client";

import { Home, Calendar, Star, Menu } from "lucide-react";

export type MobileTab = "home" | "calendar" | "favorites" | "menu";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const tabs: { id: MobileTab; icon: React.ReactNode; label: string }[] = [
    { id: "home", icon: <Home className="h-5 w-5" />, label: "Home" },
    { id: "calendar", icon: <Calendar className="h-5 w-5" />, label: "Calendar" },
    { id: "favorites", icon: <Star className="h-5 w-5" />, label: "Favorites" },
    { id: "menu", icon: <Menu className="h-5 w-5" />, label: "Menu" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="grid grid-cols-4 h-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
              activeTab === tab.id
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-100 dark:bg-indigo-900/30"
                  : ""
              }`}
            >
              {tab.icon}
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
}
