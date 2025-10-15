// app/(product)/components/Sidebar/sidebar.tsx
"use client";

import React, { FC, ReactNode, useEffect, useState } from "react";
import { BsGearFill } from "react-icons/bs";
import { MdDashboard } from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";
import { HiSun, HiMoon } from "react-icons/hi";
import { useTheme } from "next-themes";
import { CgProfile } from "react-icons/cg";
import { RiChat3Line, RiMessage3Line } from "react-icons/ri";
import Link from "next/link";

export type TabKey = "profile" | "dashboard" | "settings" | "friends" | "chat";

interface SideBarProps {
  activeTab: TabKey;
  onSelect: (t: TabKey) => void;
}

const SideBar: FC<SideBarProps> = ({ activeTab, onSelect }) => {
  const [friendsUnread, setFriendsUnread] = useState(0);
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ count: number }>;
      setFriendsUnread(Math.max(0, ce.detail?.count || 0));
    };
    window.addEventListener("chatdock:unread", handler as EventListener);
    return () => window.removeEventListener("chatdock:unread", handler as EventListener);
  }, []);

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-16 flex flex-col
                 bg-white dark:bg-gray-900 shadow-sm z-40"
      aria-label="Sidebar">
      <SideBarIcon
        icon={<MdDashboard size={20} />}
        text="Dashboard"
        onClick={() => onSelect("dashboard")}
        active={activeTab === "dashboard"}
      />

      <Divider />

      <SideBarIcon
        icon={<CgProfile size={20} />}
        text="Profile"
        onClick={() => onSelect("profile")}
        active={activeTab === "profile"}
      />

      {/* <SideBarIcon
        icon={<BsFillLightningFill size={18} />}
        text="Friends"
        onClick={() => onSelect("friends")}
        active={activeTab === "friends"}
      /> */}

      <SideBarIcon
        icon={<FaUserFriends size={18} />}
        text="Friends"
        onClick={() => onSelect("friends")}
        active={activeTab === "friends"}
      />

      {/* Global Chat (full page/tab) */}
      <SideBarIcon
        icon={<RiChat3Line size={18} />}
        text="Global Chat"
        onClick={() => onSelect("chat")}
        active={activeTab === "chat"}
      />

      <Divider />

      <SideBarIcon
        icon={<BsGearFill size={18} />}
        text="Settings"
        onClick={() => onSelect("settings")}
        active={activeTab === "settings"}
      />

      {/* push the chat dock + theme toggle to the bottom */}
      <div className="mt-auto mb-4">
        {/* Friends Chat (dock) - anchored near bottom */}
        <SideBarIcon
          icon={
            <div className="relative">
              <RiMessage3Line size={18} />
              {friendsUnread > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-gray-900"></span>
              ) : null}
            </div>
          }
          text="Friends Chat"
          onClick={() => {
            try {
              window.dispatchEvent(new Event("chatdock:toggle"));
            } catch {}
          }}
          active={false}
        />
        <Divider />
        <ThemeToggle />
      </div>
    </aside>
  );
};

interface SideBarIconProps {
  icon: ReactNode;
  text?: string;
  onClick?: () => void;
  active?: boolean;
  href?: string;
}

const SideBarIcon: FC<SideBarIconProps> = ({
  icon,
  text = "tooltip",
  onClick,
  active = false,
  href,
}) => {
  const base =
    "group relative flex items-center justify-center h-12 w-12 mt-3 mb-3 mx-auto rounded-3xl transition-all duration-200 ease-linear cursor-pointer shadow-sm";
  const activeClasses = active
    ? "bg-green-600 text-white rounded-xl"
    : "bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-green-400 hover:bg-green-600 hover:text-white hover:rounded-xl";

  const content = (
    <>
      {icon}
      <span
        className="absolute left-16 top-1/2 -translate-y-1/2
                   whitespace-nowrap px-2 py-1 rounded-md shadow-md
                   text-xs font-semibold
                   bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900
                   transform -translate-x-1 opacity-0
                   group-hover:translate-x-0 group-hover:opacity-100
                   transition-all duration-150 ease-out">
        {text}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={text}
        title={text}
        className={`${base} ${activeClasses}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      title={text}
      className={`${base} ${activeClasses}`}>
      {content}
    </button>
  );
};

const Divider: FC = () => (
  <hr className="w-10 mx-auto my-1 bg-gray-200 dark:bg-gray-800 h-[1px] rounded-full" />
);

/* ThemeToggle component using next-themes */
const ThemeToggle: FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="group relative flex items-center justify-center
                   h-12 w-12 mt-2 mx-auto
                   bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700
                   rounded-3xl shadow-sm"
        aria-hidden>
        <HiSun size={18} />
      </div>
    );
  }

  const current = resolvedTheme || "light";
  const next = current === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => setTheme(next)}
      className="group relative flex items-center justify-center
                 h-12 w-12 mt-2 mx-auto
                 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700
                 text-gray-600 dark:text-green-300
                 hover:bg-green-600 hover:text-white
                 rounded-3xl hover:rounded-xl
                 transition-all duration-200 ease-linear
                 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-300"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}>
      {current === "dark" ? <HiSun size={18} /> : <HiMoon size={18} />}

      <span
        className="absolute left-16 top-1/2 -translate-y-1/2
                   whitespace-nowrap px-2 py-1 rounded-md shadow-md
                   text-xs font-semibold
                   bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900
                   transform -translate-x-1 opacity-0
                   group-hover:translate-x-0 group-hover:opacity-100
                   transition-all duration-150 ease-out">
        {current === "dark" ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
};

export default SideBar;
