// app/(product)/dashboard/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SideBar, { type TabKey } from "../components/Sidebar/sidebar";
import Profile from "../components/profile";
import Settings from "../components/settings";
import Friends from "../components/Friends";
import Dashboard from "../components/dashboard";
import Community from "../components/Community/Community";
import Matchmaking from "../components/Matchmaking";
import AdminPanel from "../components/Admin/AdminPanel";
import SessionHistory from "../components/SessionHistory";
import { CalendarRightSidebar } from "../components/Calendar/CalendarRightSidebar";
import { EmailVerificationStrip } from "@/components/email-verification-strip";
import { UserTimezoneProvider } from "@/components/user-timezone-provider";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { useDashboardWallpaper } from "@/hooks/useDashboardWallpaper";
import { useAdminMe } from "@/hooks/useAdminMe";
import { usePendingSessionRequestsCount } from "@/hooks/useFriendsData";
import { MobileBottomNav, MobileMoreMenu } from "../components/Mobile";
import { WallpaperProvider } from "@/components/wallpaper-context";

type TourStep = {
  title: string;
  description: string;
  tab: TabKey;
};

type ProfilePreviewPayload = {
  username: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
};

const TOUR_STORAGE_KEY = "refocus-dashboard-tour-v1";
const DASHBOARD_TABS: TabKey[] = [
  "profile",
  "dashboard",
  "sessions",
  "settings",
  "friends",
  "community",
  "matches",
];

const TOUR_STEPS_DESKTOP: TourStep[] = [
  {
    title: "Profile",
    description:
      "Start here to add your focus style, working hours, and details that help others pair better with you.",
    tab: "profile",
  },
  {
    title: "Dashboard",
    description:
      "This is your core workspace with your calendar and upcoming sessions. Book, join, and manage your focus blocks here.",
    tab: "dashboard",
  },
  {
    title: "Friends",
    description:
      "Send session requests, accept invites, and track accountability partners in one place.",
    tab: "friends",
  },
  {
    title: "Community",
    description:
      "Share wins, ask for help, and find people with similar goals to build momentum together.",
    tab: "community",
  },
  {
    title: "Settings",
    description:
      "Control account preferences, notifications, and app behavior to make Refocus work your way.",
    tab: "settings",
  },
];

const TOUR_STEPS_MOBILE: TourStep[] = [
  {
    title: "Profile",
    description:
      "Open More at the bottom, then Profile to add your focus style and working hours.",
    tab: "profile",
  },
  {
    title: "Home",
    description:
      "Your calendar lives on Home. Book, join, and manage focus sessions from here.",
    tab: "dashboard",
  },
  {
    title: "Friends",
    description:
      "Tap Friends in the bottom bar to send session requests and chat with partners.",
    tab: "friends",
  },
  {
    title: "Community",
    description:
      "Share wins and connect with others from the Community tab.",
    tab: "community",
  },
  {
    title: "Settings",
    description:
      "Open More for Settings, Sessions history, theme, and account preferences.",
    tab: "settings",
  },
];

function TabPanel({
  tab,
  activeTab,
  className,
  children,
}: {
  tab: TabKey;
  activeTab: TabKey;
  className?: string;
  children: React.ReactNode;
}) {
  const isActive = activeTab === tab;
  return (
    <div
      className={`${className ?? ""}${isActive ? "" : " hidden"}`}
      aria-hidden={!isActive}
    >
      {children}
    </div>
  );
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const { isAdmin } = useAdminMe();
  const { count: pendingSessionRequests, refresh: refreshPendingRequests } =
    usePendingSessionRequestsCount();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { isMobile, mounted: mobileMounted } = useIsMobileShell();
  const tourSteps = isMobile ? TOUR_STEPS_MOBILE : TOUR_STEPS_DESKTOP;
  const [profilePreview, setProfilePreview] = useState<ProfilePreviewPayload | null>(
    null,
  );
  const [isPreviewSidebarCollapsed, setIsPreviewSidebarCollapsed] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onUpdated = () => {
      void refreshPendingRequests();
    };
    window.addEventListener("friends:session-requests-updated", onUpdated);
    return () => {
      window.removeEventListener("friends:session-requests-updated", onUpdated);
    };
  }, [refreshPendingRequests]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (!requestedTab) return;
    if (requestedTab === "admin") {
      if (isAdmin) setActiveTab("admin");
      else setActiveTab("dashboard");
      return;
    }
    if (DASHBOARD_TABS.includes(requestedTab as TabKey)) {
      setActiveTab(requestedTab as TabKey);
    }
  }, [searchParams, isAdmin]);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setActiveTab("profile");
    }
  }, [searchParams]);

  useEffect(() => {
    const isNewProfile = searchParams.get("new") === "true";
    if (!isNewProfile) return;

    setIsTourOpen(true);
    setTourStepIndex(0);
  }, [searchParams]);

  useEffect(() => {
    if (!isTourOpen) return;
    setActiveTab(tourSteps[tourStepIndex].tab);
  }, [isTourOpen, tourStepIndex, tourSteps]);

  useEffect(() => {
    if (searchParams.get("new") !== "true") return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("new");
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [searchParams, pathname]);

  useEffect(() => {
    if (activeTab === "friends" || activeTab === "community") return;
    setProfilePreview(null);
    setIsPreviewSidebarCollapsed(false);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "backlog") return;
    router.push("/backlog");
  }, [activeTab, router]);

  const closeTour = () => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "done");
    setIsTourOpen(false);
    setActiveTab("dashboard");
  };

  const goNext = () => {
    if (tourStepIndex === tourSteps.length - 1) {
      closeTour();
      return;
    }
    setTourStepIndex((prev) => prev + 1);
  };

  const goBack = () => {
    setTourStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSelectTab = (tab: TabKey) => {
    setMoreMenuOpen(false);
    setActiveTab(tab);
  };

  const { wallpaperUrl } = useDashboardWallpaper();

  const showWallpaper = !!wallpaperUrl;
  const mainBgClass = showWallpaper
    ? "bg-dashboard-wallpaper"
    : activeTab === "dashboard"
      ? "bg-dotted-grid"
      : "";

  const mainPadding =
    activeTab === "dashboard"
      ? isMobile
        ? "h-full"
        : "h-full p-6"
      : activeTab === "friends" || activeTab === "community"
        ? "h-full overflow-y-auto no-scrollbar"
        : isMobile
          ? "h-full overflow-y-auto p-4 pb-20"
          : "h-full overflow-y-auto p-6";

  return (
    <UserTimezoneProvider>
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <SideBar
          activeTab={activeTab}
          onSelect={handleSelectTab}
          showAdminTab={isAdmin}
        />
      </div>
      <div className="ml-0 flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-16">
        <EmailVerificationStrip />
        {mobileMounted && isMobile && (
          <p className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-3 py-1.5 text-center text-[11px] leading-snug text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Refocus works best on desktop — mobile is great for quick sessions and
            chat.
          </p>
        )}
        <div className="flex min-h-0 flex-1 overflow-hidden pb-16 lg:pb-0">
          <WallpaperProvider active={!!showWallpaper}>
          <main
            className={`min-h-0 flex-1 overflow-hidden ${mainBgClass}`}
            style={
              showWallpaper ? { backgroundImage: `url(${wallpaperUrl})` } : undefined
            }
          >
            <TabPanel tab="dashboard" activeTab={activeTab} className="h-full">
              <div className={mainPadding}>
                <Dashboard />
              </div>
            </TabPanel>
            <TabPanel tab="sessions" activeTab={activeTab} className="h-full">
              <div className={mainPadding}>
                <SessionHistory compact={isMobile} />
              </div>
            </TabPanel>
            <TabPanel tab="profile" activeTab={activeTab} className="h-full">
              <div className={mainPadding}>
                <Profile />
              </div>
            </TabPanel>
            <TabPanel tab="settings" activeTab={activeTab} className="h-full">
              <div className={mainPadding}>
                <Settings />
              </div>
            </TabPanel>
            <TabPanel tab="friends" activeTab={activeTab} className="h-full">
              <div className={mainPadding}>
                <Friends onPreviewProfile={setProfilePreview} />
              </div>
            </TabPanel>
            <TabPanel tab="community" activeTab={activeTab} className="h-full">
              <Community onPreviewProfile={setProfilePreview} />
            </TabPanel>
            <TabPanel tab="matches" activeTab={activeTab} className="h-full">
              <div className={mainPadding}>
                <Matchmaking />
              </div>
            </TabPanel>
            {isAdmin ? (
              <TabPanel tab="admin" activeTab={activeTab} className="h-full">
                <div className={isMobile ? "h-full overflow-y-auto pb-20" : "h-full"}>
                  {isMobile && (
                    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                      Moderation tools work best on desktop, but all actions are available here.
                    </div>
                  )}
                  <AdminPanel />
                </div>
              </TabPanel>
            ) : null}
          </main>
          </WallpaperProvider>
          {(activeTab === "friends" || activeTab === "community") && (
            <div
              className={`hidden overflow-hidden transition-all duration-300 ease-out lg:block ${
                profilePreview
                  ? isPreviewSidebarCollapsed
                    ? "w-[4.5rem] translate-x-0 opacity-100 p-4 pl-0"
                    : "w-[16.5rem] translate-x-0 opacity-100 p-4 pl-0"
                  : "w-0 translate-x-2 opacity-0 p-0 pointer-events-none"
              }`}
            >
              {profilePreview && (
                <CalendarRightSidebar
                  sessionCount={0}
                  onGoToday={() => setActiveTab("dashboard")}
                  joinableSession={null}
                  profilePreview={profilePreview}
                  onClearProfilePreview={() => setProfilePreview(null)}
                  onCollapseChange={setIsPreviewSidebarCollapsed}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {mobileMounted && isMobile && (
        <>
          <MobileBottomNav
            activeTab={activeTab}
            onSelect={handleSelectTab}
            onMoreOpen={() => setMoreMenuOpen(true)}
            pendingSessionRequests={pendingSessionRequests}
          />
          <MobileMoreMenu
            open={moreMenuOpen}
            onClose={() => setMoreMenuOpen(false)}
            activeTab={activeTab}
            onSelect={handleSelectTab}
            isAdmin={isAdmin}
          />
        </>
      )}

      {isTourOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard onboarding tour"
            className="w-full max-w-xl rounded-2xl border border-white/20 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                Step {tourStepIndex + 1} of {tourSteps.length}
              </p>
              <button
                type="button"
                onClick={closeTour}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Skip tour
              </button>
            </div>

            <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {tourSteps[tourStepIndex].title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {tourSteps[tourStepIndex].description}
            </p>

            <div className="mt-4 flex items-center gap-2">
              {tourSteps.map((step) => (
                <span
                  key={step.title}
                  className={`h-1.5 rounded-full transition-all ${
                    tourSteps[tourStepIndex].title === step.title
                      ? "w-8 bg-[#CA5995]"
                      : "w-3 bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={tourStepIndex === 0}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-[#5D1C6A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#CA5995]"
              >
                {tourStepIndex === tourSteps.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </UserTimezoneProvider>
  );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardContent />
        </Suspense>
    )
}
