// app/(product)/dashboard/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import SideBar from "../components/Sidebar/sidebar";
import Profile from "../components/profile";
import Settings from "../components/settings";
import Friends from "../components/Friends";
import Dashboard from "../components/dashboard";
import Community from "../components/Community/Community";
import Matchmaking from "../components/Matchmaking";
import SmartScheduler from "../components/SmartScheduler";
import { CalendarRightSidebar } from "../components/Calendar/CalendarRightSidebar";

type TabKey = "profile" | "dashboard" | "settings" | "friends" | "community" | "matches" | "scheduler";
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
const TOUR_STEPS: TourStep[] = [
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

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [profilePreview, setProfilePreview] = useState<ProfilePreviewPayload | null>(
    null,
  );
  const [isPreviewSidebarCollapsed, setIsPreviewSidebarCollapsed] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
    setActiveTab(TOUR_STEPS[tourStepIndex].tab);
  }, [isTourOpen, tourStepIndex]);

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

  const closeTour = () => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "done");
    setIsTourOpen(false);
    setActiveTab("dashboard");
  };

  const goNext = () => {
    if (tourStepIndex === TOUR_STEPS.length - 1) {
      closeTour();
      return;
    }
    setTourStepIndex((prev) => prev + 1);
  };

  const goBack = () => {
    setTourStepIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar activeTab={activeTab} onSelect={setActiveTab} />
      <main className={`ml-16 flex-1 overflow-hidden ${activeTab === "dashboard" ? "bg-dotted-grid" : ""}`}>
        {activeTab === "dashboard" && (
          <div className="h-full p-6">
            <Dashboard />
          </div>
        )}
        {activeTab === "profile" && <div className="h-full overflow-y-auto p-6"><Profile /></div>}
        {activeTab === "settings" && <div className="h-full overflow-y-auto p-6"><Settings /></div>}
        {activeTab === "friends" && (
          <div className="h-full overflow-y-auto no-scrollbar">
            <Friends onPreviewProfile={setProfilePreview} />
          </div>
        )}
        {activeTab === "community" && (
          <Community onPreviewProfile={setProfilePreview} />
        )}
        {activeTab === "matches" && <div className="h-full overflow-y-auto p-6"><Matchmaking /></div>}
        {activeTab === "scheduler" && <div className="h-full overflow-hidden p-6"><SmartScheduler /></div>}
      </main>
      {(activeTab === "friends" || activeTab === "community") && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
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
                Step {tourStepIndex + 1} of {TOUR_STEPS.length}
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
              {TOUR_STEPS[tourStepIndex].title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {TOUR_STEPS[tourStepIndex].description}
            </p>

            <div className="mt-4 flex items-center gap-2">
              {TOUR_STEPS.map((step) => (
                <span
                  key={step.title}
                  className={`h-1.5 rounded-full transition-all ${
                    TOUR_STEPS[tourStepIndex].title === step.title
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
                {tourStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardContent />
        </Suspense>
    )
}
