// app/(product)/dashboard/page.tsx
"use client";

import { useState } from "react";
import SideBar from "../components/Sidebar/sidebar";
import Profile from "../components/profile";
import Settings from "../components/settings";
import Friends from "../components/friends";
import Dashboard from "../components/dashboard";
import Community from "../components/Community/Community";

type TabKey = "profile" | "dashboard" | "settings" | "friends" | "community";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  return (
    <div className="flex">
      <SideBar activeTab={activeTab} onSelect={setActiveTab} />
      <main className="ml-16 flex-1">
        {activeTab === "dashboard" && <div className="p-6"><Dashboard /></div>}
        {activeTab === "profile" && <div className="p-6"><Profile /></div>}
        {activeTab === "settings" && <div className="p-6"><Settings /></div>}
        {activeTab === "friends" && <div className="p-6"><Friends /></div>}
        {activeTab === "community" && <Community />}
      </main>
    </div>
  );
}
