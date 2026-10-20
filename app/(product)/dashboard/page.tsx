// app/(product)/dashboard/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SideBar, { type TabKey } from "../components/Sidebar/sidebar";
import Profile from "../components/profile";
import Settings from "../components/settings";
import Friends from "../components/Friends";
import Dashboard from "../components/dashboard";
import { OPEN_SESSION_EVENT, type SidebarProfilePreview } from "../components/Calendar";
import { showsRightSidebar, tabFromParam, urlForTab } from "@/lib/dashboardTabs";
import type { CalendarEvent } from "@/types/calendar";
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

type ProfilePreviewPayload = SidebarProfilePreview;

const TOUR_STORAGE_KEY = "refocus-dashboard-tour-v1";

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
      "See today’s sessions on Home. Join what’s available or book a new one in a few taps.",
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

/**
 * Desktop: every section sits inside the same rounded card as the calendar,
 * with the same padding, so switching sections only swaps what's in the box.
 * Mobile keeps its layout; `fill` only affects mobile (no outer padding).
 */
function SectionBox({
  isMobile,
  fill = false,
  children,
}: {
  isMobile: boolean;
  fill?: boolean;
  children: React.ReactNode;
}) {
  if (isMobile) {
    return (
      <div className={fill ? "h-full overflow-y-auto no-scrollbar" : "h-full overflow-y-auto px-3 pb-20 pt-4"}>
        {children}
      </div>
    );
  }
  return (
    <div className="h-full p-4">
      <div className="rf-embedded h-full min-h-0 overflow-hidden rounded-[14px] border border-rf-line bg-rf-card text-rf-ink">
        <div className="h-full overflow-y-auto px-[clamp(16px,3vw,40px)] pb-16 pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  // Start on the section in the URL so a refresh doesn't flash the calendar first.
  // Admin is confirmed later, once we know the user is an admin.
  const [activeTab, setActiveTab] = useState<TabKey>(
    () => tabFromParam(searchParams.get("tab"), { isAdmin: false }) ?? "dashboard",
  );
  const { isAdmin } = useAdminMe();
  const { count: pendingSessionRequests, refresh: refreshPendingRequests } =
    usePendingSessionRequestsCount();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { isMobile, mounted: mobileMounted } = useIsMobileShell();
  const tourSteps = isMobile ? TOUR_STEPS_MOBILE : TOUR_STEPS_DESKTOP;
  const [profilePreview, setProfilePreview] = useState<ProfilePreviewPayload | null>(
    null,
  );
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
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
    if (requestedTab === "admin" && !isAdmin) {
      setActiveTab("dashboard");
      return;
    }
    const tab = tabFromParam(requestedTab, { isAdmin });
    if (tab) setActiveTab(tab);
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

  // A profile preview belongs to the section it was opened from.
  useEffect(() => {
    setProfilePreview(null);
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

  // Every user-chosen section goes in the URL, so a refresh reopens it.
  const handleSelectTab = (tab: TabKey) => {
    setMoreMenuOpen(false);
    setActiveTab(tab);
    if (tab !== "backlog") router.replace(urlForTab(tab), { scroll: false });
  };

  // Sidebar "Next up" from any section: show the calendar and open that session.
  const openSessionOnCalendar = (event: CalendarEvent) => {
    handleSelectTab("dashboard");
    window.dispatchEvent(new CustomEvent(OPEN_SESSION_EVENT, { detail: event }));
  };

  const { wallpaperUrl } = useDashboardWallpaper();

  const showWallpaper = !!wallpaperUrl;
  const mainBgClass = showWallpaper
    ? "bg-dashboard-wallpaper"
    : "rf-dots";

  const calendarPadding = isMobile ? "h-full" : "h-full p-4";

  return (
    <UserTimezoneProvider>
    <div className="rf-app flex h-screen overflow-hidden bg-rf-bg text-[14px] leading-normal">
      <div className="hidden lg:block">
        <SideBar
          activeTab={activeTab}
          onSelect={handleSelectTab}
          showAdminTab={isAdmin}
        />
      </div>
      <div className="ml-0 flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-16">
        <EmailVerificationStrip />
        <div className="flex min-h-0 flex-1 overflow-hidden pb-16 lg:pb-0">
          <WallpaperProvider active={!!showWallpaper}>
          <main
            className={`min-h-0 flex-1 overflow-hidden ${mainBgClass}`}
            style={
              showWallpaper ? { backgroundImage: `url(${wallpaperUrl})` } : undefined
            }
          >
            <TabPanel tab="dashboard" activeTab={activeTab} className="h-full">
              <div className={calendarPadding}>
                <Dashboard onPreviewProfile={setProfilePreview} />
              </div>
            </TabPanel>
            <TabPanel tab="sessions" activeTab={activeTab} className="h-full">
              <SectionBox isMobile={isMobile}>
                <div className="mx-auto max-w-[980px]"><SessionHistory /></div>
              </SectionBox>
            </TabPanel>
            <TabPanel tab="profile" activeTab={activeTab} className="h-full">
              <SectionBox isMobile={isMobile}>
                <div className="mx-auto max-w-[980px]"><Profile /></div>
              </SectionBox>
            </TabPanel>
            <TabPanel tab="settings" activeTab={activeTab} className="h-full">
              <SectionBox isMobile={isMobile}>
                <div className="mx-auto max-w-[980px]"><Settings /></div>
              </SectionBox>
            </TabPanel>
            <TabPanel tab="friends" activeTab={activeTab} className="h-full">
              <SectionBox isMobile={isMobile} fill>
                <Friends onPreviewProfile={setProfilePreview} />
              </SectionBox>
            </TabPanel>
            <TabPanel tab="community" activeTab={activeTab} className="h-full">
              {isMobile ? (
                <Community onPreviewProfile={setProfilePreview} />
              ) : (
                <SectionBox isMobile={false} fill>
                  <Community onPreviewProfile={setProfilePreview} />
                </SectionBox>
              )}
            </TabPanel>
            <TabPanel tab="matches" activeTab={activeTab} className="h-full">
              <SectionBox isMobile={isMobile}>
                <Matchmaking />
              </SectionBox>
            </TabPanel>
            {isAdmin ? (
              <TabPanel tab="admin" activeTab={activeTab} className="h-full">
                <div className={isMobile ? "h-full overflow-y-auto pb-20" : "h-full"}>
                  {isMobile && (
                    <div className="border-b border-rf-line bg-rf-amber-bg px-4 py-2 text-sm text-rf-amber-ink">
                      Moderation tools work best on desktop, but all actions are available here.
                    </div>
                  )}
                  <AdminPanel />
                </div>
              </TabPanel>
            ) : null}
          </main>
          </WallpaperProvider>
          {showsRightSidebar(activeTab) && (
            <div className="hidden min-h-0 shrink-0 p-4 pl-0 lg:flex">
              <CalendarRightSidebar
                showUpNext
                profilePreview={profilePreview}
                onClearProfilePreview={() => setProfilePreview(null)}
                onOpenSession={openSessionOnCalendar}
              />
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
            className="w-full max-w-xl rounded-2xl border border-rf-line bg-rf-card p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11.5px] font-semibold tracking-[0.02em] text-rf-ink-mute">
                Step {tourStepIndex + 1} of {tourSteps.length}
              </p>
              <button
                type="button"
                onClick={closeTour}
                className="text-sm font-medium text-rf-ink-mute hover:text-rf-ink"
              >
                Skip tour
              </button>
            </div>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-rf-ink">
              {tourSteps[tourStepIndex].title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-rf-ink-soft">
              {tourSteps[tourStepIndex].description}
            </p>

            <div className="mt-4 flex items-center gap-2">
              {tourSteps.map((step) => (
                <span
                  key={step.title}
                  className={`h-1.5 rounded-full transition-all ${
                    tourSteps[tourStepIndex].title === step.title
                      ? "w-8 bg-rf-primary"
                      : "w-3 bg-rf-line"
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={tourStepIndex === 0}
                className="rounded-[10px] border border-rf-line px-4 py-2 text-sm font-medium text-rf-ink hover:bg-rf-line-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-[10px] bg-rf-primary px-4 py-2 text-sm font-semibold text-rf-on-primary hover:bg-rf-primary-hover"
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
