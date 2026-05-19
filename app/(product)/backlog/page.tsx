"use client";

import { useRouter } from "next/navigation";
import SideBar, { type TabKey } from "../components/Sidebar/sidebar";
import BacklogBoard from "../components/BacklogBoard";

export default function BacklogPage() {
  const router = useRouter();

  const handleSelectTab = (tab: TabKey) => {
    if (tab === "backlog") return;
    router.push(`/dashboard?tab=${tab}`);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar activeTab="backlog" onSelect={handleSelectTab} showBacklogTab />
      <main className="ml-16 flex-1 bg-gray-50 dark:bg-gray-950">
        <BacklogBoard />
      </main>
    </div>
  );
}
