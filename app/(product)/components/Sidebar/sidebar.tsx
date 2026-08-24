// app/(product)/components/Sidebar/sidebar.tsx
"use client";

import { FC, ReactNode, useEffect, useState } from "react";
import { BsGearFill } from "react-icons/bs";
import { MdDashboard } from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";
import { HiSun, HiMoon } from "react-icons/hi";
import { useTheme } from "next-themes";
import { CgProfile } from "react-icons/cg";
import { RiMessage3Line } from "react-icons/ri";
import { HiOutlineUserGroup } from "react-icons/hi";
import { LuListTodo } from "react-icons/lu";
import { HiOutlineClock, HiOutlineShieldCheck } from "react-icons/hi";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabKey =
  | "profile"
  | "dashboard"
  | "sessions"
  | "backlog"
  | "settings"
  | "friends"
  | "community"
  | "matches"
  | "admin";

interface SideBarProps {
  activeTab: TabKey;
  onSelect: (t: TabKey) => void;
  showBacklogTab?: boolean;
  showAdminTab?: boolean;
}

const SideBar: FC<SideBarProps> = ({
  activeTab,
  onSelect,
  showBacklogTab = false,
  showAdminTab = false,
}) => {
  const [friendsUnread, setFriendsUnread] = useState(0);
  const [pendingSessionRequests, setPendingSessionRequests] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ count: number }>;
      setFriendsUnread(Math.max(0, ce.detail?.count || 0));
    };
    window.addEventListener("chatdock:unread", handler as EventListener);
    return () =>
      window.removeEventListener("chatdock:unread", handler as EventListener);
  }, []);

  const fetchPendingSessionRequests = () => {
    fetch("/api/session-requests?type=incoming&status=pending")
      .then((res) => (res.ok ? res.json() : { requests: [] }))
      .then((data) => setPendingSessionRequests((data.requests || []).length))
      .catch(() => setPendingSessionRequests(0));
  };

  useEffect(() => {
    fetchPendingSessionRequests();
    const onFocus = () => fetchPendingSessionRequests();
    const onSessionRequestsUpdated = () => fetchPendingSessionRequests();
    window.addEventListener("focus", onFocus);
    window.addEventListener("friends:session-requests-updated", onSessionRequestsUpdated);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("friends:session-requests-updated", onSessionRequestsUpdated);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "friends") {
      fetchPendingSessionRequests();
    }
  }, [activeTab]);

  return (
    <aside
      className="fixed top-0 left-0 z-40 flex h-screen w-16 flex-col bg-white shadow-sm dark:bg-gray-900"
      aria-label="Main navigation"
    >
      {/* Primary work */}
      <nav className="flex flex-col pt-1" aria-label="Workspace">
        <SideBarIcon
          icon={<MdDashboard size={20} />}
          text="Dashboard"
          onClick={() => onSelect("dashboard")}
          active={activeTab === "dashboard"}
        />
        <SideBarIcon
          icon={<HiOutlineClock size={18} />}
          text="Sessions"
          onClick={() => onSelect("sessions")}
          active={activeTab === "sessions"}
        />
        {showBacklogTab ? (
          <SideBarIcon
            icon={<LuListTodo size={18} />}
            text="Backlog"
            onClick={() => onSelect("backlog")}
            active={activeTab === "backlog"}
          />
        ) : null}
      </nav>

      <Divider />

      {/* People */}
      <nav className="flex flex-col" aria-label="People">
        <SideBarIcon
          icon={<CgProfile size={20} />}
          text="Profile"
          onClick={() => onSelect("profile")}
          active={activeTab === "profile"}
        />
        <SideBarIcon
          icon={
            <div className="relative inline-flex">
              <FaUserFriends size={18} />
              {pendingSessionRequests > 0 ? (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          }
          text={
            pendingSessionRequests > 0
              ? `Friends (${pendingSessionRequests} session request${pendingSessionRequests !== 1 ? "s" : ""} pending)`
              : "Friends"
          }
          onClick={() => onSelect("friends")}
          active={activeTab === "friends"}
        />
        <SideBarIcon
          icon={<HiOutlineUserGroup size={18} />}
          text="Community"
          onClick={() => onSelect("community")}
          active={activeTab === "community"}
        />
      </nav>

      {showAdminTab ? (
        <>
          <Divider />
          <nav className="flex flex-col" aria-label="Admin">
            <SideBarIcon
              icon={<HiOutlineShieldCheck size={18} />}
              text="Admin"
              onClick={() => onSelect("admin")}
              active={activeTab === "admin"}
            />
          </nav>
        </>
      ) : null}

      {/* Utilities */}
      <div className="mb-3 mt-auto flex flex-col">
        <nav className="flex flex-col" aria-label="Tools">
          <SideBarIcon
            icon={
              <div className="relative">
                <RiMessage3Line size={18} />
                {friendsUnread > 0 ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-gray-900"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            }
            text={
              friendsUnread > 0
                ? `Messages (${friendsUnread} unread)`
                : "Messages"
            }
            onClick={() => {
              try {
                window.dispatchEvent(new Event("chatdock:toggle"));
              } catch {
                // ignore
              }
            }}
            active={false}
          />
          <SideBarIcon
            icon={<BsGearFill size={18} />}
            text="Settings"
            onClick={() => onSelect("settings")}
            active={activeTab === "settings"}
          />
        </nav>
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
  const className = cn(
    "group relative mx-auto my-1.5 flex h-11 w-11 items-center justify-center rounded-xl",
    "transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA5995]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
    active
      ? "bg-[#5D1C6A] text-white dark:bg-[#7A2D88]"
      : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
  );

  const content = (
    <>
      {icon}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-[3.75rem] top-1/2 z-50 -translate-y-1/2",
          "whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md",
          "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
          "opacity-0 transition-opacity duration-100",
          "group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        {text}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={text}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {content}
    </button>
  );
};

const Divider: FC = () => (
  <hr className="mx-auto my-1.5 h-px w-8 rounded-full border-0 bg-gray-200 dark:bg-gray-800" />
);

const ThemeToggle: FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="mx-auto my-1.5 flex h-11 w-11 items-center justify-center rounded-xl text-gray-400"
        aria-hidden
      >
        <HiSun size={18} />
      </div>
    );
  }

  const current = resolvedTheme || "light";
  const next = current === "dark" ? "light" : "dark";
  const label = current === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cn(
        "group relative mx-auto my-1.5 flex h-11 w-11 items-center justify-center rounded-xl",
        "bg-transparent text-gray-500 transition-colors duration-150",
        "hover:bg-gray-100 hover:text-gray-800",
        "dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA5995]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
      )}
      aria-label={label}
    >
      {current === "dark" ? <HiSun size={18} /> : <HiMoon size={18} />}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-[3.75rem] top-1/2 z-50 -translate-y-1/2",
          "whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md",
          "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
          "opacity-0 transition-opacity duration-100",
          "group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      >
        {current === "dark" ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
};

export default SideBar;
