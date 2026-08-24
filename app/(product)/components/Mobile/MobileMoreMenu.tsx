"use client";

import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { CgProfile } from "react-icons/cg";
import {
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiSun,
  HiMoon,
} from "react-icons/hi";
import { BsGearFill } from "react-icons/bs";
import { FiLogOut, FiShare2 } from "react-icons/fi";
import type { TabKey } from "../Sidebar/sidebar";
import { MOBILE_MORE_TABS } from "./MobileBottomNav";

interface MobileMoreMenuProps {
  open: boolean;
  onClose: () => void;
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
  isAdmin?: boolean;
}

type MenuItem = {
  tab: TabKey;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  {
    tab: "profile",
    label: "Profile",
    icon: <CgProfile size={20} />,
  },
  {
    tab: "sessions",
    label: "Sessions",
    icon: <HiOutlineClock size={20} />,
  },
  {
    tab: "settings",
    label: "Settings",
    icon: <BsGearFill size={18} />,
  },
  {
    tab: "admin",
    label: "Admin",
    icon: <HiOutlineShieldCheck size={20} />,
    adminOnly: true,
  },
];

function shareRefocus() {
  if (typeof navigator !== "undefined" && navigator.share) {
    void navigator.share({
      title: "Refocus",
      text: "Check out Refocus - Virtual coworking made easy!",
      url: window.location.origin,
    });
  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(window.location.origin);
  }
}

export function MobileMoreMenu({
  open,
  onClose,
  activeTab,
  onSelect,
  isAdmin = false,
}: MobileMoreMenuProps) {
  const { resolvedTheme, setTheme } = useTheme();

  if (!open) return null;

  const visibleItems = MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const nextTheme = (resolvedTheme || "light") === "dark" ? "light" : "dark";
  const isDark = (resolvedTheme || "light") === "dark";

  const handleSelect = (tab: TabKey) => {
    onSelect(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        role="dialog"
        aria-modal="true"
        aria-label="More options"
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="px-4 pb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            More
          </h2>
        </div>
        <ul className="px-2 pb-2">
          {visibleItems.map((item) => {
            const isActive =
              activeTab === item.tab ||
              (MOBILE_MORE_TABS.includes(activeTab) && activeTab === item.tab);
            return (
              <li key={item.tab}>
                <button
                  type="button"
                  onClick={() => handleSelect(item.tab)}
                  className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-[#FFF1D3] text-[#5D1C6A] dark:bg-[#5D1C6A]/30 dark:text-[#CA5995]"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setTheme(nextTheme)}
              className="flex w-full min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              aria-label={`Appearance, currently ${isDark ? "Dark" : "Light"}. Toggle theme.`}
            >
              {isDark ? <HiSun size={20} /> : <HiMoon size={20} />}
              <span className="flex-1 font-medium">Appearance</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isDark ? "Dark" : "Light"}
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                shareRefocus();
                onClose();
              }}
              className="flex w-full min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <FiShare2 size={18} />
              <span className="font-medium">Share Refocus</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <FiLogOut size={18} />
              <span className="font-medium">Sign out</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
