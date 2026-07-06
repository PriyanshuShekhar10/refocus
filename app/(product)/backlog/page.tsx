"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SideBar, { type TabKey } from "../components/Sidebar/sidebar";
import BacklogBoard from "../components/BacklogBoard";

export default function BacklogPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

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
    if (tab === "backlog") return;
    router.push(`/dashboard?tab=${tab}`);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar
        activeTab="backlog"
        onSelect={handleSelectTab}
        showBacklogTab
        showAdminTab={isAdmin}
      />
      <main className="ml-16 flex-1 bg-gray-50 dark:bg-gray-950">
        <BacklogBoard />
      </main>
    </div>
  );
}
