"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SideBar, { type TabKey } from "../components/Sidebar/sidebar";
import BacklogBoard from "../components/BacklogBoard";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { useDashboardWallpaper } from "@/hooks/useDashboardWallpaper";
import { WallpaperProvider } from "@/components/wallpaper-context";
import { MobileBottomNav, MobileMoreMenu } from "../components/Mobile";

export default function BacklogPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { isMobile, mounted } = useIsMobileShell();
  const { wallpaperUrl } = useDashboardWallpaper();
  const showWallpaper = !!wallpaperUrl;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json();
        if (!cancelled && res.ok) setIsAdmin(Boolean(data.isAdmin));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectTab = (tab: TabKey) => {
    setMoreMenuOpen(false);
    if (tab === "backlog") return;
    router.push(`/dashboard?tab=${tab}`);
  };

  if (mounted && isMobile) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-20 text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Backlog works best on desktop
          </h1>
          <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
            The kanban backlog is designed for larger screens. Open Refocus on
            desktop to manage issues, or use Home to book sessions from your
            phone.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-lg bg-[#5D1C6A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#CA5995]"
          >
            Go to Home
          </button>
        </main>
        <MobileBottomNav
          activeTab="dashboard"
          onSelect={handleSelectTab}
          onMoreOpen={() => setMoreMenuOpen(true)}
        />
        <MobileMoreMenu
          open={moreMenuOpen}
          onClose={() => setMoreMenuOpen(false)}
          activeTab="backlog"
          onSelect={handleSelectTab}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar
        activeTab="backlog"
        onSelect={handleSelectTab}
        showBacklogTab
        showAdminTab={isAdmin}
      />
      <main
        className={`ml-16 flex-1 ${
          showWallpaper ? "bg-dashboard-wallpaper" : "bg-gray-50 dark:bg-gray-950"
        }`}
        style={
          showWallpaper ? { backgroundImage: `url(${wallpaperUrl})` } : undefined
        }
      >
        <WallpaperProvider active={showWallpaper}>
          <BacklogBoard />
        </WallpaperProvider>
      </main>
    </div>
  );
}
