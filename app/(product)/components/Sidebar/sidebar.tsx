// app/(product)/components/Sidebar/sidebar.tsx
"use client";

import { FC, ReactNode, useEffect, useState } from "react";
import {
  Clock,
  Hash,
  Heart,
  Home,
  ListTodo,
  MessageCircle,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flame } from "lucide-react";
import { useSessionStats } from "@/hooks/useSessionStats";

export type { DashboardTab as TabKey } from "@/lib/dashboardTabs";
import type { DashboardTab as TabKey } from "@/lib/dashboardTabs";

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
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string; image?: string } | undefined;
  const displayName = user?.name || user?.email?.split("@")[0] || "Profile";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const [friendsUnread, setFriendsUnread] = useState(0);
  const [pendingSessionRequests, setPendingSessionRequests] = useState(0);
  const { stats } = useSessionStats();
  const streak = stats?.currentStreak ?? 0;

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
      className="fixed top-0 left-0 z-40 flex h-screen w-[72px] flex-col items-center gap-3.5 bg-rf-side-bg py-4 font-rf"
      aria-label="Main navigation"
    >
      {/* Primary work */}
      <nav className="flex flex-col gap-3.5" aria-label="Workspace">
        <SideBarIcon
          icon={<Home size={20} strokeWidth={1.9} />}
          text="Dashboard"
          onClick={() => onSelect("dashboard")}
          active={activeTab === "dashboard"}
        />
        <SideBarIcon
          icon={<Clock size={20} strokeWidth={1.9} />}
          text="Sessions"
          onClick={() => onSelect("sessions")}
          active={activeTab === "sessions"}
        />
        {showBacklogTab ? (
          <SideBarIcon
            icon={<ListTodo size={20} strokeWidth={1.9} />}
            text="Backlog"
            onClick={() => onSelect("backlog")}
            active={activeTab === "backlog"}
          />
        ) : null}
      </nav>

      <Divider />

      {/* People */}
      <nav className="flex flex-col gap-3.5" aria-label="People">
        <SideBarIcon
          icon={
            <div className="relative inline-flex">
              <Heart size={20} strokeWidth={1.9} />
              {pendingSessionRequests > 0 ? (
                <span
                  className="absolute -right-[18px] -top-[18px] min-w-[18px] rounded-full border-2 border-rf-side-bg bg-rf-pink px-1 text-center text-[10px] font-extrabold leading-[14px] text-white"
                  aria-hidden="true"
                >
                  {pendingSessionRequests}
                </span>
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
          icon={<Hash size={20} strokeWidth={1.9} />}
          text="Community"
          onClick={() => onSelect("community")}
          active={activeTab === "community"}
        />
      </nav>

      {showAdminTab ? (
        <>
          <Divider />
          <nav className="flex flex-col gap-3.5" aria-label="Admin">
            <SideBarIcon
              icon={<ShieldCheck size={20} strokeWidth={1.9} />}
              text="Admin"
              onClick={() => onSelect("admin")}
              active={activeTab === "admin"}
            />
          </nav>
        </>
      ) : null}

      {/* Utilities */}
      <div className="mt-auto flex flex-col items-center gap-3.5">
        <nav className="flex flex-col gap-3.5" aria-label="Tools">
          <SideBarIcon
            icon={
              <div className="relative">
                <MessageCircle size={20} strokeWidth={1.9} />
                {friendsUnread > 0 ? (
                  <span
                    className="absolute -right-[18px] -top-[18px] h-3 w-3 rounded-full border-2 border-rf-side-bg bg-red-500"
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
            icon={<Settings2 size={20} strokeWidth={1.9} />}
            text="Settings"
            onClick={() => onSelect("settings")}
            active={activeTab === "settings"}
          />
          <button
            type="button"
            onClick={() => onSelect("profile")}
            aria-label={streak > 0 ? `Profile (${streak}-day focus streak)` : "Profile"}
            aria-current={activeTab === "profile" ? "page" : undefined}
            className={cn(
              "group relative mb-2 flex h-12 w-12 items-center justify-center rounded-full border-[3px] p-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rf-side-bg",
              activeTab === "profile" ? "border-[#FFC940]" : "border-white",
            )}
          >
            <Avatar className="h-full w-full">
              {user?.image ? <AvatarImage src={user.image} alt={displayName} /> : null}
              <AvatarFallback className="bg-[#FBE6F0] text-[13px] font-extrabold text-[#B8457F]">
                {initials}
              </AvatarFallback>
            </Avatar>
            {streak > 0 ? (
              <span
                className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-px rounded-full border-2 border-rf-side-bg bg-rf-streak px-[5px] text-[10px] font-extrabold leading-[14px] text-white"
                aria-hidden="true"
              >
                <Flame className="h-[9px] w-[9px]" fill="currentColor" strokeWidth={0} />
                {streak}
              </span>
            ) : null}
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute left-[4.25rem] top-1/2 z-50 -translate-y-1/2",
                "whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md",
                "bg-[#0A0A0A] text-white",
                "opacity-0 transition-opacity duration-100",
                "group-hover:opacity-100 group-focus-visible:opacity-100",
              )}
            >
              Profile
            </span>
          </button>
        </nav>
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
    "group relative flex h-12 w-12 items-center justify-center rounded-2xl border-0",
    "transition-[transform,box-shadow,background-color] duration-100 ease-out active:translate-y-[3px] active:shadow-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rf-side-bg",
    active
      ? "bg-rf-side-active text-rf-side-active-ink shadow-[0_4px_0_var(--rf-side-active-shadow)]"
      : "bg-rf-side-btn text-rf-side-icon shadow-[0_4px_0_var(--rf-side-shadow)] hover:bg-white/20",
  );

  const content = (
    <>
      {icon}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-[4.25rem] top-1/2 z-50 -translate-y-1/2",
          "whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md",
          "bg-[#0A0A0A] text-white",
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
  <hr className="my-0.5 h-0.5 w-9 rounded-sm border-0 bg-rf-side-line" />
);

export default SideBar;
