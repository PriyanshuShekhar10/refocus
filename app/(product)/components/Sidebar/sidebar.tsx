// app/(product)/components/Sidebar/sidebar.tsx
"use client";

import { FC, ReactNode, useEffect, useState } from "react";
import {
  CircleUserRound,
  Clock,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
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
      className="fixed top-0 left-0 z-40 flex h-screen w-16 flex-col items-center gap-3 border-r border-rf-line bg-rf-side-bg pb-4 pt-3 font-rf shadow-sm"
      aria-label="Main navigation"
    >
      {/* Primary work */}
      <nav className="flex flex-col gap-3" aria-label="Workspace">
        <SideBarIcon
          icon={<LayoutDashboard size={19} strokeWidth={1.8} />}
          text="Dashboard"
          onClick={() => onSelect("dashboard")}
          active={activeTab === "dashboard"}
        />
        <SideBarIcon
          icon={<Clock size={18} strokeWidth={1.8} />}
          text="Sessions"
          onClick={() => onSelect("sessions")}
          active={activeTab === "sessions"}
        />
        {showBacklogTab ? (
          <SideBarIcon
            icon={<ListTodo size={18} strokeWidth={1.8} />}
            text="Backlog"
            onClick={() => onSelect("backlog")}
            active={activeTab === "backlog"}
          />
        ) : null}
      </nav>

      <Divider />

      {/* People */}
      <nav className="flex flex-col gap-3" aria-label="People">
        <SideBarIcon
          icon={<CircleUserRound size={19} strokeWidth={1.8} />}
          text="Profile"
          onClick={() => onSelect("profile")}
          active={activeTab === "profile"}
        />
        <SideBarIcon
          icon={
            <div className="relative inline-flex">
              <Users size={18} strokeWidth={1.8} />
              {pendingSessionRequests > 0 ? (
                <span
                  className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-rf-side-btn"
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
          icon={<UserRound size={18} strokeWidth={1.8} />}
          text="Community"
          onClick={() => onSelect("community")}
          active={activeTab === "community"}
        />
      </nav>

      {showAdminTab ? (
        <>
          <Divider />
          <nav className="flex flex-col gap-3" aria-label="Admin">
            <SideBarIcon
              icon={<ShieldCheck size={18} strokeWidth={1.8} />}
              text="Admin"
              onClick={() => onSelect("admin")}
              active={activeTab === "admin"}
            />
          </nav>
        </>
      ) : null}

      {/* Utilities */}
      <div className="mt-auto flex flex-col items-center gap-3">
        <nav className="flex flex-col gap-3" aria-label="Tools">
          <SideBarIcon
            icon={
              <div className="relative">
                <MessageSquare size={18} strokeWidth={1.8} />
                {friendsUnread > 0 ? (
                  <span
                    className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-rf-side-btn"
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
            icon={<Settings size={18} strokeWidth={1.8} />}
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
    "group relative flex h-12 w-12 items-center justify-center border shadow-sm",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose focus-visible:ring-offset-2 focus-visible:ring-offset-rf-side-bg",
    active
      ? "rounded-xl border-rf-primary bg-rf-primary text-rf-on-primary"
      : "rounded-3xl border-rf-line bg-rf-side-btn text-rf-side-icon hover:rounded-xl hover:text-rf-ink",
  );

  const content = (
    <>
      {icon}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-[3.75rem] top-1/2 z-50 -translate-y-1/2",
          "whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md",
          "bg-rf-ink text-rf-bg",
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
  <hr className="h-px w-10 border-0 bg-rf-line" />
);

const ThemeToggle: FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="flex h-12 w-12 items-center justify-center rounded-3xl border border-rf-line bg-rf-side-btn text-rf-side-icon"
        aria-hidden
      >
        <Moon size={18} strokeWidth={1.8} />
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
        "group relative flex h-12 w-12 items-center justify-center rounded-3xl border border-rf-line shadow-sm",
        "bg-rf-side-btn text-rf-side-icon transition-all duration-200",
        "hover:rounded-xl hover:text-rf-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose focus-visible:ring-offset-2 focus-visible:ring-offset-rf-side-bg",
      )}
      aria-label={label}
    >
      {current === "dark" ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-[3.75rem] top-1/2 z-50 -translate-y-1/2",
          "whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md",
          "bg-rf-ink text-rf-bg",
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
